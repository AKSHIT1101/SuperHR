import io
import json
import logging
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user
from core.embeddings import embed_texts_batch
from core.llm import map_csv_columns

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/imports", tags=["Imports"])

CORE_FIELDS = {"first_name", "last_name", "email", "phone"}


# ------------------------------------------------------------------ #
#  Schemas                                                            #
# ------------------------------------------------------------------ #

class MappingApprovalRequest(BaseModel):
    job_id: int
    approved_mapping: dict        # {file_column: crm_field_name or null}
    reject: bool = False          # user can outright reject the import


# ------------------------------------------------------------------ #
#  Helpers                                                            #
# ------------------------------------------------------------------ #

def _read_file(file: UploadFile) -> pd.DataFrame:
    content = file.file.read()
    fname = file.filename.lower()
    if fname.endswith(".csv"):
        return pd.read_csv(io.BytesIO(content), dtype=str).fillna("")
    elif fname.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content), dtype=str).fillna("")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a CSV or Excel file.",
        )


def _get_preview(df: pd.DataFrame, n: int = 5, store_all_rows: bool = True) -> dict:
    preview: dict = {
        "columns": list(df.columns),
        "sample_rows": df.head(n).to_dict(orient="records"),
        "total_rows": len(df),
    }
    # We store all rows so approval can import everything (not only the preview sample).
    # For large files, this could be heavy; but it fixes the "only 5 rows imported" bug.
    if store_all_rows:
        preview["all_rows"] = df.to_dict(orient="records")
    return preview


# ------------------------------------------------------------------ #
#  Endpoints                                                          #
# ------------------------------------------------------------------ #

@router.post("/upload", summary="Upload CSV/Excel and get LLM column mapping suggestion")
async def upload_import(
    file: UploadFile = File(...),
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 1: Upload file → LLM suggests column→field mapping → returned to frontend for approval.
    A job record is created in pending_mapping state.
    """
    org_id = current_user["org_id"]

    df = _read_file(file)
    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    preview = _get_preview(df, store_all_rows=True)
    schema = db.get_attribute_defs(org_id)

    # LLM maps columns
    mapping_result = map_csv_columns(
        columns=preview["columns"],
        sample_rows=preview["sample_rows"],
        schema=schema,
    )

    # Hard stop if LLM says the file is not a valid contacts file
    if not mapping_result.get("is_valid_import", True):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Invalid import file",
                "warnings": mapping_result.get("warnings", []),
                "message": "This file does not appear to contain contact data. Please upload a valid contacts CSV or Excel file.",
            },
        )

    # Create the import job
    job = db.create_import_job(
        org_id=org_id,
        created_by=current_user["user_id"],
        file_name=file.filename,
        raw_preview=preview,
        total_rows=preview["total_rows"],
    )
    db.update_import_job(
        job["job_id"],
        org_id,
        status="awaiting_approval",
        column_mapping=mapping_result.get("mapping", {}),
        unmapped_columns=mapping_result.get("unmapped", []),
    )

    return {
        "job_id": job["job_id"],
        "file_name": file.filename,
        "total_rows": preview["total_rows"],
        "columns": preview["columns"],
        "sample_rows": preview["sample_rows"],
        "suggested_mapping": mapping_result.get("mapping", {}),
        "unmapped_columns": mapping_result.get("unmapped", []),
        "confidence": mapping_result.get("confidence", {}),
        "warnings": mapping_result.get("warnings", []),
        "status": "awaiting_approval",
        "message": "Please review and approve or modify the column mapping, then call /imports/approve.",
    }


@router.post("/approve", summary="User approves (or rejects) the column mapping and triggers import")
async def approve_import(
    body: MappingApprovalRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 2: User approves the mapping (can modify it), then the backend processes all rows.
    """
    org_id = current_user["org_id"]
    job = db.get_import_job(body.job_id, org_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    if job["status"] not in ("awaiting_approval", "pending_mapping"):
        raise HTTPException(status_code=400, detail=f"Job is in status '{job['status']}' and cannot be approved again.")

    if body.reject:
        db.update_import_job(body.job_id, org_id, status="rejected")
        return {"message": "Import rejected.", "job_id": body.job_id}

    # Validate the approved mapping has at least first_name or last_name AND email
    mapped_fields = {v for v in body.approved_mapping.values() if v}
    has_name = bool({"first_name", "last_name"} & mapped_fields or "full_name" in mapped_fields)
    has_email = "email" in mapped_fields
    if not has_name:
        raise HTTPException(
            status_code=422,
            detail="Mapping must include at least first_name or last_name.",
        )

    db.update_import_job(
        body.job_id, org_id,
        status="processing",
        column_mapping=body.approved_mapping,
    )

    # Re-read the raw file data from preview (stored in DB).
    raw_preview = job.get("raw_preview") or {}
    if isinstance(raw_preview, str):
        raw_preview = json.loads(raw_preview)

    # Import the full file rows (not only the sample preview).
    # The upload step stores all_rows when creating the import job.
    all_rows = raw_preview.get("all_rows") or raw_preview.get("sample_rows", [])

    approved_mapping = body.approved_mapping
    schema = db.get_attribute_defs(org_id)
    attr_def_map = {a["field_name"]: a for a in schema}

    imported = 0
    errors = []
    embed_fields: List[str] = [
        a["field_name"] for a in schema if a["needs_embedding"] and a["field_type"] == "text"
    ]

    for i, row in enumerate(all_rows):
        try:
            mapped_row = {}
            for file_col, crm_field in approved_mapping.items():
                if crm_field and file_col in row:
                    mapped_row[crm_field] = row[file_col]

            # Handle full_name split
            if "full_name" in mapped_row and "first_name" not in mapped_row:
                parts = mapped_row.pop("full_name", "").split(" ", 1)
                mapped_row["first_name"] = parts[0]
                mapped_row["last_name"] = parts[1] if len(parts) > 1 else ""

            first_name = mapped_row.get("first_name", "").strip()
            last_name = mapped_row.get("last_name", "").strip()
            if not first_name and not last_name:
                errors.append({"row": i + 1, "error": "Missing name fields"})
                continue

            contact = db.create_contact(
                org_id=org_id,
                first_name=first_name or "Unknown",
                last_name=last_name,
                email=mapped_row.get("email") or None,
                phone=mapped_row.get("phone") or None,
                created_by=current_user["user_id"],
            )
            contact_id = contact["contact_id"]

            # Save custom attributes
            custom_attrs = {
                k: v for k, v in mapped_row.items()
                if k not in CORE_FIELDS and k in attr_def_map and v
            }
            for field_name, value in custom_attrs.items():
                attr_def = attr_def_map[field_name]
                db.upsert_attribute_value(
                    contact_id=contact_id,
                    attr_def_id=attr_def["attr_def_id"],
                    org_id=org_id,
                    field_type=attr_def["field_type"],
                    value=value,
                )

            # Batch embed fields that need it
            for field_name in embed_fields:
                val = custom_attrs.get(field_name)
                if val and isinstance(val, str):
                    from core.embeddings import embed_text
                    vector = embed_text(val)
                    db.upsert_contact_embedding(contact_id, org_id, field_name, vector)

            imported += 1

        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    db.update_import_job(
        body.job_id,
        org_id,
        status="completed",
        imported_rows=imported,
        error_rows=len(errors),
        error_details=errors[:50],  # cap stored errors
    )

    return {
        "job_id": body.job_id,
        "status": "completed",
        "total_rows": len(all_rows),
        "imported_rows": imported,
        "error_rows": len(errors),
        "errors": errors[:20],  # return first 20 errors to client
    }


@router.get("/", summary="List import jobs for the org")
def list_import_jobs(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_import_jobs_by_org(current_user["org_id"])


@router.get("/{job_id}", summary="Get a specific import job status")
def get_import_job(
    job_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    job = db.get_import_job(job_id, current_user["org_id"])
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job
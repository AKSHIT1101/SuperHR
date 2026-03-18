"""
routes/schema.py

POST /schema/build           — NL prompt → LLM suggests fields → returned for review
POST /schema/fields/bulk     — save LLM-approved batch of fields
POST /schema/fields          — manually add a single custom field
GET  /schema/fields          — list all custom fields for the org
DELETE /schema/fields/{id}   — remove a custom field
POST /schema/edit            — edit schema via natural language (add/remove/update)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import DatabaseManager
from core.dependencies import get_current_user, get_db, require_admin
from core.llm import build_contact_schema, parse_schema_edit

router = APIRouter(prefix="/schema", tags=["Schema"])


# ------------------------------------------------------------------ #
#  Pydantic models                                                     #
# ------------------------------------------------------------------ #

class BuildSchemaRequest(BaseModel):
    prompt: str


class SchemaEditRequest(BaseModel):
    prompt: str


class FieldDefinition(BaseModel):
    field_name:      str
    display_name:    str
    field_type:      str    # text | number | date | boolean
    needs_embedding: bool = False
    is_required:     bool = False


class BulkFieldRequest(BaseModel):
    fields: List[FieldDefinition]


# ------------------------------------------------------------------ #
#  Endpoints                                                           #
# ------------------------------------------------------------------ #

@router.post("/build", summary="NL prompt → LLM suggests contact schema fields")
async def build_schema(
    body:  BuildSchemaRequest,
    db:    DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    """
    Admin describes their org in natural language.
    LLM returns a suggested list of custom field definitions.
    Nothing is saved yet — review and call POST /schema/fields/bulk to persist.
    """
    fields = build_contact_schema(body.prompt)

    if not isinstance(fields, list):
        raise HTTPException(status_code=500, detail="LLM returned an unexpected format")

    return {
        "suggested_fields": fields,
        "message": "Review these fields, then POST the approved list to /schema/fields/bulk.",
    }


@router.post("/edit", summary="Edit contact schema via natural language")
def edit_schema(
    body:  SchemaEditRequest,
    db:    DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    """
    LLM interprets the edit request (add / remove / update fields) against the
    current schema and applies the changes immediately.
    """
    org_id         = admin["org_id"]
    current_schema = db.get_attribute_defs(org_id)
    edit           = parse_schema_edit(body.prompt, current_schema)

    action  = edit.get("action")
    results = []

    if action == "add":
        for f in edit.get("fields", []):
            attr = db.create_attribute_def(
                org_id=org_id,
                field_name=f["field_name"],
                display_name=f["display_name"],
                field_type=f.get("field_type", "text"),
                needs_embedding=f.get("needs_embedding", False),
                is_required=f.get("is_required", False),
            )
            results.append(attr)

    elif action == "remove":
        for f in edit.get("fields", []):
            existing = db.get_attribute_def_by_name(org_id, f["field_name"])
            if existing:
                db.execute_query(
                    "DELETE FROM contact_attribute_defs WHERE attr_def_id = %s AND org_id = %s",
                    (existing["attr_def_id"], org_id),
                    fetch="none",
                )
                results.append({"removed": f["field_name"]})

    elif action == "update":
        for f in edit.get("fields", []):
            attr = db.create_attribute_def(
                org_id=org_id,
                field_name=f["field_name"],
                display_name=f["display_name"],
                field_type=f.get("field_type", "text"),
                needs_embedding=f.get("needs_embedding", False),
                is_required=f.get("is_required", False),
            )
            results.append(attr)

    return {
        "action":   action,
        "changes":  results,
        "warnings": edit.get("warnings", []),
    }


@router.post("/fields/bulk", status_code=201, summary="Save a batch of approved field definitions")
def save_fields_bulk(
    body:  BulkFieldRequest,
    db:    DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    org_id  = admin["org_id"]
    created = []
    skipped = []

    for f in body.fields:
        if f.field_type not in ("text", "number", "date", "boolean"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid field_type '{f.field_type}' for field '{f.field_name}'.",
            )
        existing = db.get_attribute_def_by_name(org_id, f.field_name)
        if existing:
            skipped.append(f.field_name)
            continue
        row = db.create_attribute_def(
            org_id=org_id,
            field_name=f.field_name,
            display_name=f.display_name,
            field_type=f.field_type,
            needs_embedding=f.needs_embedding,
            is_required=f.is_required,
        )
        created.append(row)

    return {"created": created, "skipped_duplicates": skipped}


class CompleteSetupRequest(BaseModel):
    prompt: Optional[str] = None


@router.post("/complete-setup", summary="Mark the org's schema setup as completed")
def complete_setup(
    body: CompleteSetupRequest,
    db:   DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    org_id = admin["org_id"]
    db.mark_org_setup(org_id=org_id, completed=True, prompt=body.prompt)
    return {"setup_completed": True}


@router.post("/fields", status_code=201, summary="Manually add a single custom field")
def add_field(
    body:  FieldDefinition,
    db:    DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    org_id = admin["org_id"]

    if body.field_type not in ("text", "number", "date", "boolean"):
        raise HTTPException(status_code=400, detail=f"Invalid field_type '{body.field_type}'.")

    existing = db.get_attribute_def_by_name(org_id, body.field_name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Field '{body.field_name}' already exists.")

    row = db.create_attribute_def(
        org_id=org_id,
        field_name=body.field_name,
        display_name=body.display_name,
        field_type=body.field_type,
        needs_embedding=body.needs_embedding,
        is_required=body.is_required,
    )
    return row


@router.get("/fields", summary="List all custom fields for this org")
def list_fields(
    db:          DatabaseManager = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return db.get_attribute_defs(current_user["org_id"])


@router.delete("/fields/{attr_def_id}", status_code=204, summary="Delete a custom field")
def delete_field(
    attr_def_id: int,
    db:          DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    existing = db.execute_query(
        "SELECT attr_def_id FROM contact_attribute_defs WHERE attr_def_id = %s AND org_id = %s",
        (attr_def_id, admin["org_id"]),
        fetch="one",
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Field not found")

    db.execute_query(
        "DELETE FROM contact_attribute_defs WHERE attr_def_id = %s",
        (attr_def_id,),
        fetch="none",
    )
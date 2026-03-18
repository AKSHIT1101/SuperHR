from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user
from core.llm import build_contact_query_plan, validate_prompt_context
from core.query_engine import execute_query_plan

router = APIRouter(prefix="/segments", tags=["Segments"])


# ------------------------------------------------------------------ #
#  Schemas                                                            #
# ------------------------------------------------------------------ #

class SegmentPromptRequest(BaseModel):
    prompt: str


class SegmentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: Optional[str] = None
    query_plan: Optional[dict] = None
    contact_ids: List[int]  # user-approved final list


# ------------------------------------------------------------------ #
#  Endpoints                                                          #
# ------------------------------------------------------------------ #

@router.post("/preview", summary="AI generates a contact pre-selection from a prompt")
def preview_segment(
    body: SegmentPromptRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 1 of the segment creation flow.
    - Validates the prompt belongs to the segments context.
    - Generates a query plan via LLM.
    - Executes the plan and returns pre-selected contacts for user approval.
    """
    org_id = current_user["org_id"]

    # Context validation
    validation = validate_prompt_context(body.prompt, "segments")
    if not validation.get("is_valid"):
        return {
            "valid": False,
            "error": validation.get("error_message"),
            "correct_context": validation.get("correct_context"),
        }

    # Build query plan
    schema = db.get_attribute_defs(org_id)
    query_plan = build_contact_query_plan(body.prompt, schema)

    # Execute plan
    contacts = execute_query_plan(db, org_id, query_plan)

    return {
        "valid": True,
        "prompt": body.prompt,
        "query_plan": query_plan,
        "preselected_count": len(contacts),
        "contacts": contacts,
        "warnings": query_plan.get("warnings", []),
    }


@router.post("/", summary="Create a segment from an approved contact list")
def create_segment(
    body: SegmentCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 2 of the segment creation flow.
    User has reviewed and optionally modified the pre-selected contact list.
    Saves the segment with the final approved contact_ids.
    """
    org_id = current_user["org_id"]
    segment = db.create_segment(
        org_id=org_id,
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        query_plan=body.query_plan,
        created_by=current_user["user_id"],
        contact_ids=body.contact_ids,
    )
    return {
        "segment": segment,
        "contact_count": len(body.contact_ids),
    }


@router.get("/", summary="List all segments for the org")
def list_segments(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_segments_by_org(current_user["org_id"])


@router.get("/{segment_id}", summary="Get a segment and its contacts")
def get_segment(
    segment_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    segment = db.get_segment(segment_id, current_user["org_id"])
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    contacts = db.get_segment_contacts(segment_id, current_user["org_id"])
    return {"segment": segment, "contacts": contacts}


@router.delete("/{segment_id}", summary="Delete a segment")
def delete_segment(
    segment_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = db.delete_segment(segment_id, current_user["org_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Segment deleted"}
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user
from core.llm import build_contact_query_plan, validate_prompt_context
from core.query_engine import execute_query_plan

router = APIRouter(prefix="/events", tags=["Events"])


# ------------------------------------------------------------------ #
#  Schemas                                                            #
# ------------------------------------------------------------------ #

class EventPromptRequest(BaseModel):
    prompt: str


class EventCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    prompt: Optional[str] = None
    query_plan: Optional[dict] = None
    contact_ids: List[int]


class RSVPUpdateRequest(BaseModel):
    contact_id: int
    rsvp_status: str  # invited | attending | declined | maybe


# ------------------------------------------------------------------ #
#  Endpoints                                                          #
# ------------------------------------------------------------------ #

@router.post("/preview", summary="AI pre-selects contacts to invite to an event")
def preview_event(
    body: EventPromptRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 1 of event creation flow.
    E.g. prompt: "Invite all contacts from Bangalore to the product launch"
    """
    org_id = current_user["org_id"]

    validation = validate_prompt_context(body.prompt, "events")
    if not validation.get("is_valid"):
        return {
            "valid": False,
            "error": validation.get("error_message"),
            "correct_context": validation.get("correct_context"),
        }

    schema = db.get_attribute_defs(org_id)
    query_plan = build_contact_query_plan(body.prompt, schema)
    contacts = execute_query_plan(db, org_id, query_plan)

    return {
        "valid": True,
        "prompt": body.prompt,
        "query_plan": query_plan,
        "preselected_count": len(contacts),
        "contacts": contacts,
        "warnings": query_plan.get("warnings", []),
    }


@router.post("/", summary="Create an event with approved invite list")
def create_event(
    body: EventCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user["org_id"]
    event = db.create_event(
        org_id=org_id,
        name=body.name,
        description=body.description,
        location=body.location,
        event_date=body.event_date,
        prompt=body.prompt,
        query_plan=body.query_plan,
        created_by=current_user["user_id"],
        contact_ids=body.contact_ids,
    )
    return {"event": event, "invited_count": len(body.contact_ids)}


@router.get("/", summary="List all events")
def list_events(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_events_by_org(current_user["org_id"])


@router.get("/{event_id}", summary="Get an event with its invite list")
def get_event(
    event_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    event = db.get_event(event_id, current_user["org_id"])
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    contacts = db.get_event_contacts(event_id, current_user["org_id"])
    return {"event": event, "contacts": contacts}


@router.patch("/{event_id}/rsvp", summary="Update a contact's RSVP status for an event")
def update_rsvp(
    event_id: int,
    body: RSVPUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    valid_rsvp = ("invited", "attending", "declined", "maybe")
    if body.rsvp_status not in valid_rsvp:
        raise HTTPException(status_code=400, detail=f"rsvp_status must be one of {valid_rsvp}")
    db.update_event_rsvp(event_id, body.contact_id, body.rsvp_status)
    return {"message": "RSVP updated"}


@router.delete("/{event_id}", summary="Delete an event")
def delete_event(
    event_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = db.delete_event(event_id, current_user["org_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}
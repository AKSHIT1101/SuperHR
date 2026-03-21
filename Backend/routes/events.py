from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user
from core.llm import build_contact_query_plan, validate_prompt_context, compose_event_draft
from core.query_engine import execute_query_plan
from core.embeddings import embed_text

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


class InviteSentUpdateRequest(BaseModel):
    contact_id: int
    channel: str  # email | whatsapp
    sent: bool = True


class EventUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    status: Optional[str] = None  # draft | scheduled | completed | cancelled
    contact_ids: Optional[List[int]] = None


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
    try:
        draft = compose_event_draft(body.prompt)
        query_plan = build_contact_query_plan(body.prompt, schema)
        contacts = execute_query_plan(db, org_id, query_plan)
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "correct_context": validation.get("correct_context"),
        }

    # Prefer segment-based preselection when the prompt references a segment name (e.g. "students").
    query_vec = embed_text(body.prompt)
    segment_matches = db.semantic_search_segments(org_id=org_id, query_embedding=query_vec, top_k=5, similarity_threshold=0.45)
    segment_ids = [m["segment_id"] for m in segment_matches][:3]  # keep UI readable

    segment_contacts = db.get_contacts_in_segments(org_id=org_id, segment_ids=segment_ids)
    segment_member_ids = {c["contact_id"] for c in segment_contacts}

    # Only return individuals that aren't already covered by selected segments.
    individual_contacts = [c for c in contacts if c.get("contact_id") not in segment_member_ids]

    return {
        "valid": True,
        "prompt": body.prompt,
        "draft": draft,
        "query_plan": query_plan,
        "preselected_count": len(segment_contacts) + len(individual_contacts),
        "contacts": individual_contacts,
        "segment_ids": segment_ids,
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

    # Create/update the vector for semantic event-name resolution.
    text = f"{event.get('name') or ''}\n{event.get('description') or ''}\n{event.get('location') or ''}\n{event.get('prompt') or ''}".strip()
    vec = embed_text(text)
    db.upsert_event_embedding(org_id=org_id, event_id=event["event_id"], embedding=vec)
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
    db.update_event_rsvp(event_id, current_user["org_id"], body.contact_id, body.rsvp_status)
    return {"message": "RSVP updated"}


@router.patch("/{event_id}/invite-sent", summary="Mark an invite notification as sent")
def update_invite_sent(
    event_id: int,
    body: InviteSentUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    channel = body.channel
    if channel not in ("email", "whatsapp"):
        raise HTTPException(status_code=400, detail="channel must be 'email' or 'whatsapp'")

    db.update_event_invite_sent(
        event_id=event_id,
        org_id=current_user["org_id"],
        contact_id=body.contact_id,
        channel=channel,
        sent=body.sent,
    )
    return {"message": "Invite notification updated"}


@router.patch("/{event_id}", summary="Update an event (details/invitees)")
def update_event(
    event_id: int,
    body: EventUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    valid_status = ("draft", "scheduled", "completed", "cancelled")
    if body.status is not None and body.status not in valid_status:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid_status}")

    updated = db.update_event(
        event_id=event_id,
        org_id=current_user["org_id"],
        name=body.name,
        description=body.description,
        location=body.location,
        event_date=body.event_date,
        status=body.status,
        contact_ids=body.contact_ids,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")

    text = f"{updated.get('name') or ''}\n{updated.get('description') or ''}\n{updated.get('location') or ''}\n{updated.get('prompt') or ''}".strip()
    vec = embed_text(text)
    db.upsert_event_embedding(org_id=current_user["org_id"], event_id=updated["event_id"], embedding=vec)
    return updated


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
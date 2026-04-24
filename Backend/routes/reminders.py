from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from core.database import DatabaseManager, _UNSET
from core.dependencies import get_db, get_current_user
from core.llm import compose_reminder_draft, validate_prompt_context

router = APIRouter(prefix="/reminders", tags=["Reminders"])


# ------------------------------------------------------------------ #
#  Schemas                                                            #
# ------------------------------------------------------------------ #

class ReminderCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    assigned_to: Optional[int] = None  # user_id of another team member


class ReminderUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    is_done: Optional[bool] = None
    assigned_to: Optional[int] = None


class ReminderPromptRequest(BaseModel):
    prompt: str


# ------------------------------------------------------------------ #
#  Endpoints                                                          #
# ------------------------------------------------------------------ #

@router.post("/", summary="Create a reminder (self or assign to team member)")
def create_reminder(
    body: ReminderCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Validate assigned_to belongs to same org
    if body.assigned_to:
        target = db.get_user_by_id(body.assigned_to)
        if not target or target["org_id"] != current_user["org_id"]:
            raise HTTPException(status_code=400, detail="Assigned user not found in your org")

    reminder = db.create_reminder(
        org_id=current_user["org_id"],
        created_by=current_user["user_id"],
        title=body.title,
        description=body.description,
        due_at=body.due_at,
        assigned_to=body.assigned_to,
    )
    return reminder


@router.post("/preview", summary="Generate a reminder draft from AI prompt")
def preview_reminder(
    body: ReminderPromptRequest,
    current_user: dict = Depends(get_current_user),
):
    validation = validate_prompt_context(body.prompt, "reminders")
    if not validation.get("is_valid"):
        return {
            "valid": False,
            "error": validation.get("error_message"),
            "correct_context": validation.get("correct_context"),
        }

    draft = compose_reminder_draft(body.prompt)
    return {
        "valid": True,
        "prompt": body.prompt,
        "draft": draft,
        "generated_for_user_id": current_user["user_id"],
    }


@router.get("/", summary="Get reminders for the current user")
def list_reminders(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_reminders(current_user["org_id"], current_user["user_id"])


@router.patch("/{reminder_id}", summary="Update a reminder")
def update_reminder(
    reminder_id: int,
    body: ReminderUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    updates = body.model_dump(exclude_unset=True)

    if "assigned_to" in updates and updates["assigned_to"] is not None:
        target = db.get_user_by_id(updates["assigned_to"])
        if not target or target["org_id"] != current_user["org_id"]:
            raise HTTPException(status_code=400, detail="Assigned user not found in your org")

    updated = db.update_reminder(
        reminder_id=reminder_id,
        org_id=current_user["org_id"],
        user_id=current_user["user_id"],
        title=updates["title"] if "title" in updates else _UNSET,
        description=updates["description"] if "description" in updates else _UNSET,
        due_at=updates["due_at"] if "due_at" in updates else _UNSET,
        is_done=updates["is_done"] if "is_done" in updates else _UNSET,
        assigned_to=updates["assigned_to"] if "assigned_to" in updates else _UNSET,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Reminder not found or not authorized")
    return updated


@router.delete("/{reminder_id}", summary="Delete a reminder")
def delete_reminder(
    reminder_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = db.delete_reminder(reminder_id, current_user["org_id"], current_user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Reminder not found or not authorized")
    return {"message": "Reminder deleted"}
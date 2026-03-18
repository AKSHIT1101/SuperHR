from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user

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
    updated = db.update_reminder(
        reminder_id=reminder_id,
        org_id=current_user["org_id"],
        user_id=current_user["user_id"],
        title=body.title,
        description=body.description,
        due_at=body.due_at,
        is_done=body.is_done,
        assigned_to=body.assigned_to,
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
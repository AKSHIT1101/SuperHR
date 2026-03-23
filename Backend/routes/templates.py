from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user

router = APIRouter(prefix="/templates", tags=["Templates"])


class TemplateCreateRequest(BaseModel):
    type: str  # email | whatsapp
    name: str
    subject: Optional[str] = None
    content: str


class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None


@router.get("", summary="List message templates")
def list_templates(
    type: Optional[str] = Query(default=None, description="email | whatsapp"),
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if type is not None and type not in ("email", "whatsapp"):
        raise HTTPException(status_code=400, detail="type must be 'email' or 'whatsapp'")
    return db.get_templates(current_user["org_id"], type=type)


@router.post("", summary="Create a message template")
def create_template(
    body: TemplateCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if body.type not in ("email", "whatsapp"):
        raise HTTPException(status_code=400, detail="type must be 'email' or 'whatsapp'")
    if body.type != "email" and body.subject:
        raise HTTPException(status_code=400, detail="subject is only allowed for email templates")
    return db.create_template(
        org_id=current_user["org_id"],
        created_by=current_user["user_id"],
        type=body.type,
        name=body.name,
        subject=body.subject,
        content=body.content,
    )


@router.patch("/{template_id}", summary="Update a message template")
def update_template(
    template_id: int,
    body: TemplateUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    updated = db.update_template(
        template_id=template_id,
        org_id=current_user["org_id"],
        name=body.name,
        subject=body.subject,
        content=body.content,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated


@router.delete("/{template_id}", summary="Delete a message template")
def delete_template(
    template_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = db.delete_template(template_id, current_user["org_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


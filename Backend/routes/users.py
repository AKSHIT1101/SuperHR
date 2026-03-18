"""
routes/users.py

GET   /users                        — list all users in the org (admin only)
GET   /users/{user_id}              — get a single user profile
PATCH /users/{user_id}/role         — change a user's role (admin only)
PATCH /users/{user_id}/deactivate   — deactivate a user (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import DatabaseManager
from core.dependencies import get_current_user, get_db, require_admin

router = APIRouter(prefix="/users", tags=["Users"])


class RoleUpdateRequest(BaseModel):
    role: str   # "manager" | "user"


@router.get("", summary="List all users in the org (admin only)")
def list_users(
    db:    DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    return db.get_users_by_org(admin["org_id"])


@router.get("/{user_id}", summary="Get a single user profile")
def get_user(
    user_id:     int,
    db:          DatabaseManager = Depends(get_db),
    current_user = Depends(get_current_user),
):
    user = db.get_user_by_id(user_id)
    if not user or user["org_id"] != current_user["org_id"]:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop("hashed_password", None)
    return user


@router.patch("/{user_id}/role", summary="Change a user's role (admin only)")
def update_role(
    user_id: int,
    body:    RoleUpdateRequest,
    db:      DatabaseManager = Depends(get_db),
    admin  = Depends(require_admin),
):
    if body.role not in ("manager", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'user'")

    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    updated = db.update_user_role(user_id, admin["org_id"], body.role)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found in your org")

    return {"message": f"Role updated to '{body.role}'"}


@router.patch("/{user_id}/deactivate", summary="Deactivate a user (admin only)")
def deactivate_user(
    user_id: int,
    db:      DatabaseManager = Depends(get_db),
    admin  = Depends(require_admin),
):
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    target = db.get_user_by_id(user_id)
    if not target or target["org_id"] != admin["org_id"]:
        raise HTTPException(status_code=404, detail="User not found in your org")

    db.execute_query(
        "UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE user_id = %s",
        (user_id,),
        fetch="none",
    )
    return {"message": "User deactivated"}
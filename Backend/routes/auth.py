"""
routes/auth.py  —  Google OAuth 2.0 + JWT

Flow:
  1. Frontend calls GET /auth/google/login  → redirected to Google consent screen
  2. Google redirects back to GET /auth/google/callback?code=...
  3. Backend exchanges code, fetches Google profile, then:

     Case A — Returning user (email already in DB)       → issue JWT
     Case B — New user with a valid pending invite        → create account + issue JWT
     Case C — No users exist yet (bootstrap first admin)  → create org + admin + issue JWT
     Case D — New user, no invite                         → 403

Invite flow:
  POST /auth/invite   — admin creates a pending invite row (email + role + token)
  GET  /auth/me       — returns current user from JWT
"""

import secrets
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

from core.config import settings
from core.database import DatabaseManager
from core.dependencies import create_access_token, get_current_user, get_db, require_admin

router = APIRouter(prefix="/auth", tags=["Auth"])


# ------------------------------------------------------------------ #
#  Pydantic models                                                     #
# ------------------------------------------------------------------ #

class InviteRequest(BaseModel):
    email:    EmailStr
    role:     str = "user"   # "manager" | "user"


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    org_id:       int
    role:         str
    first_name:   Optional[str] = None
    last_name:    Optional[str] = None
    email:        str


# ------------------------------------------------------------------ #
#  Internal helpers                                                    #
# ------------------------------------------------------------------ #

async def _exchange_code(code: str) -> dict:
    """Exchange Google authorisation code for tokens."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            settings.GOOGLE_TOKEN_URL,
            data={
                "code":          code,
                "client_id":     settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google auth code")
        return resp.json()


async def _fetch_google_profile(access_token: str) -> dict:
    """Fetch authenticated user profile from Google."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            settings.GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")
        return resp.json()


def _make_token_response(user: dict) -> TokenResponse:
    token = create_access_token({"user_id": user["user_id"], "org_id": user["org_id"]})
    return TokenResponse(
        access_token=token,
        user_id=user["user_id"],
        org_id=user["org_id"],
        role=user["role"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        email=user["email"],
    )


# ------------------------------------------------------------------ #
#  OAuth endpoints                                                     #
# ------------------------------------------------------------------ #

@router.get("/google/login", summary="Redirect to Google OAuth consent screen")
def google_login():
    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    return RedirectResponse(url=f"{settings.GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback", summary="Google OAuth callback — issues JWT")
async def google_callback(
    code: str = Query(...),
    db:   DatabaseManager = Depends(get_db),
):
    # Step 1 — exchange code for access token
    tokens       = await _exchange_code(code)
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned by Google")

    # Step 2 — fetch Google profile
    profile    = await _fetch_google_profile(access_token)
    email      = profile.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address")

    first_name = profile.get("given_name", "")
    last_name  = profile.get("family_name", "")
    google_sub = profile.get("sub")

    # Case A — returning user
    existing = db.get_user_by_email(email)
    if existing:
        if not existing["is_active"]:
            raise HTTPException(status_code=403, detail="Account is deactivated")
        token_resp = _make_token_response(existing)
        redirect_url = f"{settings.FRONTEND_BASE_URL}/auth/callback?token={token_resp.access_token}"
        return RedirectResponse(url=redirect_url)

    # Check for a valid pending invite
    invite = db.execute_query(
        """
        SELECT * FROM invitations
        WHERE email = %s AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
        """,
        (email,),
        fetch="one",
    )

    # Case B — new user with a valid invite
    if invite:
        user = db.execute_query(
            """
            INSERT INTO users
                (org_id, email, first_name, last_name, role, google_sub, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
            RETURNING *
            """,
            (invite["org_id"], email, first_name, last_name, invite["role"], google_sub),
            fetch="one",
        )
        db.execute_query(
            "UPDATE invitations SET used = TRUE, updated_at = NOW() WHERE invitation_id = %s",
            (invite["invitation_id"],),
            fetch="none",
        )
        token_resp = _make_token_response(user)
        redirect_url = f"{settings.FRONTEND_BASE_URL}/auth/callback?token={token_resp.access_token}"
        return RedirectResponse(url=redirect_url)

    # Case C — no users exist yet: bootstrap first admin
    any_user = db.execute_query("SELECT 1 FROM users LIMIT 1", fetch="one")
    if not any_user:
        org = db.create_organization(f"{first_name or email}'s Organisation")
        user = db.execute_query(
            """
            INSERT INTO users
                (org_id, email, first_name, last_name, role, google_sub, is_active)
            VALUES (%s, %s, %s, %s, 'admin', %s, TRUE)
            RETURNING *
            """,
            (org["org_id"], email, first_name, last_name, google_sub),
            fetch="one",
        )
        token_resp = _make_token_response(user)
        redirect_url = f"{settings.FRONTEND_BASE_URL}/auth/callback?token={token_resp.access_token}"
        return RedirectResponse(url=redirect_url)

    # Case D — uninvited new user
    raise HTTPException(
        status_code=403,
        detail="No invitation found for this email. Ask your admin to invite you.",
    )


# ------------------------------------------------------------------ #
#  Invite management                                                   #
# ------------------------------------------------------------------ #

@router.post("/invite", status_code=201, summary="Admin invites a user by email")
def invite_user(
    body:  InviteRequest,
    db:    DatabaseManager = Depends(get_db),
    admin = Depends(require_admin),
):
    """
    Creates a pending invitation row. The invitee signs in via Google — if their
    Google email matches a pending invite, they are automatically added to the org.
    Share the invite_token out-of-band (email, Slack, etc.).
    """
    if body.role not in ("manager", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'user'")

    existing = db.get_user_by_email(str(body.email))
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    token = secrets.token_urlsafe(32)

    invite = db.execute_query(
        """
        INSERT INTO invitations (org_id, invited_by, email, role, token)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (org_id, email) DO UPDATE
            SET token      = EXCLUDED.token,
                role       = EXCLUDED.role,
                used       = FALSE,
                expires_at = NOW() + INTERVAL '7 days',
                updated_at = NOW()
        RETURNING invitation_id, email, role, token, expires_at
        """,
        (admin["org_id"], admin["user_id"], str(body.email), body.role, token),
        fetch="one",
    )

    return {
        "message":      f"Invitation created for {body.email}",
        "invite_token": invite["token"],   # deliver via email in production
        "role":         invite["role"],
        "expires_at":   invite["expires_at"],
    }


# ------------------------------------------------------------------ #
#  Current user                                                        #
# ------------------------------------------------------------------ #

@router.get("/me", summary="Get the current authenticated user")
def me(current_user = Depends(get_current_user)):
    return current_user


@router.get("/setup-status", summary="Get whether the org has completed initial contact schema setup")
def setup_status(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org = db.get_organization(current_user["org_id"])
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {
        "setup_completed": bool(org.get("setup_completed")),
        "setup_prompt": org.get("setup_prompt"),
    }
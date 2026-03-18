from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user
from core.llm import build_contact_query_plan, validate_prompt_context
from core.query_engine import execute_query_plan

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


# ------------------------------------------------------------------ #
#  Schemas                                                            #
# ------------------------------------------------------------------ #

class CampaignPromptRequest(BaseModel):
    prompt: str


class CampaignCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: Optional[str] = None
    query_plan: Optional[dict] = None
    contact_ids: List[int]


class CampaignStatusUpdate(BaseModel):
    status: str  # draft | active | completed | cancelled


# ------------------------------------------------------------------ #
#  Endpoints                                                          #
# ------------------------------------------------------------------ #

@router.post("/preview", summary="AI pre-selects contacts for a campaign from a prompt")
def preview_campaign(
    body: CampaignPromptRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 1 of campaign creation flow.
    Validates context, builds a query plan, returns pre-selected contacts.
    """
    org_id = current_user["org_id"]

    validation = validate_prompt_context(body.prompt, "campaigns")
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


@router.post("/", summary="Create a campaign from approved contact list")
def create_campaign(
    body: CampaignCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user["org_id"]
    campaign = db.create_campaign(
        org_id=org_id,
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        query_plan=body.query_plan,
        created_by=current_user["user_id"],
        contact_ids=body.contact_ids,
    )
    return {"campaign": campaign, "contact_count": len(body.contact_ids)}


@router.get("/", summary="List all campaigns")
def list_campaigns(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_campaigns_by_org(current_user["org_id"])


@router.get("/{campaign_id}", summary="Get a campaign with its contacts")
def get_campaign(
    campaign_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    campaign = db.get_campaign(campaign_id, current_user["org_id"])
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    contacts = db.get_campaign_contacts(campaign_id, current_user["org_id"])
    return {"campaign": campaign, "contacts": contacts}


@router.patch("/{campaign_id}/status", summary="Update campaign status")
def update_campaign_status(
    campaign_id: int,
    body: CampaignStatusUpdate,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    valid_statuses = ("draft", "active", "completed", "cancelled")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    updated = db.update_campaign_status(campaign_id, current_user["org_id"], body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return updated


@router.delete("/{campaign_id}", summary="Delete a campaign")
def delete_campaign(
    campaign_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = db.delete_campaign(campaign_id, current_user["org_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}
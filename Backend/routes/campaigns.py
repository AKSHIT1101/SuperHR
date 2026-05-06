from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import re

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user
from core.llm import build_contact_query_plan, validate_prompt_context, compose_campaign_content
from core.query_engine import execute_query_plan
from core.embeddings import embed_text
from core.template_merge import (
    canonicalize_merge_key,
    validate_merge_placeholders,
    build_merge_context_row,
    merge_document,
    plain_text_email_to_html,
    format_merge_documentation,
)
from core.brevo_client import send_transactional_email
from core.config import get_settings

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
    channel: Optional[str] = None  # email | whatsapp (track-only)
    subject: Optional[str] = None
    content: Optional[str] = None
    sender_label: Optional[str] = None
    sender_address: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    sent_count: Optional[int] = None
    open_count: Optional[int] = None
    click_count: Optional[int] = None
    # When True and channel is email, send personalized messages via Brevo transactional API.
    send_via_brevo: bool = False
    # Static merge values for all recipients (e.g. {\"event_name\": \"Town hall\"}); keys become {{event_name}}
    merge_overrides: Optional[Dict[str, str]] = None


class CampaignValidateMergeRequest(BaseModel):
    subject: Optional[str] = None
    content: Optional[str] = None
    merge_overrides: Optional[Dict[str, str]] = None


class CampaignStatusUpdate(BaseModel):
    status: str  # draft | active | completed | cancelled


class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # draft | active | completed | cancelled
    contact_ids: Optional[List[int]] = None
    channel: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    sender_label: Optional[str] = None
    sender_address: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    sent_count: Optional[int] = None
    open_count: Optional[int] = None
    click_count: Optional[int] = None


class CampaignComposeRequest(BaseModel):
    prompt: str = ""
    channel: str  # email | whatsapp
    event_name: Optional[str] = None
    event_action: Optional[str] = None  # invite | cancel
    segment_names: Optional[List[str]] = None
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    event_when: Optional[str] = None  # human-readable datetime for the invite


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
    try:
        query_plan = build_contact_query_plan(body.prompt, schema)
        contacts = execute_query_plan(db, org_id, query_plan)
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "correct_context": validation.get("correct_context"),
        }

    # Prefer segment-based preselection when prompt references a segment name.
    query_vec = embed_text(body.prompt)
    segment_matches = db.semantic_search_segments(org_id=org_id, query_embedding=query_vec, top_k=8, similarity_threshold=0.45)
    segment_ids = [m["segment_id"] for m in segment_matches][:5]

    segment_contacts = db.get_contacts_in_segments(org_id=org_id, segment_ids=segment_ids)
    segment_member_ids = {c["contact_id"] for c in segment_contacts}
    individual_contacts = [c for c in contacts if c.get("contact_id") not in segment_member_ids]

    # Also resolve event references for content generation context.
    event_matches = db.semantic_search_events(org_id=org_id, query_embedding=query_vec, top_k=5, similarity_threshold=0.45)
    event_ids = [m["event_id"] for m in event_matches][:3]

    segment_names: List[str] = []
    for sid in segment_ids:
        seg = db.get_segment(int(sid), org_id)
        if seg and seg.get("name"):
            segment_names.append(seg["name"])

    event_names: List[str] = []
    for eid in event_ids:
        ev = db.get_event(int(eid), org_id)
        if ev and ev.get("name"):
            event_names.append(ev["name"])

    return {
        "valid": True,
        "prompt": body.prompt,
        "query_plan": query_plan,
        "preselected_count": len(segment_contacts) + len(individual_contacts),
        "contacts": individual_contacts,
        "segment_ids": segment_ids,
        "segment_names": segment_names,
        "event_ids": event_ids,
        "event_names": event_names,
        "warnings": query_plan.get("warnings", []),
    }


@router.post("/compose", summary="AI generates subject/body for email/WhatsApp")
def compose_campaign(
    body: CampaignComposeRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user["org_id"]

    if body.channel not in ("email", "whatsapp"):
        raise HTTPException(status_code=400, detail="channel must be 'email' or 'whatsapp'")

    extras: List[str] = []
    if body.event_name:
        extras.append("event_name")

    merge_doc = format_merge_documentation(db.get_attribute_defs(org_id), extras)

    result = compose_campaign_content(
        prompt=body.prompt or "",
        channel=body.channel,
        event_name=body.event_name,
        event_action=body.event_action,
        segment_names=body.segment_names or [],
        merge_fields_documentation=merge_doc,
        event_description=body.event_description,
        event_location=body.event_location,
        event_when=body.event_when,
    )
    result["merge_placeholder_hints"] = merge_doc
    return result


@router.post(
    "/validate-merge-template",
    summary="Validate email subject/body merge placeholders before send",
)
def validate_merge_campaign_template(
    body: CampaignValidateMergeRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user["org_id"]
    extra_tokens = list((body.merge_overrides or {}).keys())
    ok, detail = validate_merge_placeholders(
        body.subject,
        body.content,
        db.get_attribute_defs(org_id),
        extra_tokens,
    )
    detail["merge_placeholder_hints"] = format_merge_documentation(
        db.get_attribute_defs(org_id), extra_tokens
    )
    return {"valid": ok, **detail}


@router.post("/", summary="Create a campaign from approved contact list")
def create_campaign(
    body: CampaignCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user["org_id"]
    channel = (body.channel or "").lower()
    overrides = dict(body.merge_overrides or {})
    schema = db.get_attribute_defs(org_id)
    override_keys = list(overrides.keys())

    # Strict merge validation for any templated outbound copy (email subject+body or WhatsApp body).
    if body.content or (channel == "email" and body.subject):
        ok_m, merge_detail = validate_merge_placeholders(
            body.subject if channel == "email" else None,
            body.content or "",
            schema,
            override_keys,
        )
        if not ok_m:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Message merge placeholders failed validation.",
                    "merge_validation": merge_detail,
                },
            )

    if body.send_via_brevo:
        if channel != "email":
            raise HTTPException(
                status_code=400,
                detail="send_via_brevo is only supported for channel=email",
            )
        settings = get_settings()
        if not (settings.BREVO_API_KEY or "").strip():
            raise HTTPException(
                status_code=503,
                detail="Brevo is not configured (missing BREVO_API_KEY)",
            )
        requested_sender_email = (body.sender_address or "").strip()
        has_requested_sender = bool(requested_sender_email) and bool(
            EMAIL_RE.fullmatch(requested_sender_email)
        )
        if not has_requested_sender and not (settings.BREVO_SENDER_EMAIL or "").strip():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Brevo sender is not configured. Set BREVO_SENDER_EMAIL or pass sender_address "
                    "with a valid email (must be verified in your Brevo account)."
                ),
            )

    campaign = db.create_campaign(
        org_id=org_id,
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        query_plan=body.query_plan,
        channel=body.channel,
        subject=body.subject,
        content=body.content,
        sender_label=body.sender_label,
        sender_address=body.sender_address,
        scheduled_at=body.scheduled_at,
        sent_at=body.sent_at,
        sent_count=body.sent_count or 0,
        open_count=body.open_count or 0,
        click_count=body.click_count or 0,
        created_by=current_user["user_id"],
        contact_ids=body.contact_ids,
    )

    response: Dict = {"campaign": campaign, "contact_count": len(body.contact_ids)}

    if body.send_via_brevo:
        contacts = db.get_contacts_by_ids(body.contact_ids, org_id)
        emailable = [c for c in contacts if ((c.get("email") or "").strip())]

        send_errors: List[Dict] = []
        succeeded_contact_ids: List[int] = []
        sent = 0
        skipped: List[int] = []
        reply_to = (body.sender_address or "").strip() or None
        sender_display = (body.sender_label or "").strip()

        settings = get_settings()
        sender_email = (
            (body.sender_address or "").strip()
            if EMAIL_RE.fullmatch((body.sender_address or "").strip() or "")
            else (settings.BREVO_SENDER_EMAIL or "").strip()
        )

        kv_overrides = {
            canonicalize_merge_key(str(k)): str(v) if v is not None else ""
            for k, v in overrides.items()
        }

        if not contacts:
            raise HTTPException(status_code=400, detail="No contacts matched this campaign")
        if not emailable:
            raise HTTPException(
                status_code=400,
                detail="None of the selected contacts has an email address; cannot send via Brevo",
            )

        for c in emailable:
            cid = int(c["contact_id"])
            attrs = db.get_contact_attribute_values(cid, org_id)
            ctx = build_merge_context_row(c, attrs)
            ctx.update(kv_overrides)

            merged_subject = merge_document(body.subject or "", ctx)
            merged_body = merge_document(body.content or "", ctx)
            html = plain_text_email_to_html(merged_body)

            to_addr = (c.get("email") or "").strip()
            try:
                send_transactional_email(
                    to_email=to_addr,
                    to_name=ctx.get("name") or "",
                    subject=merged_subject,
                    html_content=html,
                    text_content=merged_body,
                    sender_email=sender_email,
                    sender_name=sender_display or settings.BREVO_SENDER_NAME,
                    reply_to_email=reply_to,
                )
                sent += 1
                succeeded_contact_ids.append(cid)
            except Exception as exc:
                send_errors.append({"contact_id": cid, "email": to_addr, "error": str(exc)})

        for c in contacts:
            if not ((c.get("email") or "").strip()):
                skipped.append(int(c["contact_id"]))

        ts = datetime.now(timezone.utc)
        updated = db.update_campaign(
            campaign_id=campaign["campaign_id"],
            org_id=org_id,
            status="completed" if sent else "draft",
            sent_count=sent,
            sent_at=ts if sent else None,
        )

        response.update(
            {
                "campaign": updated or campaign,
                "brevo": {
                    "sent": sent,
                    "succeeded_contact_ids": succeeded_contact_ids,
                    "skipped_no_email": skipped,
                    "errors": send_errors,
                    "all_failed": sent == 0 and len(send_errors) > 0,
                },
            }
        )

    return response


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


@router.patch("/{campaign_id}", summary="Update a campaign (details/recipients)")
def update_campaign(
    campaign_id: int,
    body: CampaignUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    valid_statuses = ("draft", "active", "completed", "cancelled")
    if body.status is not None and body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    updated = db.update_campaign(
        campaign_id=campaign_id,
        org_id=current_user["org_id"],
        name=body.name,
        description=body.description,
        status=body.status,
        channel=body.channel,
        subject=body.subject,
        content=body.content,
        sender_label=body.sender_label,
        sender_address=body.sender_address,
        scheduled_at=body.scheduled_at,
        sent_at=body.sent_at,
        sent_count=body.sent_count,
        open_count=body.open_count,
        click_count=body.click_count,
        contact_ids=body.contact_ids,
    )
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
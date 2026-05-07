from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Union

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user, require_admin
from core.llm import build_contact_schema, parse_schema_edit, validate_prompt_context
from core.embeddings import embed_text
from routes.schema import _apply_action_block

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# ------------------------------------------------------------------ #
#  Schemas                                                            #
# ------------------------------------------------------------------ #

class SchemaSetupRequest(BaseModel):
    prompt: str


class SchemaEditRequest(BaseModel):
    prompt: str


class ContactCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    attributes: Optional[dict] = {}


class ContactUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    attributes: Optional[dict] = {}


class PromptRequest(BaseModel):
    prompt: str
    context: str = "contacts"


class FilterCondition(BaseModel):
    field_name: str
    op: str = "eq"
    value: Any


class ContactSearchRequest(BaseModel):
    filters: List[FilterCondition] = []
    logic: str = "AND"


# ------------------------------------------------------------------ #
#  Helpers                                                            #
# ------------------------------------------------------------------ #

def _enrich_contact(contact: dict, db: DatabaseManager) -> dict:
    attrs    = db.get_contact_attribute_values(contact["contact_id"], contact["org_id"])
    enriched = dict(contact)
    enriched["attributes"] = {}
    for a in attrs:
        field_type = a["field_type"]
        value = (
            a["value_text"]    if field_type == "text"
            else a["value_number"]  if field_type == "number"
            else a["value_date"]    if field_type == "date"
            else a["value_boolean"]
        )
        enriched["attributes"][a["field_name"]] = value
    return enriched


def _save_attributes(
    contact_id: int,
    org_id: int,
    attributes: dict,
    db: DatabaseManager,
):
    for field_name, value in attributes.items():
        if value is None:
            continue
        attr_def = db.get_attribute_def_by_name(org_id, field_name)
        if not attr_def:
            continue
        db.upsert_attribute_value(
            contact_id=contact_id,
            attr_def_id=attr_def["attr_def_id"],
            org_id=org_id,
            field_type=attr_def["field_type"],
            value=value,
        )
        if attr_def["needs_embedding"] and attr_def["field_type"] == "text" and isinstance(value, str):
            vector = embed_text(value)
            db.upsert_contact_embedding(contact_id, org_id, field_name, vector)


# ------------------------------------------------------------------ #
#  Schema Endpoints                                                   #
# ------------------------------------------------------------------ #

@router.post("/schema/setup", summary="Admin sets up contact schema via natural language (first-time)")
def setup_schema(
    body: SchemaSetupRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    org_id = current_user["org_id"]
    fields = build_contact_schema(body.prompt)

    saved = []
    for f in fields:
        attr = db.create_attribute_def(
            org_id=org_id,
            field_name=f["field_name"],
            display_name=f["display_name"],
            field_type=f.get("field_type", "text"),
            needs_embedding=f.get("needs_embedding", False),
            is_required=f.get("is_required", False),
        )
        saved.append(attr)

    db.mark_org_setup(org_id=org_id, completed=True, prompt=body.prompt)

    return {
        "message": f"Contact schema created with {len(saved)} custom fields",
        "fields": saved,
    }


@router.get("/schema", summary="Get the current org's contact schema")
def get_schema(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_attribute_defs(current_user["org_id"])


@router.post("/schema/edit", summary="Edit contact schema via natural language")
def edit_schema(
    body: SchemaEditRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    org_id         = current_user["org_id"]
    current_schema = db.get_attribute_defs(org_id)
    edit           = parse_schema_edit(body.prompt, current_schema)

    all_results  = []
    actions_list = edit.get("actions") or []

    if not actions_list and edit.get("action"):
        actions_list = [{"action": edit["action"], "fields": edit.get("fields", [])}]

    for block in actions_list:
        action = block.get("action")
        fields = block.get("fields", [])
        if not action:
            continue
        block_results = _apply_action_block(action, fields, org_id, db)
        all_results.extend(block_results)

    return {
        "action":   edit.get("action"),
        "changes":  all_results,
        "warnings": edit.get("warnings", []),
        "actions":  actions_list,
    }


@router.get("/filters", summary="Get available contact filters (core + custom fields)")
def get_filters(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id      = current_user["org_id"]
    core_fields = [
        {"field_name": "first_name", "display_name": "First Name", "field_type": "text", "core": True},
        {"field_name": "last_name",  "display_name": "Last Name",  "field_type": "text", "core": True},
        {"field_name": "email",      "display_name": "Email",      "field_type": "text", "core": True},
        {"field_name": "phone",      "display_name": "Phone",      "field_type": "text", "core": True},
    ]
    custom_fields = db.get_attribute_defs(org_id)
    return {"core_fields": core_fields, "custom_fields": custom_fields}


@router.post("/search", summary="Search contacts with dynamic filters")
def search_contacts(
    body: Union[List[FilterCondition], ContactSearchRequest],
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user["org_id"]
    if isinstance(body, list):
        exact_filters = [f.dict() for f in body]
        exact_logic = "AND"
    else:
        exact_filters = [f.dict() for f in (body.filters or [])]
        exact_logic = (body.logic or "AND").upper()
    contacts = db.run_contact_filter_query(
        org_id=org_id,
        contact_ids=None,
        exact_filters=exact_filters,
        exact_logic=exact_logic,
    )
    enriched = [_enrich_contact({**c, "org_id": org_id}, db) for c in contacts]
    return {"total": len(enriched), "contacts": enriched}


# ------------------------------------------------------------------ #
#  Contact CRUD                                                       #
# ------------------------------------------------------------------ #

@router.post("/", summary="Create a contact manually")
def create_contact(
    body: ContactCreateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id  = current_user["org_id"]
    contact = db.create_contact(
        org_id=org_id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        phone=body.phone,
        created_by=current_user["user_id"],
    )
    if body.attributes:
        _save_attributes(contact["contact_id"], org_id, body.attributes, db)
    return _enrich_contact(contact, db)


@router.get("/", summary="List contacts with pagination")
def list_contacts(
    limit: int = 50,
    offset: int = 0,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id   = current_user["org_id"]
    contacts = db.get_contacts_by_org(org_id, limit, offset)
    total    = db.count_contacts(org_id)
    return {
        "total":    total,
        "limit":    limit,
        "offset":   offset,
        "contacts": [_enrich_contact(c, db) for c in contacts],
    }


@router.get("/{contact_id}", summary="Get a single contact")
def get_contact(
    contact_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    contact = db.get_contact(contact_id, current_user["org_id"])
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _enrich_contact(contact, db)


@router.put("/{contact_id}", summary="Update a contact")
def update_contact(
    contact_id: int,
    body: ContactUpdateRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id   = current_user["org_id"]
    existing = db.get_contact(contact_id, org_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")

    updated = db.update_contact(
        contact_id=contact_id,
        org_id=org_id,
        first_name=body.first_name or existing["first_name"],
        last_name=body.last_name  or existing["last_name"],
        email=body.email if body.email is not None else existing["email"],
        phone=body.phone if body.phone is not None else existing["phone"],
    )
    if body.attributes:
        _save_attributes(contact_id, org_id, body.attributes, db)
    return _enrich_contact(updated, db)


@router.delete("/{contact_id}", summary="Delete a contact")
def delete_contact(
    contact_id: int,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = db.delete_contact(contact_id, current_user["org_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}


# ------------------------------------------------------------------ #
#  AI Prompt Endpoint                                                 #
# ------------------------------------------------------------------ #

@router.post("/prompt", summary="Natural language contact operations (context-validated)")
def contact_prompt(
    body: PromptRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    validation = validate_prompt_context(body.prompt, "contacts")
    if not validation.get("is_valid"):
        return {
            "valid":            False,
            "error":            validation.get("error_message"),
            "correct_context":  validation.get("correct_context"),
            "detected_intent":  validation.get("detected_intent"),
        }
    return {
        "valid":           True,
        "detected_intent": validation.get("detected_intent"),
        "message":         "Prompt is valid for contacts context. Use the appropriate sub-endpoint.",
    }
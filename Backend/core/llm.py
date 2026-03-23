import json
import logging
from typing import List, Dict, Optional, Any
from groq import Groq
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# NOTE: Groq client only (no OpenAI usage). Groq exposes an OpenAI-compatible API surface.
client = Groq(api_key=settings.GROQ_API_KEY, base_url=settings.GROQ_BASE_URL)


def _chat(system: str, user: str, temperature: float = 0.1) -> str:
    """Raw Groq chat call. Returns the assistant message text."""
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=4096,
    )
    return response.choices[0].message.content.strip()


def _parse_json(text: str) -> Any:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ------------------------------------------------------------------ #
#  1. Schema Builder                                                  #
# ------------------------------------------------------------------ #

SCHEMA_SYSTEM = """
You are a CRM schema designer. The user will describe their organization type and what
fields they need on a contact card (in addition to the fixed fields: first_name, last_name,
email, phone). Your job is to return a JSON array of field definitions.

Rules:
- field_name must be snake_case, lowercase, no spaces
- display_name is the human-readable label
- field_type must be one of: text | number | date | boolean
- needs_embedding must be true ONLY if the field holds free-form descriptive text where
  semantic meaning matters for searching (e.g. job_title, department, bio, degree_title).
  For IDs, dates, numbers, yes/no fields, or fields always queried by exact match, set false.
- is_required: true only if the field is truly mandatory for every contact

Return ONLY a JSON array, no explanation, no markdown fences.
Example:
[
  {"field_name": "job_title", "display_name": "Job Title", "field_type": "text", "needs_embedding": true, "is_required": false},
  {"field_name": "salary", "display_name": "Salary", "field_type": "number", "needs_embedding": false, "is_required": false}
]
"""


def build_contact_schema(user_prompt: str) -> List[Dict]:
    """
    Given a natural language description of what fields the org needs,
    returns a list of attribute definition dicts ready to be saved.
    """
    raw = _chat(SCHEMA_SYSTEM, user_prompt)
    return _parse_json(raw)


# ------------------------------------------------------------------ #
#  2. Contact Query Planner (Segments / Campaigns / Events)          #
# ------------------------------------------------------------------ #

QUERY_PLANNER_SYSTEM = """
You are a CRM query planner. You receive:
1. A natural language prompt from the user describing which contacts they want.
2. The org's contact schema (field definitions including which fields have semantic embeddings).

Your job is to produce a JSON query plan that the backend will execute.

The query plan schema:
{
  "semantic_filters": [
    {
      "field_name": "<field with needs_embedding=true>",
      "query": "<semantic search query string>",
      "threshold": <float 0.0-1.0, default 0.55>
    }
  ],
  "exact_filters": [
    {
      "field_name": "<field_name or core field: first_name|last_name|email|phone>",
      "op": "<eq|neq|contains|gt|lt|gte|lte>",
      "value": <string|number|boolean>
    }
  ],
  "logic": "AND"
}

Rules:
- Use semantic_filters ONLY for fields where needs_embedding is true.
- Use exact_filters for all other conditions (dates, numbers, booleans, IDs, exact text match).
- The top-level logic is AND between all filters (semantic and exact combined).
- If the prompt is ambiguous or refers to fields that don't exist in the schema, still produce the best
  possible plan and add an "warnings" array with strings explaining any assumptions.
- Return ONLY valid JSON, no explanation, no markdown fences.
"""


def build_contact_query_plan(prompt: str, schema: List[Dict]) -> Dict:
    """
    Converts a natural language contact selection prompt into a structured query plan.
    schema: list of attribute def dicts (field_name, field_type, needs_embedding, display_name)
    """
    schema_desc = json.dumps(schema, indent=2, default=str)
    user_msg = f"Schema:\n{schema_desc}\n\nUser prompt: {prompt}"
    raw = _chat(QUERY_PLANNER_SYSTEM, user_msg)
    return _parse_json(raw)


def _local_build_contact_query_plan(prompt: str, schema: List[Dict], groq_error: str | None = None) -> Dict:
    """
    Heuristic query planner:
    - pick one best semantic field (prefer job_title/position/title if present)
    - extract a keyword from the prompt (prefer text after 'in' or 'for')
    - run semantic search against that field
    """
    import re

    semantic_fields = [f for f in (schema or []) if f.get("needs_embedding")]
    if not semantic_fields:
        return {"semantic_filters": [], "exact_filters": [], "logic": "AND", "warnings": ["No embedding fields configured."]}

    def score_field(field_name: str) -> int:
        n = (field_name or "").lower()
        if any(k in n for k in ["job_title", "jobtitle", "position", "title", "role", "department"]):
            return 3
        return 1

    semantic_fields_sorted = sorted(semantic_fields, key=lambda f: score_field(f.get("field_name")), reverse=True)
    chosen = semantic_fields_sorted[0].get("field_name")

    lowered = prompt.lower()
    # Heuristic keyword extraction:
    # - take everything after the last " in " (common in prompts like "work in sales")
    # - otherwise take everything after the last " for "
    keyword_phrase = ""
    if " in " in lowered:
        keyword_phrase = lowered.split(" in ")[-1]
    elif " for " in lowered:
        keyword_phrase = lowered.split(" for ")[-1]

    # Shorten: take first 1-2 tokens to approximate the keyword (e.g. "in sales" -> "sales")
    keyword_tokens = re.findall(r"[a-z0-9]+", keyword_phrase)
    keyword = " ".join(keyword_tokens[:2]).strip()
    if not keyword:
        # fallback: first 3-5 words
        words = re.findall(r"[a-z0-9]+", lowered)
        keyword = " ".join(words[:5]).strip()

    semantic_filters = [{"field_name": chosen, "query": keyword, "threshold": 0.55}]
    warnings: list[str] = []
    if groq_error:
        warnings.append("Groq unavailable; using a heuristic segment match (you should review results).")

    return {"semantic_filters": semantic_filters, "exact_filters": [], "logic": "AND", "warnings": warnings}


# ------------------------------------------------------------------ #
#  3. CSV / Excel Column Mapper                                       #
# ------------------------------------------------------------------ #

MAPPER_SYSTEM = """
You are a CRM data import assistant. You receive:
1. The column headers from an uploaded CSV or Excel file (with a few sample rows).
2. The org's contact schema (core fields + custom attribute definitions).

Your job is to map each file column to the most appropriate CRM field.

Core fields (always available): first_name, last_name, email, phone

Return a JSON object:
{
  "mapping": {
    "<file_column_name>": "<crm_field_name_or_null>"
  },
  "unmapped": ["<column_name>", ...],
  "confidence": {
    "<file_column_name>": <float 0.0-1.0>
  },
  "warnings": ["<any issues found>"],
  "is_valid_import": <true|false>
}

Rules:
- If a column clearly maps to a CRM field, set it in mapping with a confidence close to 1.0.
- If a column has no obvious CRM match, map it to null and add it to unmapped.
- Set is_valid_import to false if the file appears to contain no relevant contact data at all
  (e.g. a financial report, product list, etc.) and add a clear warning.
- Set is_valid_import to false if BOTH first_name (or full name) AND email are completely absent.
- Return ONLY valid JSON, no explanation, no markdown fences.
"""


def map_csv_columns(
    columns: List[str],
    sample_rows: List[Dict],
    schema: List[Dict],
) -> Dict:
    """
    Maps CSV/Excel columns to CRM fields.
    Returns mapping dict, unmapped list, confidence scores, warnings, and validity flag.
    """
    # Best effort: try Groq first. If Groq is unavailable (e.g. network/DNS issues),
    # fall back to a local header-matching mapper so imports still work.
    try:
        user_msg = (
            f"File columns: {json.dumps(columns)}\n"
            f"Sample rows (first 3): {json.dumps(sample_rows[:3], default=str)}\n"
            # `schema` can include datetime fields (e.g. created_at/updated_at) from `SELECT *`,
            # so we must ensure it's JSON-serializable.
            f"CRM schema: {json.dumps(schema, indent=2, default=str)}"
        )
        raw = _chat(MAPPER_SYSTEM, user_msg)
        return _parse_json(raw)
    except Exception as e:
        logger.warning("Groq column mapping failed; falling back to local mapping: %s", e)
        return _local_map_csv_columns(
            columns=columns,
            schema=schema,
            groq_error=str(e),
        )


def _local_map_csv_columns(
    columns: List[str],
    schema: List[Dict],
    groq_error: str | None = None,
) -> Dict:
    """
    Local (non-LLM) mapper used when Groq is unreachable.

    Returns the same shape as the Groq mapper:
      { mapping, unmapped, confidence, warnings, is_valid_import }
    """
    import re

    core_fields = ["first_name", "last_name", "email", "phone", "full_name"]

    # Custom fields are stored in `contact_attribute_defs` and may include extra keys.
    custom_fields = [
        {
            "field_name": a.get("field_name"),
            "display_name": a.get("display_name") or a.get("field_name"),
        }
        for a in (schema or [])
        if a.get("field_name")
    ]

    schema_field_names = {f["field_name"] for f in custom_fields if f.get("field_name")}

    def normalize(s: str) -> str:
        s = (s or "").strip().lower()
        s = re.sub(r"[_\-\./]+", " ", s)
        s = re.sub(r"[^a-z0-9 ]+", "", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def tokens(s: str) -> set[str]:
        return set(normalize(s).split(" ")) if normalize(s) else set()

    synonyms_to_core: list[tuple[list[str], str]] = [
        (["email", "e mail", "e-mail", "mail"], "email"),
        (["phone", "mobile", "tel", "telephone"], "phone"),
        (["first name", "first"], "first_name"),
        (["last name", "last"], "last_name"),
        (["full name", "name"], "full_name"),
    ]

    # Special preference fields
    job_syn = ["job title", "job", "position", "title", "role", "occupation"]
    salary_syn = ["salary", "compensation", "pay"]

    def best_custom_match(col: str) -> tuple[str | None, float]:
        col_tokens = tokens(col)
        best: tuple[str | None, float] = (None, 0.0)
        for f in custom_fields:
            field_name = str(f.get("field_name") or "").strip()
            label = str(f.get("display_name") or f.get("field_name") or "").strip()
            candidate = f"{field_name} {label}"

            # Token overlap scoring
            cand_tokens = tokens(candidate)
            if not cand_tokens:
                continue
            overlap = col_tokens.intersection(cand_tokens)
            score = len(overlap) / max(1, len(cand_tokens))

            # Substring boosts
            col_norm = normalize(col)
            label_norm = normalize(label)
            if col_norm and label_norm and col_norm in label_norm:
                score += 0.25
            if label_norm and col_norm and label_norm in col_norm:
                score += 0.25

            if score > best[1]:
                best = (f["field_name"], float(score))
        return best

    # Python typing helper: avoid introducing extra imports for `String`
    # (we keep the local function minimal).
    def _is_job_col(col: str) -> bool:
        col_norm = normalize(col)
        return any(s in col_norm for s in ["job", "position", "role", "occupation", "title"])

    def _is_salary_col(col: str) -> bool:
        col_norm = normalize(col)
        return any(s in col_norm for s in ["salary", "compensation", "pay"])

    mapping: Dict[str, str | None] = {}
    confidence: Dict[str, float] = {}
    unmapped: list[str] = []

    for col in columns:
        col_norm = normalize(col)
        mapped: str | None = None
        conf: float = 0.0

        # Core exact-ish matches first
        core_tokens = tokens(col_norm)
        for syns, core in synonyms_to_core:
            for syn in syns:
                syn_norm = normalize(syn)
                if not syn_norm:
                    continue
                # Match on substring for phrases like "full name"
                if syn_norm in col_norm:
                    mapped = core
                    conf = 0.9 if core in ("email", "phone") else 0.75
                    break
            if mapped:
                break

        # Job title / position preference for custom schema fields
        if mapped is None and _is_job_col(col_norm):
            if "job_title" in schema_field_names:
                mapped = "job_title"
                conf = 0.8
            else:
                # Try best overlap with any schema field
                best_name, best_score = best_custom_match(col_norm)
                if best_name:
                    mapped = best_name
                    conf = max(0.35, min(0.75, best_score))

        # Salary preference for custom schema fields
        if mapped is None and _is_salary_col(col_norm):
            if "salary" in schema_field_names:
                mapped = "salary"
                conf = 0.8
            else:
                best_name, best_score = best_custom_match(col_norm)
                if best_name:
                    mapped = best_name
                    conf = max(0.35, min(0.75, best_score))

        # Generic custom match
        if mapped is None:
            best_name, best_score = best_custom_match(col_norm)
            if best_name and best_score >= 0.35:
                mapped = best_name
                conf = max(conf, min(0.7, best_score + 0.15))

        mapping[col] = mapped
        confidence[col] = float(conf) if mapped else 0.0
        if mapped is None:
            unmapped.append(col)

    mapped_values = {v for v in mapping.values() if v}
    has_name = bool({"first_name", "last_name"} & mapped_values or "full_name" in mapped_values)
    has_email = "email" in mapped_values

    # Allow import review even if one piece (name/email) is missing; user can fix mapping.
    is_valid_import = has_name or has_email
    warnings: list[str] = []
    if groq_error:
        warnings.append("Groq mapping was unavailable; using local header mapping. Please review mapping (especially email/name fields).")
    warnings.extend([])  # keep placeholder for future local warnings

    return {
        "mapping": mapping,
        "unmapped": unmapped,
        "confidence": confidence,
        "warnings": warnings,
        "is_valid_import": is_valid_import,
    }


# ------------------------------------------------------------------ #
#  4. Page Context Validator                                          #
# ------------------------------------------------------------------ #

CONTEXT_VALIDATOR_SYSTEM = """
You are a CRM assistant that validates whether a user's prompt is appropriate for the
current page/context they are on.

Contexts and what they handle:
- contacts: creating, searching, editing, or filtering contacts
- segments: creating or managing named groups of contacts
- campaigns: creating or managing outreach campaigns and their contact lists
- events: creating or managing events and their invite lists
- reminders: creating or managing personal or team reminders
- schema: modifying the contact card fields / schema for the org

Return a JSON object:
{
  "is_valid": <true|false>,
  "detected_intent": "<short description of what the user wants>",
  "correct_context": "<the context this prompt actually belongs to, or same as current if valid>",
  "error_message": "<friendly error if invalid, null if valid>"
}

Return ONLY valid JSON, no explanation, no markdown fences.
"""


def validate_prompt_context(prompt: str, current_context: str) -> Dict:
    """
    Checks whether a user's prompt is appropriate for the page they're on.
    current_context: one of contacts|segments|campaigns|events|reminders|schema
    """
    user_msg = f"Current context: {current_context}\nUser prompt: {prompt}"
    raw = _chat(CONTEXT_VALIDATOR_SYSTEM, user_msg)
    return _parse_json(raw)


# ------------------------------------------------------------------ #
#  5. Schema Edit from Natural Language                               #
# ------------------------------------------------------------------ #

SCHEMA_EDIT_SYSTEM = """
You are a CRM schema editor. The user wants to modify their contact card schema using
natural language. You receive the current schema and the user's request.

You must return a JSON object describing what to do:
{
  "action": "add" | "remove" | "update",
  "fields": [
    {
      "field_name": "<snake_case>",
      "display_name": "<human label>",
      "field_type": "text|number|date|boolean",
      "needs_embedding": true|false,
      "is_required": true|false
    }
  ],
  "warnings": ["..."]
}

For action "remove", only field_name is needed in each field object.
Return ONLY valid JSON, no explanation, no markdown fences.
"""


def parse_schema_edit(prompt: str, current_schema: List[Dict]) -> Dict:
    """
    Parses a natural language schema edit request into a structured action.
    """
    user_msg = (
        f"Current schema: {json.dumps(current_schema, indent=2)}\n"
        f"User request: {prompt}"
    )
    raw = _chat(SCHEMA_EDIT_SYSTEM, user_msg)
    return _parse_json(raw)


# ------------------------------------------------------------------ #
#  6. Campaign Content Generator                                     #
# ------------------------------------------------------------------ #

COMPOSER_SYSTEM = """
You are a CRM outreach copywriter.

The user provides a natural language request describing:
- who to message (may reference segments by name)
- what to message about (may reference an event by name)

Your job: generate message content in the requested channel.

Return ONLY a JSON object with this schema:
{
  "valid": true,
  "campaign_name": "<string>",
  "subject": "<string or null>", 
  "content": "<string>"
}

Rules:
- If channel is "email", provide a helpful subject line and include greeting + body.
- If channel is "whatsapp", set subject to null and generate a short WhatsApp-friendly message.
- Use personalization placeholders:
  - Include "{{name}}" at least once in the message.
  - Optionally use "{{email}}" if relevant.
- If event_action is "cancel", mention cancellation and apologize briefly.
- If event_action is "invite", write an invitation.
- Keep it concise and professional.
"""


def _local_compose_campaign_content(
    prompt: str,
    channel: str,
    event_name: str | None = None,
    event_action: str | None = None,
    segment_names: list[str] | None = None,
    groq_error: str | None = None,
) -> Dict:
    cleaned = (prompt or "").strip().replace("\n", " ")
    lowered = cleaned.lower()

    focus = ""
    if " in " in lowered:
        focus = cleaned.split(" in ")[-1]
    elif " for " in lowered:
        focus = cleaned.split(" for ")[-1]
    else:
        focus = cleaned

    # Fallback: just take a few tokens.
    import re
    tokens = re.findall(r"[a-z0-9]+", focus.lower())
    focus_kw = " ".join(tokens[:3]).strip() if tokens else (event_name or "our update")

    segment_hint = ", ".join(segment_names or []) if segment_names else ""
    seg_part = f" for {segment_hint}" if segment_hint else ""

    if channel == "email":
        subject = None
        if event_action == "cancel":
            subject = f"Update: {event_name or focus_kw} cancelled"
            content = (
                f"Hi {{name}},\n\n"
                f"We wanted to share an update: {event_name or focus_kw} has been cancelled."
                f"{seg_part}\n\n"
                f"We apologize for the inconvenience.\n\n"
                f"If you have any questions, reply to this email.\n\n"
                f"Thanks,"
            )
        elif event_action == "invite":
            subject = f"You're invited: {event_name or focus_kw}"
            content = (
                f"Hi {{name}},\n\n"
                f"You're invited to {event_name or focus_kw}.{seg_part}\n\n"
                f"What to expect: {focus_kw}.\n\n"
                f"If you have questions, reply to this email.\n\n"
                f"Thanks,"
            )
        else:
            subject = f"{focus_kw.title()} update"
            content = (
                f"Hi {{name}},\n\n"
                f"We wanted to share a quick update related to {focus_kw}.{seg_part}\n\n"
                f"If you have any questions, reply to this email.\n\n"
                f"Thanks,"
            )

        return {"valid": True, "campaign_name": focus_kw.title() if focus_kw else "Campaign", "subject": subject, "content": content}

    # WhatsApp
    if event_action == "cancel":
        content = (
            f"Hi {{name}}, quick update: {event_name or focus_kw} is cancelled. Sorry for the inconvenience. {seg_part}"
        )
    elif event_action == "invite":
        content = f"Hi {{name}}, you're invited to {event_name or focus_kw}! {seg_part}\nMore details: {focus_kw}."
    else:
        content = f"Hi {{name}}, quick update about {focus_kw}.{seg_part}"

    return {"valid": True, "campaign_name": focus_kw.title() if focus_kw else "Campaign", "subject": None, "content": content}


def compose_campaign_content(
    prompt: str,
    channel: str,
    event_name: str | None = None,
    event_action: str | None = None,  # invite | cancel | None
    segment_names: list[str] | None = None,
) -> Dict:
    """
    Generates subject+content using Groq.
    """
    segment_names = segment_names or []
    user_msg = json.dumps(
        {
            "channel": channel,
            "event_name": event_name,
            "event_action": event_action,
            "segment_names": segment_names,
            "user_prompt": prompt,
        },
        ensure_ascii=False,
    )
    raw = _chat(COMPOSER_SYSTEM, user_msg, temperature=0.4)
    parsed = _parse_json(raw)

    # Minimal normalization:
    if "campaign_name" not in parsed or parsed.get("campaign_name") in (None, ""):
        parsed["campaign_name"] = "Campaign"
    if channel != "email":
        parsed["subject"] = None
    return parsed


# ------------------------------------------------------------------ #
#  Event Draft Generator (events preview)                           #
# ------------------------------------------------------------------ #

EVENT_DRAFT_SYSTEM = """
You are a CRM event planner assistant.

Given a natural language request describing an event, generate a complete event draft.

Return ONLY valid JSON, no explanation, no markdown fences.

Output schema:
{
  "title": "string",
  "description": "string",
  "event_type": "conference|webinar|meetup|workshop|networking|training|other",
  "location": "string",
  "is_virtual": true|false,
  "event_date": "YYYY-MM-DD",
  "time": "HH:MM",
  "capacity": "number" | null
}

Rules:
- Always fill event_date and time (infer the next reasonable occurrence if missing).
- Always fill location (for virtual events use something like "Zoom" or "Google Meet").
- Keep title short and descriptive.
- Description should be 2-4 sentences focused on the audience and agenda.
- Infer is_virtual from the wording (virtual/online/zoom/meet) if present.
"""


def compose_event_draft(prompt: str) -> Dict:
    raw = _chat(EVENT_DRAFT_SYSTEM, prompt, temperature=0.3)
    return _parse_json(raw)
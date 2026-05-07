"""
llm.py  —  All AI calls for the CRM.

Design principles:
  1. Every prompt has explicit few-shot examples so the model never has to guess
     the output shape.
  2. All _chat() calls retry up to 3 times with exponential backoff.
  3. _parse_json() handles all common fence variants and never crashes silently.
  4. Every public function has a robust local fallback that kicks in when Groq
     is unavailable — the app degrades gracefully, never 500s.
  5. Response shapes are NEVER changed — full backwards compatibility with
     all existing frontend integrations.
"""

from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from groq import Groq

from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = Groq(api_key=settings.GROQ_API_KEY)

# ------------------------------------------------------------------ #
#  Core helpers                                                        #
# ------------------------------------------------------------------ #

def _chat(
    system: str,
    user: str,
    temperature: float = 0.1,
    max_retries: int = 3,
) -> str:
    """
    Groq chat with automatic retry + exponential backoff.
    Raises the last exception if all retries fail.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            logger.info(
                "llm.request attempt=%d model=%s temperature=%s system_prompt=%r user_prompt=%r",
                attempt + 1,
                settings.GROQ_MODEL,
                temperature,
                system,
                user,
            )
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                temperature=temperature,
                max_tokens=4096,
            )
            content = (response.choices[0].message.content or "").strip()
            logger.info(
                "llm.response attempt=%d model=%s content=%r",
                attempt + 1,
                settings.GROQ_MODEL,
                content,
            )
            return content
        except Exception as exc:
            last_exc = exc
            wait = 2 ** attempt  # 1s, 2s, 4s
            logger.warning(
                "llm.error attempt=%d/%d model=%s error=%s retry_in=%ds",
                attempt + 1, max_retries, settings.GROQ_MODEL, exc, wait,
            )
            if attempt < max_retries - 1:
                time.sleep(wait)
    raise last_exc  # type: ignore[misc]


def _parse_json(text: str) -> Any:
    """
    Strip ALL common markdown fence variants, then JSON-parse.
    Handles: ```json, ```JSON, ```, plain JSON.
    Never raises a raw json.JSONDecodeError — wraps with context.
    """
    text = text.strip()
    # Remove any ```...``` fences (case-insensitive language tag)
    text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        # Try to extract the first JSON object/array from the text
        # (sometimes models add trailing prose after the JSON)
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse LLM response as JSON: {exc}\nRaw text: {text[:400]}")
 
 
def _today_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")
 
 
# ------------------------------------------------------------------ #
#  1. Schema Builder                                                   #
# ------------------------------------------------------------------ #
 
SCHEMA_SYSTEM = """\
You are a CRM schema designer. The user describes their organization and what custom \
fields they need on a contact card. The fixed core fields (always present) are: \
first_name, last_name, email, phone — do NOT include these.
 
Return ONLY a JSON array of field definitions. No explanation, no markdown fences.
 
Field definition shape:
{
  "field_name":      string  // snake_case, lowercase, no spaces
  "display_name":    string  // human-readable label
  "field_type":      "text" | "number" | "date" | "boolean"
  "needs_embedding": boolean // true ONLY for free-form descriptive text where
                              // semantic similarity search is useful (e.g. job_title,
                              // department, bio, degree_title, skills).
                              // Always false for IDs, dates, numbers, booleans.
  "is_required":     boolean // true only if the field is mandatory for every contact
}
 
Rules:
- Infer sensible field types (graduation_year → number, dob → date, is_alumni → boolean).
- For fields that hold short descriptive text (job_title, department, college_name,
  degree, skills) set needs_embedding=true so semantic search works.
- For cities/locations, needs_embedding=false because search is always exact.
- Keep field_name as snake_case of the display_name.
- Aim for 4-10 fields; don't add redundant fields.
 
--- FEW-SHOT EXAMPLES ---
 
Input: "We are a staffing agency. We track candidates by their current job title, years of experience, skills summary, and the city they're based in."
Output:
[
  {"field_name": "job_title", "display_name": "Job Title", "field_type": "text", "needs_embedding": true, "is_required": false},
  {"field_name": "years_experience", "display_name": "Years of Experience", "field_type": "number", "needs_embedding": false, "is_required": false},
  {"field_name": "skills_summary", "display_name": "Skills Summary", "field_type": "text", "needs_embedding": true, "is_required": false},
  {"field_name": "city", "display_name": "City", "field_type": "text", "needs_embedding": false, "is_required": false}
]
 
Input: "University alumni CRM. We track graduation year, degree title, department, CGPA, and whether the person is a donor."
Output:
[
  {"field_name": "graduation_year", "display_name": "Graduation Year", "field_type": "number", "needs_embedding": false, "is_required": false},
  {"field_name": "degree_title", "display_name": "Degree Title", "field_type": "text", "needs_embedding": true, "is_required": false},
  {"field_name": "department", "display_name": "Department", "field_type": "text", "needs_embedding": true, "is_required": false},
  {"field_name": "cgpa", "display_name": "CGPA", "field_type": "number", "needs_embedding": false, "is_required": false},
  {"field_name": "is_donor", "display_name": "Is Donor", "field_type": "boolean", "needs_embedding": false, "is_required": false}
]
"""
 
 
def build_contact_schema(user_prompt: str) -> List[Dict]:
    try:
        raw = _chat(SCHEMA_SYSTEM, user_prompt)
        result = _parse_json(raw)
        if isinstance(result, list):
            return result
        # Model may have wrapped in an object
        if isinstance(result, dict):
            for v in result.values():
                if isinstance(v, list):
                    return v
        return []
    except Exception as exc:
        logger.error("build_contact_schema failed: %s", exc)
        return []
 
 
# ------------------------------------------------------------------ #
#  2. Contact Query Planner                                           #
# ------------------------------------------------------------------ #
 
QUERY_PLANNER_SYSTEM = """\
You are a CRM contact query planner. Today's date is {TODAY}.
 
You receive:
1. The org's contact schema (custom fields with field_name, field_type, needs_embedding).
2. A natural language description of which contacts to select.
 
Your job: produce a JSON query plan that the backend will execute exactly.
 
OUTPUT SHAPE (return ONLY this JSON, no explanation, no fences):
{
  "semantic_filters": [
    {
      "field_name":  "<field where needs_embedding=true>",
      "query":       "<text to embed and compare>",
      "threshold":   <float 0.3–0.85; lower = broader match>
    }
  ],
  "exact_filters": [
    {
      "field_name":  "<field_name or core field: first_name|last_name|email|phone>",
      "op":          "<eq|neq|contains|not_contains|starts_with|ends_with|gt|lt|gte|lte|is_null|is_not_null>",
      "value":       <string|number|boolean|null>
    }
  ],
  "logic":    "AND" | "OR",
  "warnings": ["<any assumption or skipped condition>"]
}
 
═══ STRICT RULES ══════════════════════════════════════════════════
 
SEMANTIC vs EXACT split:
  • Use semantic_filters ONLY for fields where needs_embedding=true.
    These handle concept-similarity ("works in marketing", "software engineer").
  • Use exact_filters for everything else: numbers, booleans, dates, IDs,
    and any text field where needs_embedding=false (like city/location).
 
Location fields (city, location, current_city, base_city, current_location):
  ALWAYS exact_filter with op="eq". NEVER semantic.
 
Date handling (today = {TODAY}):
  • "this year" → gte: "{YEAR}-01-01"  AND  lt: "{NEXT_YEAR}-01-01"
  • "last year" → gte: "{PREV_YEAR}-01-01"  AND  lt: "{YEAR}-01-01"
  • "after 2020" → gte: "2021-01-01"
  • "before 2020" → lt: "2020-01-01"
  • "in Q1 {YEAR}" → gte: "{YEAR}-01-01"  AND  lt: "{YEAR}-04-01"
  • "recently joined" → gte date that is 90 days before today
  • Always produce ISO 8601 date strings (YYYY-MM-DD).
  • Never leave date values as relative strings like "last year".
 
Threshold guidance:
  • 0.75–0.85 → very specific role match ("VP of Engineering")
  • 0.55–0.70 → general role category ("engineering", "sales team")
  • 0.40–0.55 → broad topic similarity ("technical", "business")
  Default: 0.60
 
Logic:
  • Use "AND" when the prompt uses "and", lists multiple criteria, or is unambiguous.
  • Use "OR" when the prompt uses "or" or lists alternatives explicitly.
 
Audience vs action — CRITICAL:
  • The prompt may contain action words ("invite", "send", "create event for").
    These are NOT audience filters. Extract only the audience description.
  • "invite all Bangalore employees to the conference" → audience = Bangalore + employees;
    "conference" is NOT a filter.
  • "send a campaign to people in sales" → audience = people in sales.
 
Do NOT invent filters:
  • If the prompt says "all contacts" or "everyone" → return empty filters (matches all).
  • If a field doesn't exist in the schema → skip it and add a warning.
  • Do NOT infer fields from context words (e.g. "college event" does NOT imply
    city=college_city or role=student unless those fields exist and are explicit).
 
Currently-active filter:
  • "currently in the org" / "active employees" → if a field like
    date_of_leaving or exit_date exists: add is_null filter on that field.
  • "people who left" → is_not_null on date_of_leaving/exit_date.
 
─────────────────────────────────────────────────────────────────────
FEW-SHOT EXAMPLES  (schema shown inline, abbreviated as S:)
─────────────────────────────────────────────────────────────────────
 
Example 1 — role similarity + city
S: job_title(text,embed=true), city(text,embed=false), department(text,embed=true)
Prompt: "Send to all sales managers in Mumbai"
{
  "semantic_filters": [{"field_name":"job_title","query":"sales manager","threshold":0.65}],
  "exact_filters":    [{"field_name":"city","op":"eq","value":"Mumbai"}],
  "logic": "AND",
  "warnings": []
}
 
Example 2 — number range
S: salary(number), department(text,embed=true)
Prompt: "Contacts with salary above 80000"
{
  "semantic_filters": [],
  "exact_filters":    [{"field_name":"salary","op":"gt","value":80000}],
  "logic": "AND",
  "warnings": []
}
 
Example 3 — date range (relative)
S: date_of_joining(date), department(text,embed=true)
Prompt: "People who joined last year"
{
  "semantic_filters": [],
  "exact_filters":    [
    {"field_name":"date_of_joining","op":"gte","value":"{PREV_YEAR}-01-01"},
    {"field_name":"date_of_joining","op":"lt", "value":"{YEAR}-01-01"}
  ],
  "logic": "AND",
  "warnings": []
}
 
Example 4 — OR logic
S: department(text,embed=true), city(text,embed=false)
Prompt: "Contacts in engineering or design"
{
  "semantic_filters": [
    {"field_name":"department","query":"engineering","threshold":0.60},
    {"field_name":"department","query":"design","threshold":0.60}
  ],
  "exact_filters": [],
  "logic": "OR",
  "warnings": []
}
 
Example 5 — action word, do NOT become a filter
S: city(text,embed=false), job_title(text,embed=true)
Prompt: "Invite all contacts from Bangalore to the product launch"
{
  "semantic_filters": [],
  "exact_filters":    [{"field_name":"city","op":"eq","value":"Bangalore"}],
  "logic": "AND",
  "warnings": ["'product launch' is event context, not an audience filter"]
}
 
Example 6 — all contacts
S: job_title(text,embed=true), city(text,embed=false)
Prompt: "Send to everyone in the org"
{
  "semantic_filters": [],
  "exact_filters":    [],
  "logic": "AND",
  "warnings": []
}
 
Example 7 — currently active (has date_of_leaving field)
S: date_of_leaving(date), job_title(text,embed=true)
Prompt: "All people currently in the org"
{
  "semantic_filters": [],
  "exact_filters":    [{"field_name":"date_of_leaving","op":"is_null","value":null}],
  "logic": "AND",
  "warnings": []
}
 
Example 8 — boolean
S: is_donor(boolean), graduation_year(number)
Prompt: "All donors who graduated after 2015"
{
  "semantic_filters": [],
  "exact_filters": [
    {"field_name":"is_donor","op":"eq","value":true},
    {"field_name":"graduation_year","op":"gt","value":2015}
  ],
  "logic": "AND",
  "warnings": []
}
 
Example 9 — multi-condition with role + seniority
S: job_title(text,embed=true), department(text,embed=true), city(text,embed=false), salary(number)
Prompt: "Senior engineers in Hyderabad earning more than 100000"
{
  "semantic_filters": [
    {"field_name":"job_title","query":"senior engineer","threshold":0.70},
    {"field_name":"department","query":"engineering","threshold":0.60}
  ],
  "exact_filters": [
    {"field_name":"city","op":"eq","value":"Hyderabad"},
    {"field_name":"salary","op":"gt","value":100000}
  ],
  "logic": "AND",
  "warnings": []
}
 
Example 10 — filtering by email (core field)
S: (core fields always present), job_title(text,embed=true)
Prompt: "Find the contact with email john@example.com"
{
  "semantic_filters": [],
  "exact_filters": [{"field_name":"email","op":"eq","value":"john@example.com"}],
  "logic": "AND",
  "warnings": []
}
 
Example 11 — filtering by name (core field)
S: (core fields always present), department(text,embed=true)
Prompt: "Find all contacts whose last name is Sharma"
{
  "semantic_filters": [],
  "exact_filters": [{"field_name":"last_name","op":"eq","value":"Sharma"}],
  "logic": "AND",
  "warnings": []
}
 
Example 12 — partial name / contains on core field
S: (core fields always present), city(text,embed=false)
Prompt: "All contacts whose first name starts with A"
{
  "semantic_filters": [],
  "exact_filters": [{"field_name":"first_name","op":"starts_with","value":"A"}],
  "logic": "AND",
  "warnings": []
}
 
Example 13 — email domain filter
S: (core fields always present), job_title(text,embed=true)
Prompt: "Contacts with a gmail address"
{
  "semantic_filters": [],
  "exact_filters": [{"field_name":"email","op":"contains","value":"@gmail.com"}],
  "logic": "AND",
  "warnings": []
}
"""
 
 
def _resolve_dates(text: str) -> str:
    """Replace date placeholders with real values based on today."""
    now = datetime.utcnow()
    return (
        text
        .replace("{TODAY}", now.strftime("%Y-%m-%d"))
        .replace("{YEAR}", str(now.year))
        .replace("{NEXT_YEAR}", str(now.year + 1))
        .replace("{PREV_YEAR}", str(now.year - 1))
    )
 
 
def build_contact_query_plan(prompt: str, schema: List[Dict]) -> Dict:
    # Always prepend the four fixed core fields so the LLM can filter on them
    schema_lines = [
        "  first_name (text, embed=false)  [CORE]",
        "  last_name  (text, embed=false)  [CORE]",
        "  email      (text, embed=false)  [CORE]",
        "  phone      (text, embed=false)  [CORE]",
    ]
    for f in (schema or []):
        embed_tag = "embed=true" if f.get("needs_embedding") else "embed=false"
        schema_lines.append(
            f"  {f['field_name']} ({f.get('field_type','text')}, {embed_tag})"
        )
    schema_desc = "Schema fields (core fields are always present on every contact):\n" + "\n".join(schema_lines)
    user_msg = f"{schema_desc}\n\nUser prompt: {prompt}"
 
    system = _resolve_dates(QUERY_PLANNER_SYSTEM)
 
    try:
        raw = _chat(system, user_msg)
        logger.info("query_planner.raw_response prompt=%r raw=%s", prompt, raw)
        plan = _parse_json(raw)
        normalized = _normalize_query_plan(plan, schema)
        logger.info(
            "query_planner.parsed_plan prompt=%r plan=%s",
            prompt, json.dumps(normalized, default=str),
        )
        return normalized
    except Exception as exc:
        logger.warning("build_contact_query_plan Groq failed: %s — using heuristic fallback", exc)
        return _local_build_contact_query_plan(prompt, schema, groq_error=str(exc))
 
 
def _normalize_query_plan(plan: Dict, schema: Optional[List[Dict]] = None) -> Dict:
    """
    Shape normalization + safety:
    - Location fields are always promoted to exact_filters.
    - Null-value filters on non-null ops are dropped with warnings.
    - Thresholds are clamped to [0.30, 0.90].
    - Logic must be AND or OR.
    """
    normalized = dict(plan or {})
    semantic_filters = list(normalized.get("semantic_filters") or [])
    exact_filters    = list(normalized.get("exact_filters") or [])
    warnings         = list(normalized.get("warnings") or [])
 
    LOCATION_FIELDS = {"city", "current_city", "location", "current_location", "base_city"}
 
    schema_embed_map = {}
    if schema:
        for f in schema:
            schema_embed_map[f.get("field_name", "")] = bool(f.get("needs_embedding"))
 
    remaining_semantic: List[Dict] = []
    for sf in semantic_filters:
        field_name = str(sf.get("field_name") or "").strip().lower()
        query      = sf.get("query")
 
        if not field_name:
            warnings.append("Dropped semantic filter with empty field_name.")
            continue
        if not query or (isinstance(query, str) and not query.strip()):
            warnings.append(f"Dropped semantic filter '{field_name}' — empty query.")
            continue
 
        # Location: promote to exact eq
        if field_name in LOCATION_FIELDS:
            exact_filters.append({"field_name": field_name, "op": "eq", "value": str(query).strip()})
            warnings.append(f"Location field '{field_name}' moved to exact eq filter.")
            continue
 
        # Clamp threshold
        threshold = float(sf.get("threshold") or 0.60)
        threshold = max(0.30, min(0.90, threshold))
 
        remaining_semantic.append({**sf, "field_name": field_name, "threshold": threshold})
 
    cleaned_exact: List[Dict] = []
    NULL_OPS = {"is_null", "isnull", "is_not_null", "isnotnull"}
    for ef in exact_filters:
        field_name = str(ef.get("field_name") or "").strip().lower()
        op         = str(ef.get("op") or "").strip().lower()
        value      = ef.get("value")
 
        if not field_name:
            warnings.append("Dropped exact filter with empty field_name.")
            continue
        if not op:
            warnings.append(f"Dropped exact filter '{field_name}' — empty op.")
            continue
 
        # Allow null values for null-check ops; drop null values for value ops
        if value is None and op not in NULL_OPS and op not in {"eq", "neq"}:
            warnings.append(f"Dropped exact filter '{field_name}' (op={op}) — value is null.")
            continue
 
        cleaned_exact.append({**ef, "field_name": field_name, "op": op})
 
    logic = str(normalized.get("logic") or "AND").upper()
    if logic not in {"AND", "OR"}:
        logic = "AND"
 
    normalized["semantic_filters"] = remaining_semantic
    normalized["exact_filters"]    = cleaned_exact
    normalized["logic"]            = logic
    normalized["warnings"]         = warnings
    return normalized
 
 
def _local_build_contact_query_plan(
    prompt: str,
    schema: List[Dict],
    groq_error: Optional[str] = None,
) -> Dict:
    """
    Heuristic fallback query planner used when Groq is unavailable.
    Checks core fields (first_name, last_name, email, phone) first via exact
    match, then falls back to semantic on custom fields.
    """
    warnings: List[str] = []
    if groq_error:
        warnings.append(
            "AI query planning was unavailable; using keyword-based fallback. "
            "Results may be broader than expected — please review."
        )
 
    lowered = prompt.lower()
    exact_filters: List[Dict] = []
 
    # ---- Core field heuristics ----
    # Email address pattern
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", prompt)
    if email_match:
        exact_filters.append({"field_name": "email", "op": "eq", "value": email_match.group(0)})
 
    # Phone number pattern
    phone_match = re.search(r"\b(\+?[0-9]{7,15})\b", prompt)
    if phone_match:
        exact_filters.append({"field_name": "phone", "op": "eq", "value": phone_match.group(1)})
 
    # "named X" / "called X" / name: X style
    name_match = re.search(r"\b(?:named?|called)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)", prompt)
    if name_match:
        parts = name_match.group(1).split()
        exact_filters.append({"field_name": "first_name", "op": "eq", "value": parts[0]})
        if len(parts) > 1:
            exact_filters.append({"field_name": "last_name", "op": "eq", "value": parts[1]})
 
    # If we got core-field hits, return early — no need for semantic
    if exact_filters:
        return {
            "semantic_filters": [],
            "exact_filters": exact_filters,
            "logic": "AND",
            "warnings": warnings,
        }
 
    # ---- Semantic fallback on custom fields ----
    semantic_fields = [f for f in (schema or []) if f.get("needs_embedding")]
    if not semantic_fields:
        # No schema at all — return empty (matches all contacts)
        warnings.append("No filterable schema fields found; returning all contacts.")
        return {"semantic_filters": [], "exact_filters": [], "logic": "AND", "warnings": warnings}
 
    # Score known useful fields higher
    def _score(fn: str) -> int:
        n = fn.lower()
        if any(k in n for k in ["job_title", "title", "position", "role"]):
            return 4
        if any(k in n for k in ["department", "dept", "team"]):
            return 3
        if any(k in n for k in ["skills", "bio", "degree", "specialization"]):
            return 2
        return 1
 
    chosen_field = sorted(semantic_fields, key=lambda f: _score(f.get("field_name", "")), reverse=True)[0]
 
    # Keyword extraction: strip common action/filler words
    action_words = [
        "invite", "send", "create", "find", "get", "select", "show",
        "list", "email", "campaign", "to", "for", "all", "contacts",
        "people", "who", "are", "in the org", "from the",
    ]
    cleaned = lowered
    for w in action_words:
        cleaned = cleaned.replace(w, " ")
 
    tokens  = [t for t in re.findall(r"[a-z0-9]+", cleaned) if len(t) > 2]
    keyword = " ".join(tokens[:4]).strip() or prompt[:60].strip()
 
    return {
        "semantic_filters": [{
            "field_name": chosen_field["field_name"],
            "query":      keyword,
            "threshold":  0.50,
        }],
        "exact_filters": exact_filters,
        "logic":         "AND",
        "warnings":      warnings,
    }
 
 
# ------------------------------------------------------------------ #
#  2b. Segment Naming                                                  #
# ------------------------------------------------------------------ #
 
SEGMENT_META_SYSTEM = """\
You name CRM audience segments for HR/marketing users.
 
Return ONLY valid JSON — no explanation, no fences:
{
  "segment_name":        "<short scannable label, max 55 chars, Title Case, no trailing period>",
  "segment_description": "<1-2 sentences: who belongs here, what criteria define them>"
}
 
Rules:
- segment_name: concrete, not generic. Good: "Senior Engineers in Hyderabad".
  Bad: "AI Segment", "Custom Group".
- segment_description: explain the audience in plain language. Mention key criteria
  (role, location, date range, etc.). Max 200 chars.
- Do NOT mention query plans, embeddings, thresholds, or filters in the output.
- Do NOT include the contact count in the name.
 
--- FEW-SHOT EXAMPLES ---
 
Prompt: "All sales managers in Bangalore"
Count: 12, Plan: city=Bangalore + job_title≈sales manager
Output:
{"segment_name":"Sales Managers in Bangalore","segment_description":"Contacts whose job title matches sales manager and are currently based in Bangalore."}
 
Prompt: "Senior engineers who joined after 2020"
Count: 34, Plan: job_title≈senior engineer + date_of_joining >= 2021-01-01
Output:
{"segment_name":"Senior Engineers — Joined 2021+","segment_description":"Engineers at a senior level who joined the organization after 2020."}
 
Prompt: "Everyone currently in the org"
Count: 200, Plan: date_of_leaving is_null
Output:
{"segment_name":"All Active Members","segment_description":"All contacts who are currently part of the organization (no recorded exit date)."}
"""
 
 
def _summarize_query_plan_for_segment_meta(query_plan: Optional[Dict]) -> str:
    if not query_plan:
        return ""
    lines: List[str] = []
    for sf in query_plan.get("semantic_filters") or []:
        lines.append(f"{sf.get('field_name')} similar to \"{sf.get('query')}\"")
    for ef in query_plan.get("exact_filters") or []:
        lines.append(f"{ef.get('field_name')} {ef.get('op')} {ef.get('value')}")
    return "; ".join(lines) if lines else ""
 
 
def suggest_segment_metadata(
    prompt: str,
    preselected_count: int,
    query_plan: Optional[Dict] = None,
) -> Dict[str, str]:
    qp_summary = _summarize_query_plan_for_segment_meta(query_plan or {})
    user_blob = (
        f"User prompt: {prompt.strip()}\n"
        f"Approximate contact count: {preselected_count}\n"
        f"Filter summary: {qp_summary or '(none)'}"
    )
    try:
        raw  = _chat(SEGMENT_META_SYSTEM, user_blob, temperature=0.35)
        data = _parse_json(raw)
        name = (data.get("segment_name") or "").strip()
        desc = (data.get("segment_description") or "").strip()
        if name and desc:
            return {"segment_name": name[:120], "segment_description": desc[:300]}
    except Exception as exc:
        logger.warning("suggest_segment_metadata Groq failed: %s", exc)
 
    return _local_suggest_segment_metadata(prompt, query_plan or {}, preselected_count)
 
 
def _local_suggest_segment_metadata(
    prompt: str,
    query_plan: Dict,
    preselected_count: int,
) -> Dict[str, str]:
    summary = _summarize_query_plan_for_segment_meta(query_plan).strip()
    # Build a title from the prompt
    cleaned = re.sub(r"\b(create|find|get|send|invite|all|contacts|people|who|are|a|an|the)\b", "", prompt.lower())
    tokens  = [t for t in re.findall(r"[a-z0-9]+", cleaned) if len(t) > 2]
    title   = " ".join(tokens[:5]).title() if tokens else "Custom Segment"
    name    = title if len(title) > 3 else "Custom Segment"
    desc    = f"Contacts matching: {prompt.strip()[:180]}."
    if summary:
        desc += f" Criteria: {summary[:100]}."
    return {"segment_name": name[:120], "segment_description": desc[:300]}
 
 
# ------------------------------------------------------------------ #
#  3. CSV / Excel Column Mapper                                        #
# ------------------------------------------------------------------ #
 
MAPPER_SYSTEM = """\
You are a CRM data import assistant. You receive:
1. Column headers from an uploaded CSV/Excel file (with sample rows).
2. The org's CRM schema (core fields + custom attribute definitions).
 
Map each file column to the most appropriate CRM field.
 
Core fields (always available): first_name, last_name, email, phone
 
Return ONLY valid JSON — no explanation, no fences:
{
  "mapping":        {"<file_column>": "<crm_field_name or null>"},
  "unmapped":       ["<column_name>", ...],
  "confidence":     {"<file_column>": <float 0.0–1.0>},
  "warnings":       ["<issue>", ...],
  "is_valid_import": true | false
}
 
Rules:
- Map confidently when column header or sample data clearly matches a CRM field.
- Use null for columns with no reasonable CRM match; add them to unmapped.
- Set is_valid_import=false when the file clearly isn't a contacts file
  (e.g. financial report, product inventory) — add a clear warning.
- Set is_valid_import=false if BOTH a name field AND email are completely absent.
- A "Name" column should map to full_name (the importer will split it).
- Handle common header aliases: "First Name", "fname", "given_name" → first_name;
  "Last Name", "lname", "surname" → last_name; "Email Address", "mail" → email;
  "Mobile", "Tel", "Cell" → phone.
 
--- FEW-SHOT EXAMPLES ---
 
Input columns: ["First Name","Last Name","Work Email","Mobile","Job Title","City"]
CRM schema: job_title(text), city(text)
Output:
{
  "mapping": {
    "First Name":"first_name","Last Name":"last_name",
    "Work Email":"email","Mobile":"phone",
    "Job Title":"job_title","City":"city"
  },
  "unmapped": [],
  "confidence": {"First Name":0.99,"Last Name":0.99,"Work Email":0.98,"Mobile":0.92,"Job Title":0.95,"City":0.95},
  "warnings": [],
  "is_valid_import": true
}
 
Input columns: ["Product","SKU","Price","Stock"]
CRM schema: job_title(text)
Output:
{
  "mapping": {"Product":null,"SKU":null,"Price":null,"Stock":null},
  "unmapped": ["Product","SKU","Price","Stock"],
  "confidence": {},
  "warnings": ["This appears to be a product/inventory file, not a contacts file."],
  "is_valid_import": false
}
"""
 
 
def map_csv_columns(
    columns: List[str],
    sample_rows: List[Dict],
    schema: List[Dict],
) -> Dict:
    try:
        user_msg = (
            f"File columns: {json.dumps(columns)}\n"
            f"Sample rows (first 3): {json.dumps(sample_rows[:3], default=str)}\n"
            f"CRM schema: {json.dumps(schema, indent=2, default=str)}"
        )
        raw = _chat(MAPPER_SYSTEM, user_msg)
        return _parse_json(raw)
    except Exception as exc:
        logger.warning("map_csv_columns Groq failed; using local mapper: %s", exc)
        return _local_map_csv_columns(columns=columns, schema=schema, groq_error=str(exc))
 
 
def _local_map_csv_columns(
    columns: List[str],
    schema: List[Dict],
    groq_error: Optional[str] = None,
) -> Dict:
    """
    Robust local column mapper — used when Groq is unavailable.
    Normalizes headers and scores against core + custom fields.
    """
    custom_fields = [
        {"field_name": a["field_name"], "display_name": a.get("display_name") or a["field_name"]}
        for a in (schema or []) if a.get("field_name")
    ]
    schema_names = {f["field_name"] for f in custom_fields}
 
    def _norm(s: str) -> str:
        s = (s or "").lower().strip()
        s = re.sub(r"[_\-./\s]+", " ", s)
        s = re.sub(r"[^a-z0-9 ]", "", s)
        return s.strip()
 
    CORE_SYNONYMS: List[tuple[list[str], str]] = [
        (["email", "e mail", "mail", "email address", "work email", "email id"], "email"),
        (["phone", "mobile", "tel", "telephone", "cell", "contact number", "phone number"], "phone"),
        (["first name", "fname", "given name", "first"], "first_name"),
        (["last name", "lname", "surname", "family name", "last"], "last_name"),
        (["name", "full name", "contact name"], "full_name"),
    ]
 
    def _best_custom(col_norm: str) -> tuple[Optional[str], float]:
        best_name, best_score = None, 0.0
        col_tokens = set(col_norm.split())
        for f in custom_fields:
            candidate = _norm(f["display_name"] + " " + f["field_name"])
            cand_tokens = set(candidate.split())
            if not cand_tokens:
                continue
            overlap = len(col_tokens & cand_tokens) / max(len(cand_tokens), 1)
            if col_norm in candidate or candidate in col_norm:
                overlap += 0.3
            if overlap > best_score:
                best_name, best_score = f["field_name"], overlap
        return best_name, best_score
 
    mapping: Dict[str, Optional[str]] = {}
    confidence: Dict[str, float] = {}
    unmapped: List[str] = []
 
    for col in columns:
        col_norm = _norm(col)
        mapped: Optional[str] = None
        conf = 0.0
 
        for syns, core_field in CORE_SYNONYMS:
            if any(s in col_norm or col_norm in s for s in syns):
                mapped, conf = core_field, 0.9
                break
 
        if not mapped:
            best_name, best_score = _best_custom(col_norm)
            if best_name and best_score >= 0.30:
                mapped, conf = best_name, min(0.75, best_score + 0.15)
 
        mapping[col] = mapped
        confidence[col] = round(conf, 2) if mapped else 0.0
        if not mapped:
            unmapped.append(col)
 
    mapped_vals = {v for v in mapping.values() if v}
    has_name  = bool({"first_name", "last_name", "full_name"} & mapped_vals)
    has_email = "email" in mapped_vals
 
    warnings: List[str] = []
    if groq_error:
        warnings.append(
            "AI column mapping unavailable; using built-in header matching. "
            "Please review the mapping before confirming."
        )
 
    return {
        "mapping": mapping,
        "unmapped": unmapped,
        "confidence": confidence,
        "warnings": warnings,
        "is_valid_import": has_name or has_email,
    }
 
 
# ------------------------------------------------------------------ #
#  4. Page Context Validator                                           #
# ------------------------------------------------------------------ #
 
CONTEXT_VALIDATOR_SYSTEM = """\
You are a CRM assistant that validates whether a user's prompt is appropriate for the
current page they are on.
 
Contexts and what they handle:
  contacts  — creating, searching, editing, filtering individual contacts
  segments  — creating or managing named groups / lists of contacts
  campaigns — creating or managing outreach campaigns and their recipients
  events    — creating or managing events and their invite lists
  reminders — creating or managing personal or team reminders
  schema    — modifying the contact card custom fields for the org
 
Return ONLY valid JSON — no explanation, no fences:
{
  "is_valid":        true | false,
  "detected_intent": "<short description of what the user wants>",
  "correct_context": "<context this belongs to, or same as current if valid>",
  "error_message":   "<friendly error if invalid, null if valid>"
}
 
Rules:
  • Be LENIENT. If a prompt COULD reasonably belong to the current context, mark it valid.
  • Only mark invalid when the intent is clearly for a completely different context
    (e.g. "create a segment" on the reminders page).
  • Prompts about "sending to all contacts" / "contacts in department X" are valid
    for campaigns, events, AND segments pages.
  • If in doubt, mark is_valid=true.
 
--- FEW-SHOT EXAMPLES ---
 
Context: segments, Prompt: "Find all sales people in Bangalore"
{"is_valid":true,"detected_intent":"find contacts matching sales + Bangalore","correct_context":"segments","error_message":null}
 
Context: campaigns, Prompt: "Send an email to all senior engineers"
{"is_valid":true,"detected_intent":"create email campaign for senior engineers","correct_context":"campaigns","error_message":null}
 
Context: reminders, Prompt: "Create a segment of all alumni"
{"is_valid":false,"detected_intent":"create a contact segment","correct_context":"segments","error_message":"This looks like a segment creation request. Please go to the Segments page to create a new group."}
 
Context: events, Prompt: "Invite everyone in Bangalore to our product launch"
{"is_valid":true,"detected_intent":"select Bangalore contacts to invite to event","correct_context":"events","error_message":null}
 
Context: contacts, Prompt: "Set a reminder for tomorrow"
{"is_valid":false,"detected_intent":"create a reminder","correct_context":"reminders","error_message":"This looks like a reminder. Please go to the Reminders page to create one."}
"""
 
 
def validate_prompt_context(prompt: str, current_context: str) -> Dict:
    user_msg = f"Context: {current_context}\nPrompt: {prompt}"
    try:
        raw = _chat(CONTEXT_VALIDATOR_SYSTEM, user_msg)
        result = _parse_json(raw)
        # Ensure all expected keys are present
        return {
            "is_valid":        bool(result.get("is_valid", True)),
            "detected_intent": result.get("detected_intent", ""),
            "correct_context": result.get("correct_context", current_context),
            "error_message":   result.get("error_message"),
        }
    except Exception as exc:
        logger.warning("validate_prompt_context failed: %s — defaulting to valid", exc)
        # Fail open — better to let the user proceed than block on a validator error
        return {
            "is_valid": True,
            "detected_intent": prompt[:100],
            "correct_context": current_context,
            "error_message": None,
        }
 
 
# ------------------------------------------------------------------ #
#  5. Schema Edit from Natural Language                                #
# ------------------------------------------------------------------ #
 
SCHEMA_EDIT_SYSTEM = """\
You are a CRM schema editor. The user wants to modify their contact card schema.
You receive the current schema and the user's request.
 
Return ONLY valid JSON — no explanation, no fences:
{
  "actions": [
    {
      "action": "add" | "remove" | "update",
      "fields": [
        {
          "field_name":      "<snake_case>",
          "display_name":    "<human label>",
          "field_type":      "text" | "number" | "date" | "boolean",
          "needs_embedding": true | false,
          "is_required":     true | false
        }
      ]
    }
  ],
  "warnings": ["..."]
}
 
IMPORTANT: The "actions" array allows compound edits (e.g. remove one field AND add another
in a single request). Each entry has its own action + fields list.
 
For action "remove", only field_name is needed in each field object.
 
--- FEW-SHOT EXAMPLES ---
 
Request: "Remove the old salary field and add a bonus_percentage field instead"
Output:
{
  "actions": [
    {"action":"remove","fields":[{"field_name":"salary"}]},
    {"action":"add","fields":[{"field_name":"bonus_percentage","display_name":"Bonus Percentage","field_type":"number","needs_embedding":false,"is_required":false}]}
  ],
  "warnings": []
}
 
Request: "Add a LinkedIn URL field"
Output:
{
  "actions": [
    {"action":"add","fields":[{"field_name":"linkedin_url","display_name":"LinkedIn URL","field_type":"text","needs_embedding":false,"is_required":false}]}
  ],
  "warnings": []
}
 
Request: "Make job_title required"
Output:
{
  "actions": [
    {"action":"update","fields":[{"field_name":"job_title","display_name":"Job Title","field_type":"text","needs_embedding":true,"is_required":true}]}
  ],
  "warnings": []
}
"""
 
 
def parse_schema_edit(prompt: str, current_schema: List[Dict]) -> Dict:
    """
    Parses a NL schema edit request. Returns the new multi-action format
    AND emits a legacy single-action key for backwards compatibility.
    """
    user_msg = (
        f"Current schema:\n{json.dumps(current_schema, indent=2)}\n\n"
        f"User request: {prompt}"
    )
    try:
        raw    = _chat(SCHEMA_EDIT_SYSTEM, user_msg)
        result = _parse_json(raw)
 
        # Normalize: support both new "actions" array and old single "action" key
        if "actions" not in result and "action" in result:
            result["actions"] = [{"action": result["action"], "fields": result.get("fields", [])}]
 
        # Backwards-compat: expose first action as top-level "action"/"fields"
        if result.get("actions"):
            first = result["actions"][0]
            result.setdefault("action", first.get("action"))
            result.setdefault("fields", first.get("fields", []))
 
        return result
    except Exception as exc:
        logger.error("parse_schema_edit failed: %s", exc)
        return {"actions": [], "action": None, "fields": [], "warnings": [str(exc)]}
 
 
# ------------------------------------------------------------------ #
#  6. Campaign Content Generator                                       #
# ------------------------------------------------------------------ #
 
COMPOSER_SYSTEM = """\
You are a CRM outreach copywriter. Write personalized, professional message content.
 
You receive a JSON input with:
  channel          — "email" or "whatsapp"
  event_name       — optional event name string
  event_action     — "invite" | "cancel" | null
  segment_names    — list of audience group names
  user_prompt      — what the user wants to say
  merge_placeholder_rules — AUTHORITATIVE list of allowed {{field}} tokens
  event_details    — {description, location, when} (may be null)
 
Return ONLY valid JSON — no explanation, no fences:
{
  "valid":         true,
  "campaign_name": "<concise name for this campaign>",
  "subject":       "<email subject or null for whatsapp>",
  "content":       "<message body>"
}
 
═══ RULES ══════════════════════════════════════════════════════════
 
Merge placeholders:
  • Use ONLY tokens listed in merge_placeholder_rules.
  • Always use DOUBLE braces: {{name}}, {{first_name}}, {{job_title}}.
  • NEVER invent new placeholder names.
  • Always greet with {{name}} or {{first_name}} at the start.
 
Email:
  • Write a clear, engaging subject line.
  • Body: greeting → context → call to action → sign-off.
  • Use the event_details (when, location, description) naturally — don't skip them.
  • Professional but warm tone.
 
WhatsApp:
  • subject MUST be null.
  • Keep it concise and conversational (2-4 sentences max).
  • Still use {{name}} greeting.
 
Event invites (event_action="invite"):
  • Weave in ALL provided event_details fields.
  • If event_details.when is provided, include it in the message.
  • If event_details.location is provided, mention it.
 
Cancellations (event_action="cancel"):
  • Clear, apologetic, short. Mention the event name.
 
--- FEW-SHOT EXAMPLES ---
 
Input: {channel:"email", event_name:"Annual Summit", event_action:"invite",
        user_prompt:"", merge_placeholder_rules:"{{name}}, {{first_name}}, {{email}}",
        event_details:{description:"Our yearly all-hands meeting", location:"Taj Hotel, Mumbai", when:"Saturday 15 Feb 2025, 10am"}}
Output:
{
  "valid":true,
  "campaign_name":"Annual Summit Invitation",
  "subject":"You're Invited: Annual Summit — 15 Feb 2025",
  "content":"Hi {{name}},\\n\\nWe're excited to invite you to our Annual Summit!\\n\\nOur yearly all-hands meeting brings the whole team together for an inspiring day.\\n\\nDetails:\\n📅 Saturday 15 Feb 2025, 10am\\n📍 Taj Hotel, Mumbai\\n\\nPlease RSVP by replying to this email. We look forward to seeing you there!\\n\\nWarm regards,\\nThe Team"
}
 
Input: {channel:"whatsapp", event_name:null, event_action:null,
        user_prompt:"Monthly product update for our engineering contacts",
        merge_placeholder_rules:"{{name}}, {{first_name}}, {{job_title}}",
        event_details:null}
Output:
{
  "valid":true,
  "campaign_name":"Monthly Product Update — Engineering",
  "subject":null,
  "content":"Hi {{name}} 👋 Here's your monthly product update! We've shipped several improvements this month and wanted to make sure you're in the loop. Reply here if you have questions."
}
"""
 
 
def compose_campaign_content(
    prompt: str,
    channel: str,
    event_name: Optional[str] = None,
    event_action: Optional[str] = None,
    segment_names: Optional[List[str]] = None,
    merge_fields_documentation: Optional[str] = None,
    event_description: Optional[str] = None,
    event_location: Optional[str] = None,
    event_when: Optional[str] = None,
) -> Dict:
    segment_names = segment_names or []
    doc = merge_fields_documentation or (
        "Allowed placeholders: {{name}}, {{first_name}}, {{last_name}}, {{email}}, {{phone}}."
    )
    payload = {
        "channel":               channel,
        "event_name":            event_name,
        "event_action":          event_action,
        "segment_names":         segment_names,
        "user_prompt":           prompt,
        "merge_placeholder_rules": doc,
        "event_details": {
            "description": (event_description or "").strip() or None,
            "location":    (event_location or "").strip() or None,
            "when":        (event_when or "").strip() or None,
        },
    }
    user_msg = json.dumps(payload, ensure_ascii=False)
    try:
        raw    = _chat(COMPOSER_SYSTEM, user_msg, temperature=0.4)
        parsed = _parse_json(raw)
        # Ensure required keys
        if "campaign_name" not in parsed or not parsed.get("campaign_name"):
            parsed["campaign_name"] = _derive_campaign_name(prompt, event_name, event_action)
        if channel != "email":
            parsed["subject"] = None
        parsed["valid"] = True
        return parsed
    except Exception as exc:
        logger.warning("compose_campaign_content Groq failed: %s — using fallback", exc)
        return _local_compose_campaign_content(
            prompt, channel, event_name, event_action, segment_names,
            groq_error=str(exc),
            event_description=event_description,
            event_location=event_location,
            event_when=event_when,
        )
 
 
def _derive_campaign_name(prompt: str, event_name: Optional[str], event_action: Optional[str]) -> str:
    if event_name and event_action:
        return f"{event_name} — {event_action.title()}"
    if event_name:
        return event_name
    if prompt:
        words = re.findall(r"[a-zA-Z0-9]+", prompt)
        return " ".join(words[:4]).title() or "Campaign"
    return "Campaign"
 
 
def _local_compose_campaign_content(
    prompt: str,
    channel: str,
    event_name: Optional[str] = None,
    event_action: Optional[str] = None,
    segment_names: Optional[List[str]] = None,
    groq_error: Optional[str] = None,
    event_description: Optional[str] = None,
    event_location: Optional[str] = None,
    event_when: Optional[str] = None,
) -> Dict:
    """
    Fallback composer — generates a usable (if plain) message when Groq is down.
    Always uses {{name}} (double brace) — never single brace.
    """
    name_token  = "{{name}}"
    event_label = event_name or (prompt[:40].strip() if prompt else "our event")
    campaign_nm = _derive_campaign_name(prompt, event_name, event_action)
 
    detail_lines: List[str] = []
    if event_when:
        detail_lines.append(f"When: {event_when}")
    if event_location:
        detail_lines.append(f"Where: {event_location}")
    details_block = ("\n".join(detail_lines) + "\n\n") if detail_lines else ""
    desc_block    = ((event_description or "").strip() + "\n\n") if event_description else ""
 
    if channel == "email":
        if event_action == "cancel":
            subject = f"Important update: {event_label} has been cancelled"
            body = (
                f"Hi {name_token},\n\n"
                f"We regret to inform you that {event_label} has been cancelled.\n\n"
                f"We apologise for any inconvenience and will be in touch with further details.\n\n"
                f"Warm regards,\nThe Team"
            )
        elif event_action == "invite":
            subject = f"You're invited: {event_label}"
            body = (
                f"Hi {name_token},\n\n"
                f"We'd love to invite you to {event_label}.\n\n"
                + details_block
                + desc_block
                + "Please RSVP by replying to this email.\n\n"
                + "We look forward to seeing you!\n\nWarm regards,\nThe Team"
            )
        else:
            subject = f"{event_label}"
            body = (
                f"Hi {name_token},\n\n"
                + ((prompt.strip() + "\n\n") if prompt.strip() else "We have an update for you.\n\n")
                + details_block
                + "If you have any questions, feel free to reply.\n\nWarm regards,\nThe Team"
            )
        return {"valid": True, "campaign_name": campaign_nm, "subject": subject, "content": body}
 
    # WhatsApp
    if event_action == "cancel":
        content = f"Hi {name_token}, we wanted to let you know that {event_label} has been cancelled. We apologise for the inconvenience."
    elif event_action == "invite":
        bits = []
        if event_when:
            bits.append(event_when)
        if event_location:
            bits.append(event_location)
        extra = " — " + ", ".join(bits) if bits else ""
        content = f"Hi {name_token} 👋 You're invited to {event_label}{extra}! Reply here to confirm."
    else:
        content = f"Hi {name_token} 👋 {prompt.strip() or 'We have an update for you — please reply if you have any questions.'}"
 
    return {"valid": True, "campaign_name": campaign_nm, "subject": None, "content": content}
 
 
# ------------------------------------------------------------------ #
#  7. Event Draft Generator                                            #
# ------------------------------------------------------------------ #
 
EVENT_DRAFT_SYSTEM = """\
You are a CRM event planning assistant.
 
Given a natural language description, generate a complete event draft.
 
Return ONLY valid JSON — no explanation, no fences:
{
  "title":       "<short, descriptive event title>",
  "description": "<2-3 sentences: audience, agenda, purpose>",
  "event_type":  "conference" | "webinar" | "meetup" | "workshop" | "networking" | "training" | "other",
  "location":    "<venue or platform>",
  "is_virtual":  true | false,
  "event_date":  "YYYY-MM-DD",
  "time":        "HH:MM",
  "capacity":    <number> | null,
  "date_inferred": true | false
}
 
Rules:
- Always fill event_date and time. If not stated, pick the next reasonable weekday/weekend
  that is at least 14 days from today ({TODAY}). Set date_inferred=true.
- If date is explicit in the prompt, set date_inferred=false.
- For virtual events (Zoom, Meet, Teams, online, webinar) set is_virtual=true.
- location: use the stated venue; for virtual use the platform name.
- Keep title concise (max 60 chars).
 
--- FEW-SHOT EXAMPLE ---
Prompt: "A team building workshop next month at our Mumbai office"
Today: 2025-01-15
Output:
{
  "title":"Team Building Workshop",
  "description":"An in-person team building workshop for all staff at the Mumbai office. Focused on collaboration and team cohesion.",
  "event_type":"workshop",
  "location":"Mumbai Office",
  "is_virtual":false,
  "event_date":"2025-02-15",
  "time":"10:00",
  "capacity":null,
  "date_inferred":true
}
"""
 
 
def compose_event_draft(prompt: str) -> Dict:
    system = EVENT_DRAFT_SYSTEM.replace("{TODAY}", _today_iso())
    try:
        raw    = _chat(system, prompt, temperature=0.3)
        parsed = _parse_json(raw)
        if not isinstance(parsed, dict):
            raise ValueError("Event draft must be a JSON object")
        return parsed
    except Exception as exc:
        logger.warning("compose_event_draft failed: %s — using fallback", exc)
        return _local_compose_event_draft(prompt)
 
 
def _local_compose_event_draft(prompt: str) -> Dict:
    now = datetime.utcnow()
    # Default to 3 weeks from now
    event_date = (now + timedelta(weeks=3)).strftime("%Y-%m-%d")
 
    is_virtual = any(w in prompt.lower() for w in ["virtual", "online", "zoom", "meet", "webinar", "teams"])
    location = "Zoom" if is_virtual else "TBD"
 
    keywords = re.findall(r"[A-Za-z0-9]+", prompt)
    title = " ".join(keywords[:5]).title() if keywords else "Event"
 
    return {
        "title":         title,
        "description":   prompt.strip()[:300] or "Team event.",
        "event_type":    "other",
        "location":      location,
        "is_virtual":    is_virtual,
        "event_date":    event_date,
        "time":          "10:00",
        "capacity":      None,
        "date_inferred": True,
    }
 
 
# ------------------------------------------------------------------ #
#  8. Reminder Draft Generator                                         #
# ------------------------------------------------------------------ #
 
REMINDER_DRAFT_SYSTEM = """\
You are a CRM reminder assistant. Today is {TODAY}.
 
Given a natural language request, produce a reminder draft.
 
Return ONLY valid JSON — no explanation, no fences:
{
  "title":        "<concise, action-oriented title>",
  "description":  "<brief practical description>",
  "due_date":     "YYYY-MM-DD",
  "due_time":     "HH:MM" | null,
  "priority":     "high" | "medium" | "low",
  "date_inferred": true | false
}
 
Date resolution rules (today = {TODAY}):
  • "today"       → today's date
  • "tomorrow"    → tomorrow
  • "next Monday" → the coming Monday (never today even if today is Monday)
  • "in 3 days"   → today + 3
  • "in 2 weeks"  → today + 14
  • "next week"   → today + 7
  • "end of month" → last day of current month
  • Explicit date (e.g. "15 March") → parse literally
  • If no date is mentioned → default to tomorrow; set date_inferred=true
  • If date IS mentioned → date_inferred=false
 
Priority rules:
  • high   → "urgent", "asap", "critical", "immediately", "today", "tonight"
  • low    → "whenever", "eventually", "no rush", "low priority", "someday"
  • medium → everything else
 
--- FEW-SHOT EXAMPLES ---
 
Today: 2025-01-15
Prompt: "Follow up with Rahul about the contract renewal next Monday"
Output:
{"title":"Follow Up with Rahul — Contract Renewal","description":"Follow up with Rahul regarding the contract renewal discussion.","due_date":"2025-01-20","due_time":null,"priority":"medium","date_inferred":false}
 
Today: 2025-01-15
Prompt: "Urgently call the investor"
Output:
{"title":"Call Investor (Urgent)","description":"Place an urgent call to the investor.","due_date":"2025-01-15","due_time":null,"priority":"high","date_inferred":false}
 
Today: 2025-01-15
Prompt: "Review Q4 report"
Output:
{"title":"Review Q4 Report","description":"Review the Q4 performance report.","due_date":"2025-01-16","due_time":null,"priority":"medium","date_inferred":true}
"""
 
 
def compose_reminder_draft(prompt: str) -> Dict:
    system = REMINDER_DRAFT_SYSTEM.replace("{TODAY}", _today_iso())
    try:
        raw    = _chat(system, prompt, temperature=0.2)
        parsed = _parse_json(raw)
        if not isinstance(parsed, dict):
            raise ValueError("Reminder draft must be a JSON object")
        return parsed
    except Exception:
        return _local_compose_reminder_draft(prompt)
 
 
def _local_compose_reminder_draft(prompt: str) -> Dict:
    """
    Complete local fallback for reminder drafting — handles all common relative dates.
    """
    now     = datetime.utcnow()
    lowered = prompt.lower()
    date_inferred = True
 
    # Try to infer date
    due_date = now + timedelta(days=1)  # default: tomorrow
 
    if "today" in lowered or "tonight" in lowered:
        due_date = now
        date_inferred = False
    elif "tomorrow" in lowered:
        due_date = now + timedelta(days=1)
        date_inferred = False
    elif "in 3 days" in lowered:
        due_date = now + timedelta(days=3)
        date_inferred = False
    elif "in 2 weeks" in lowered or "in two weeks" in lowered:
        due_date = now + timedelta(weeks=2)
        date_inferred = False
    elif "in a week" in lowered or "next week" in lowered:
        due_date = now + timedelta(weeks=1)
        date_inferred = False
    elif "end of month" in lowered:
        import calendar
        last_day = calendar.monthrange(now.year, now.month)[1]
        due_date = now.replace(day=last_day)
        date_inferred = False
    elif "next monday" in lowered:
        days = (7 - now.weekday()) % 7 or 7
        due_date = now + timedelta(days=days)
        date_inferred = False
    elif "next friday" in lowered:
        days = (4 - now.weekday()) % 7 or 7
        due_date = now + timedelta(days=days)
        date_inferred = False
 
    # Extract explicit time
    time_match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", lowered)
    due_time = f"{int(time_match.group(1)):02d}:{time_match.group(2)}" if time_match else None
 
    # Priority
    priority = "medium"
    if any(w in lowered for w in ["urgent", "asap", "immediately", "critical", "today", "tonight"]):
        priority = "high"
    elif any(w in lowered for w in ["whenever", "eventually", "no rush", "low priority", "someday"]):
        priority = "low"
 
    # Title
    title = prompt.strip()
    if len(title) > 80:
        title = title[:77].rstrip() + "..."
 
    return {
        "title":         title or "Reminder",
        "description":   prompt.strip()[:300] or "Follow up on this reminder.",
        "due_date":      due_date.strftime("%Y-%m-%d"),
        "due_time":      due_time,
        "priority":      priority,
        "date_inferred": date_inferred,
    }
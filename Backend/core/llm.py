import json
import logging
from typing import List, Dict, Optional, Any
from groq import Groq
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = Groq(api_key=settings.GROQ_API_KEY)


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
    schema_desc = json.dumps(schema, indent=2)
    user_msg = f"Schema:\n{schema_desc}\n\nUser prompt: {prompt}"
    raw = _chat(QUERY_PLANNER_SYSTEM, user_msg)
    return _parse_json(raw)


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
    user_msg = (
        f"File columns: {json.dumps(columns)}\n"
        f"Sample rows (first 3): {json.dumps(sample_rows[:3], default=str)}\n"
        f"CRM schema: {json.dumps(schema, indent=2)}"
    )
    raw = _chat(MAPPER_SYSTEM, user_msg)
    return _parse_json(raw)


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
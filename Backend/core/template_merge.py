"""
Merge tokens like {{first_name}}, {{name}}, {{job_title}} into email subject/body.
Validates placeholders against core contact fields + org custom attributes.
"""
from __future__ import annotations

import html
import re
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

# `{{token}}` only; token must be alphanumeric + underscore
PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}")

# Ambiguous fragments (shown to user when braces look wrong)
AMBIGUOUS_BRACE_RE = re.compile(r"\{\{([^}]*)\}\}")


CORE_FIELDS = frozenset({"first_name", "last_name", "name", "full_name", "email", "phone"})

# User-facing camelCase aliases -> canonical snake_case stored in merge context
ALIAS_CANONICAL = {
    "firstname": "first_name",
    "lastname": "last_name",
    "fname": "first_name",
    "lname": "last_name",
    "givenname": "first_name",
    "familyname": "last_name",
}


def canonicalize_merge_key(raw: str) -> str:
    """Map user-typed placeholder names to canonical keys used in merge context."""
    import re as _re

    k = raw.strip().replace("-", "_")
    lk = k.lower()
    if lk in ALIAS_CANONICAL:
        return ALIAS_CANONICAL[lk]
    # CamelCase / PascalCase (JobTitle → job_title) so {{jobTitle}} matches schema job_title
    if _re.search(r"[A-Z]", k):
        s1 = _re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", k)
        snake = _re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower().replace("-", "_")
        return snake
    return lk.replace(" ", "_")


def build_allowed_merge_tokens(
    attribute_defs: Sequence[Dict],
    extra_reserved: Optional[Iterable[str]] = None,
) -> Set[str]:
    """
    Allowed placeholder names after canonicalization (lowercase snake_case or core names).
    `extra_reserved` includes per-send keys like event_name supplied by caller.
    """
    allowed: Set[str] = set(CORE_FIELDS)
    for d in attribute_defs or []:
        fn = (d.get("field_name") or "").strip()
        if fn:
            allowed.add(canonicalize_merge_key(fn))
    for key in extra_reserved or []:
        if key:
            allowed.add(canonicalize_merge_key(key))
    return allowed


def analyze_merge_template(subject: Optional[str], content: Optional[str]) -> Tuple[List[str], List[str]]:
    """
    Returns (syntax_errors, placeholders_found_canonical).

    Syntax errors describe malformed `{{ }}` spans (empty inner, unsupported characters).
    """
    errors: List[str] = []
    combined = f"{subject or ''}\n{content or ''}"

    placeholders: List[str] = []
    for m in PLACEHOLDER_RE.finditer(combined):
        placeholders.append(canonicalize_merge_key(m.group(1)))

    for m in AMBIGUOUS_BRACE_RE.finditer(combined):
        span = m.group(0)
        inner = (m.group(1) or "").strip()
        if not inner:
            errors.append(f"Empty merge placeholder: {span}")
            continue
        if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]*", inner):
            errors.append(
                f"Invalid merge placeholder '{span}'. Use a single token inside braces "
                "(letters, numbers, underscores), e.g. {{name}} or {{job_title}}."
            )

    remainder = PLACEHOLDER_RE.sub("", combined)
    if "{{" in remainder:
        errors.append(
            "Incomplete or invalid '{{...}}' merge tag in subject or body. "
            "Each tag must look like {{field_name}}."
        )
    if "}}" in remainder:
        errors.append("Stray '}}' without a matching '{{' merge tag.")

    return errors, list(dict.fromkeys(placeholders))


def validate_merge_placeholders(
    subject: Optional[str],
    content: Optional[str],
    attribute_defs: Sequence[Dict],
    extra_reserved: Optional[Iterable[str]] = None,
) -> Tuple[bool, Dict[str, object]]:
    """
    Returns (ok, detail dict with syntax_errors, unknown_tokens, allowed_tokens_sample, placeholders_used).

    Unknown tokens fail validation when encountered (strict).
    """
    syntax_errors, used = analyze_merge_template(subject, content)
    allowed = build_allowed_merge_tokens(attribute_defs, extra_reserved)
    unknown = sorted({p for p in used if canonicalize_merge_key(p) not in allowed})
    syntax_errors = sorted(set(syntax_errors))

    return (
        len(syntax_errors) == 0 and len(unknown) == 0,
        {
            "syntax_errors": syntax_errors,
            "unknown_tokens": unknown,
            "allowed_tokens_sample": sorted(allowed),
            "placeholders_used": used,
        },
    )


def _format_attr_value(field_type: str, value) -> str:
    if value is None:
        return ""
    if field_type == "boolean":
        return "yes" if value else "no"
    if field_type == "date":
        return str(value) if value else ""
    if field_type == "number":
        return str(value) if value is not None else ""
    return str(value) if value is not None else ""


def build_merge_context_row(
    contact: Dict,
    attribute_rows: Sequence[Dict],
) -> Dict[str, str]:
    """
    Flat string context for replacements. Keys are canonical (snake_case + core names).
    """
    fn = (contact.get("first_name") or "").strip()
    ln = (contact.get("last_name") or "").strip()

    ctx: Dict[str, str] = {
        "first_name": fn,
        "last_name": ln,
        "name": (f"{fn} {ln}").strip() or fn or ln,
        "full_name": (f"{fn} {ln}").strip(),
        "email": (contact.get("email") or "") or "",
        "phone": (contact.get("phone") or "") or "",
    }

    seen_fields: Set[str] = set()
    for row in attribute_rows:
        fname = row.get("field_name")
        if not fname:
            continue
        ft = row.get("field_type") or "text"
        val = (
            row.get("value_text")
            if ft == "text"
            else row.get("value_number")
            if ft == "number"
            else row.get("value_date")
            if ft == "date"
            else row.get("value_boolean")
        )
        key = canonicalize_merge_key(fname)
        ctx[key] = _format_attr_value(ft, val)
        seen_fields.add(key)

    return ctx


def merge_document(
    text: str,
    context: Dict[str, str],
) -> str:
    """Substitute {{field}} case-insensitively by canonical keys."""

    def repl(m: re.Match) -> str:
        key = canonicalize_merge_key(m.group(1))
        return context.get(key, "")

    return PLACEHOLDER_RE.sub(repl, text)


def plain_text_email_to_html(text: str) -> str:
    """Safe HTML body: escaped lines with <br/>."""
    if not text:
        return "<p></p>"
    parts = html.escape(text, quote=False).split("\n")
    return '<p style="margin:0 0 1em 0;">' + "<br/>".join(parts) + "</p>"


def format_merge_documentation(
    attribute_defs: Sequence[Dict],
    extra_merge_keys: Optional[Sequence[str]] = None,
) -> str:
    """
    Human-readable list for prompts and UI hints (not shown to recipients).
    """
    lines = [
        "Built-in placeholders: {{name}}, {{full_name}}, {{first_name}}, {{last_name}}, {{email}}, {{phone}}.",
        "You may also use camelCase for built-ins (e.g. {{firstName}}) — they normalize to snake_case internally.",
        "Custom attributes use their defined field names, e.g. {{job_title}} or {{degree_title}}.",
    ]
    customs = [(d.get("field_name"), d.get("field_type")) for d in (attribute_defs or []) if d.get("field_name")]
    if customs:
        lines.append("Configured org fields (examples):")
        for fn, ft in customs:
            lines.append(f"  - {{{{{fn}}}}} ({ft or 'text'})")
    else:
        lines.append("There are no org-specific custom attributes yet.")

    extras = [e for e in (extra_merge_keys or []) if (e or "").strip()]
    if extras:
        lines.append(
            "For this compose request these additional placeholders may appear in the subject/body:"
        )
        for ek in extras:
            lines.append(f"  - {{{{{canonicalize_merge_key(str(ek))}}}}}")

    lines.append(
        "IMPORTANT: Output must use ONLY these merge tokens (double curly braces). "
        "Do not invent new placeholder names."
    )
    return "\n".join(lines)

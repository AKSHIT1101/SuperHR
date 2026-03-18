"""
query_engine.py  —  Executes a JSON query plan against contacts.

Handles three filter types:
  - semantic_match : uses db.semantic_search_contacts() (numpy cosine via BYTEA embeddings)
  - exact / contains / gt / lt / gte / lte / between : uses db.run_contact_filter_query()

Query plan format (produced by llm.build_contact_query_plan):
{
  "semantic_filters": [
    {"field_name": "department", "query": "sales", "threshold": 0.55}
  ],
  "exact_filters": [
    {"field_name": "city", "op": "eq", "value": "Bangalore"},
    {"field_name": "salary",  "op": "gte", "value": 50000}
  ],
  "logic": "AND"
}

The semantic pass returns candidate contact_id sets per field.
Those sets are intersected (AND) or unioned (OR), then passed as a
contact_id whitelist into run_contact_filter_query for the exact pass.
"""

import logging
from typing import Dict, List, Optional

from core.database import DatabaseManager
from core.embeddings import embed_text

logger = logging.getLogger(__name__)


def execute_query_plan(
    db:         DatabaseManager,
    org_id:     int,
    query_plan: Dict,
) -> List[Dict]:
    """
    Execute a query plan and return matching contacts (max 500).

    Steps:
    1. Run each semantic filter → set of contact_ids above similarity threshold
    2. Combine semantic sets (AND = intersect, OR = union)
    3. Pass surviving ids + exact filters to run_contact_filter_query
    4. Hydrate each returned contact with its custom attribute values
    """
    logic            = query_plan.get("logic", "AND").upper()
    semantic_filters = query_plan.get("semantic_filters", [])
    exact_filters    = query_plan.get("exact_filters", [])

    if not semantic_filters and not exact_filters:
        return []

    # ------------------------------------------------------------------ #
    #  Step 1: Semantic pass                                               #
    # ------------------------------------------------------------------ #
    semantic_id_sets: List[set] = []

    for sf in semantic_filters:
        field_name  = sf["field_name"]
        query_text  = sf["query"]
        threshold   = sf.get("threshold", 0.55)

        query_vec = embed_text(query_text)
        results   = db.semantic_search_contacts(
            org_id=org_id,
            field_name=field_name,
            query_embedding=query_vec,
            top_k=500,
            similarity_threshold=threshold,
        )
        ids = {r["contact_id"] for r in results}
        semantic_id_sets.append(ids)

    # ------------------------------------------------------------------ #
    #  Step 2: Combine semantic candidate sets                            #
    # ------------------------------------------------------------------ #
    surviving_ids: Optional[List[int]] = None

    if semantic_id_sets:
        if logic == "AND":
            combined = semantic_id_sets[0]
            for s in semantic_id_sets[1:]:
                combined = combined & s
        else:
            combined = set()
            for s in semantic_id_sets:
                combined |= s

        # AND logic + any semantic filter returned nothing → entire result empty
        if logic == "AND" and not combined:
            return []

        surviving_ids = list(combined)

    # ------------------------------------------------------------------ #
    #  Step 3: Exact filter pass                                          #
    # ------------------------------------------------------------------ #
    contacts = db.run_contact_filter_query(
        org_id=org_id,
        contact_ids=surviving_ids,
        exact_filters=exact_filters,
    )

    if not contacts:
        return []

    # ------------------------------------------------------------------ #
    #  Step 4: Hydrate custom attribute values                            #
    # ------------------------------------------------------------------ #
    contact_ids  = [c["contact_id"] for c in contacts]
    placeholders = ",".join(["%s"] * len(contact_ids))

    attr_rows = db.execute_query(
        f"""
        SELECT
            cav.contact_id,
            cad.field_name,
            cad.field_type,
            cav.value_text,
            cav.value_number,
            cav.value_date,
            cav.value_boolean
        FROM contact_attribute_values cav
        JOIN contact_attribute_defs cad ON cav.attr_def_id = cad.attr_def_id
        WHERE cav.contact_id IN ({placeholders})
        """,
        tuple(contact_ids),
        fetch="all",
    )

    attr_map: Dict[int, Dict] = {}
    for ar in (attr_rows or []):
        cid   = ar["contact_id"]
        ftype = ar["field_type"]
        if ftype == "text":
            val = ar["value_text"]
        elif ftype == "number":
            val = float(ar["value_number"]) if ar["value_number"] is not None else None
        elif ftype == "date":
            val = str(ar["value_date"]) if ar["value_date"] else None
        else:
            val = ar["value_boolean"]
        attr_map.setdefault(cid, {})[ar["field_name"]] = val

    for c in contacts:
        c["attributes"] = attr_map.get(c["contact_id"], {})

    return contacts
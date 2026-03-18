import psycopg2
import psycopg2.pool
from psycopg2.extras import execute_values, RealDictCursor
from typing import List, Dict, Optional, Any
import logging
import threading
import json

from core.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


class DatabaseManager:
    """
    Unified database manager for the AI-first CRM.

    Tables (shared schema, org_id isolates tenants):
      organizations             — one row per admin account (tenant)
      users                     — all users; role scoped per org
      invitations               — pending invite tokens
      contact_attribute_defs    — per-org custom field schema (LLM-decided at setup)
      contacts                  — core contact record (firstname, lastname, email, phone)
      contact_attribute_values  — EAV values for custom fields; typed columns
      contact_embeddings        — per-field semantic embeddings (BYTEA + numpy cosine)
      segments                  — saved named groups of contacts
      segment_contacts          — M2M: segment ↔ contact
      campaigns                 — campaign records
      campaign_contacts         — M2M: campaign ↔ contact
      events                    — event records
      event_contacts            — M2M: event ↔ contact (invited/rsvp)
      reminders                 — generic reminders (self or group)
      import_jobs               — tracks CSV/Excel import sessions + LLM column mappings
    """

    _pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None
    _pool_lock = threading.Lock()

    def __init__(self):
        self._init_pool()
        self.init_database()

    # ------------------------------------------------------------------ #
    #  Connection Pool                                                     #
    # ------------------------------------------------------------------ #

    def _init_pool(self):
        if DatabaseManager._pool is None:
            with DatabaseManager._pool_lock:
                if DatabaseManager._pool is None:
                    logger.info("Creating database connection pool...")
                    DatabaseManager._pool = psycopg2.pool.ThreadedConnectionPool(
                        minconn=2,
                        maxconn=20,
                        host=settings.DB_HOST,
                        port=settings.DB_PORT,
                        dbname=settings.DB_NAME,
                        user=settings.DB_USER,
                        password=settings.DB_PASSWORD,
                    )
                    logger.info("Connection pool created.")

    def get_connection(self):
        return DatabaseManager._pool.getconn()

    def return_connection(self, conn):
        DatabaseManager._pool.putconn(conn)

    @classmethod
    def close_pool(cls):
        if cls._pool:
            cls._pool.closeall()
            logger.info("Connection pool closed.")

    # ------------------------------------------------------------------ #
    #  Database Initialization                                             #
    # ------------------------------------------------------------------ #

    def init_database(self):
        """Creates all tables and indexes if they do not exist."""
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            # 1. Organizations (one per admin — the tenant root)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    org_id          BIGSERIAL PRIMARY KEY,
                    name            VARCHAR(255) NOT NULL,
                    setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
                    setup_prompt    TEXT,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            # 2. Users
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id         BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    email           VARCHAR(255) NOT NULL UNIQUE,
                    google_sub      VARCHAR(255) UNIQUE,
                    first_name      VARCHAR(100),
                    last_name       VARCHAR(100),
                    role            VARCHAR(20) NOT NULL DEFAULT 'user'
                                        CHECK (role IN ('admin', 'manager', 'user')),
                    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
            """)

            # 3. Invitations (admin invites users by email before they sign up)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS invitations (
                    invitation_id   BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    invited_by      BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                    email           VARCHAR(255) NOT NULL,
                    role            VARCHAR(20) NOT NULL DEFAULT 'user'
                                        CHECK (role IN ('manager', 'user')),
                    token           VARCHAR(512) NOT NULL UNIQUE,
                    used            BOOLEAN NOT NULL DEFAULT FALSE,
                    expires_at      TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW(),
                    UNIQUE (org_id, email)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email)
            """)

            # 4. Contact Attribute Definitions (LLM-decided schema per org)
            # field_type: text | number | date | boolean
            # needs_embedding: LLM decided at schema creation time
            cur.execute("""
                CREATE TABLE IF NOT EXISTS contact_attribute_defs (
                    attr_def_id     BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    field_name      VARCHAR(100) NOT NULL,
                    display_name    VARCHAR(255) NOT NULL,
                    field_type      VARCHAR(20) NOT NULL DEFAULT 'text'
                                        CHECK (field_type IN ('text', 'number', 'date', 'boolean')),
                    needs_embedding BOOLEAN NOT NULL DEFAULT FALSE,
                    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    UNIQUE (org_id, field_name)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_attr_defs_org_id ON contact_attribute_defs(org_id)
            """)

            # 5. Contacts (core — always present regardless of org type)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    contact_id      BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    first_name      VARCHAR(100) NOT NULL,
                    last_name       VARCHAR(100) NOT NULL,
                    email           VARCHAR(255),
                    phone           VARCHAR(50),
                    created_by      BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW(),
                    UNIQUE (org_id, email)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)
            """)

            # 6. Contact Attribute Values (EAV — typed columns for safe casting)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS contact_attribute_values (
                    value_id        BIGSERIAL PRIMARY KEY,
                    contact_id      BIGINT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
                    attr_def_id     BIGINT NOT NULL REFERENCES contact_attribute_defs(attr_def_id) ON DELETE CASCADE,
                    org_id          BIGINT NOT NULL,
                    value_text      TEXT,
                    value_number    NUMERIC,
                    value_date      DATE,
                    value_boolean   BOOLEAN,
                    updated_at      TIMESTAMP DEFAULT NOW(),
                    UNIQUE (contact_id, attr_def_id)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_attr_values_contact_id ON contact_attribute_values(contact_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_attr_values_attr_def_id ON contact_attribute_values(attr_def_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_attr_values_org_id ON contact_attribute_values(org_id)
            """)

            # 7. Contact Embeddings (per-field, stored as BYTEA pickle)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS contact_embeddings (
                    embedding_id    BIGSERIAL PRIMARY KEY,
                    contact_id      BIGINT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
                    org_id          BIGINT NOT NULL,
                    field_name      VARCHAR(100) NOT NULL,
                    embedding       BYTEA NOT NULL,
                    updated_at      TIMESTAMP DEFAULT NOW(),
                    UNIQUE (contact_id, field_name)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_embeddings_contact_id ON contact_embeddings(contact_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_embeddings_org_field ON contact_embeddings(org_id, field_name)
            """)

            # 8. Segments
            cur.execute("""
                CREATE TABLE IF NOT EXISTS segments (
                    segment_id      BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    name            VARCHAR(255) NOT NULL,
                    description     TEXT,
                    prompt          TEXT,
                    query_plan      JSONB,
                    created_by      BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_segments_org_id ON segments(org_id)
            """)

            # 9. Segment ↔ Contact
            cur.execute("""
                CREATE TABLE IF NOT EXISTS segment_contacts (
                    segment_id      BIGINT NOT NULL REFERENCES segments(segment_id) ON DELETE CASCADE,
                    contact_id      BIGINT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
                    added_at        TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (segment_id, contact_id)
                )
            """)

            # 10. Campaigns
            cur.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    campaign_id     BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    name            VARCHAR(255) NOT NULL,
                    description     TEXT,
                    prompt          TEXT,
                    query_plan      JSONB,
                    status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                                        CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
                    created_by      BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(org_id)
            """)

            # 11. Campaign ↔ Contact
            cur.execute("""
                CREATE TABLE IF NOT EXISTS campaign_contacts (
                    campaign_id     BIGINT NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
                    contact_id      BIGINT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
                    added_at        TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (campaign_id, contact_id)
                )
            """)

            # 12. Events
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    event_id        BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    name            VARCHAR(255) NOT NULL,
                    description     TEXT,
                    location        VARCHAR(255),
                    event_date      TIMESTAMP,
                    prompt          TEXT,
                    query_plan      JSONB,
                    status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                                        CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled')),
                    created_by      BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id)
            """)

            # 13. Event ↔ Contact
            cur.execute("""
                CREATE TABLE IF NOT EXISTS event_contacts (
                    event_id        BIGINT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
                    contact_id      BIGINT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
                    rsvp_status     VARCHAR(20) DEFAULT 'invited'
                                        CHECK (rsvp_status IN ('invited', 'attending', 'declined', 'maybe')),
                    added_at        TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (event_id, contact_id)
                )
            """)

            # 14. Reminders
            cur.execute("""
                CREATE TABLE IF NOT EXISTS reminders (
                    reminder_id     BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    created_by      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    assigned_to     BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                    title           TEXT NOT NULL,
                    description     TEXT,
                    due_at          TIMESTAMP,
                    is_done         BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_reminders_org_id ON reminders(org_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to)
            """)

            # 15. Import Jobs
            cur.execute("""
                CREATE TABLE IF NOT EXISTS import_jobs (
                    job_id          BIGSERIAL PRIMARY KEY,
                    org_id          BIGINT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
                    created_by      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    file_name       TEXT NOT NULL,
                    status          VARCHAR(30) NOT NULL DEFAULT 'pending_mapping'
                                        CHECK (status IN (
                                            'pending_mapping',
                                            'awaiting_approval',
                                            'approved',
                                            'processing',
                                            'completed',
                                            'failed',
                                            'rejected'
                                        )),
                    column_mapping  JSONB,
                    unmapped_columns JSONB,
                    total_rows      INTEGER DEFAULT 0,
                    imported_rows   INTEGER DEFAULT 0,
                    error_rows      INTEGER DEFAULT 0,
                    error_details   JSONB,
                    raw_preview     JSONB,
                    created_at      TIMESTAMP DEFAULT NOW(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_import_jobs_org_id ON import_jobs(org_id)
            """)

            conn.commit()
            logger.info("Database initialized successfully.")

        except Exception as e:
            conn.rollback()
            logger.error(f"Error initializing database: {e}")
            raise
        finally:
            cur.close()
            self.return_connection(conn)

    def execute_query(
        self,
        query: str,
        params: tuple = (),
        fetch: str = "all",
    ):
        """
        Generic query executor.
        fetch: 'all' → list[dict], 'one' → dict|None, 'none' → None
        """
        conn = self.get_connection()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(query, params)
            if fetch == "all":
                result = [dict(r) for r in cur.fetchall()]
            elif fetch == "one":
                row = cur.fetchone()
                result = dict(row) if row else None
            else:
                result = None
            conn.commit()
            return result
        except Exception as e:
            conn.rollback()
            logger.error(f"Query error: {e}\nQuery: {query}\nParams: {params}")
            raise
        finally:
            cur.close()
            self.return_connection(conn)

    def execute_many(self, query: str, values: List[tuple]) -> None:
        """Batch insert using execute_values."""
        conn = self.get_connection()
        cur  = conn.cursor()
        try:
            execute_values(cur, query, values)
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Batch insert error: {e}")
            raise
        finally:
            cur.close()
            self.return_connection(conn)

    # ------------------------------------------------------------------ #
    #  Organizations                                                       #
    # ------------------------------------------------------------------ #

    def create_organization(self, name: str) -> Dict:
        return self.execute_query(
            "INSERT INTO organizations (name) VALUES (%s) RETURNING *",
            (name,), fetch="one",
        )

    def get_organization(self, org_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM organizations WHERE org_id = %s",
            (org_id,), fetch="one",
        )

    def mark_org_setup(
        self,
        org_id: int,
        completed: bool,
        prompt: Optional[str] = None,
    ) -> Optional[Dict]:
        return self.execute_query(
            """
            UPDATE organizations
            SET setup_completed = %s,
                setup_prompt    = COALESCE(%s, setup_prompt),
                updated_at      = NOW()
            WHERE org_id = %s
            RETURNING *
            """,
            (completed, prompt, org_id),
            fetch="one",
        )

    # ------------------------------------------------------------------ #
    #  Users                                                               #
    # ------------------------------------------------------------------ #

    def create_user(
        self,
        org_id: int,
        email: str,
        first_name: str = "",
        last_name: str = "",
        role: str = "user",
        google_sub: str = None,
    ) -> Dict:
        return self.execute_query(
            """
            INSERT INTO users (org_id, email, first_name, last_name, role, google_sub)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, email, first_name, last_name, role, google_sub),
            fetch="one",
        )

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM users WHERE email = %s",
            (email,), fetch="one",
        )

    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM users WHERE user_id = %s",
            (user_id,), fetch="one",
        )

    def get_users_by_org(self, org_id: int) -> List[Dict]:
        return self.execute_query(
            "SELECT user_id, org_id, email, first_name, last_name, role, is_active, created_at "
            "FROM users WHERE org_id = %s ORDER BY created_at",
            (org_id,), fetch="all",
        )

    def update_user_role(self, user_id: int, org_id: int, role: str) -> Optional[Dict]:
        return self.execute_query(
            "UPDATE users SET role = %s, updated_at = NOW() "
            "WHERE user_id = %s AND org_id = %s RETURNING *",
            (role, user_id, org_id), fetch="one",
        )

    # ------------------------------------------------------------------ #
    #  Invitations                                                         #
    # ------------------------------------------------------------------ #

    def get_invitation_by_token(self, token: str) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM invitations WHERE token = %s AND used = FALSE AND expires_at > NOW()",
            (token,), fetch="one",
        )

    def mark_invitation_used(self, invitation_id: int) -> None:
        self.execute_query(
            "UPDATE invitations SET used = TRUE, updated_at = NOW() WHERE invitation_id = %s",
            (invitation_id,), fetch="none",
        )

    # ------------------------------------------------------------------ #
    #  Contact Attribute Definitions                                       #
    # ------------------------------------------------------------------ #

    def create_attribute_def(
        self,
        org_id: int,
        field_name: str,
        display_name: str,
        field_type: str = "text",
        needs_embedding: bool = False,
        is_required: bool = False,
    ) -> Dict:
        return self.execute_query(
            """
            INSERT INTO contact_attribute_defs
                (org_id, field_name, display_name, field_type, needs_embedding, is_required)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (org_id, field_name) DO UPDATE
                SET display_name    = EXCLUDED.display_name,
                    field_type      = EXCLUDED.field_type,
                    needs_embedding = EXCLUDED.needs_embedding,
                    is_required     = EXCLUDED.is_required
            RETURNING *
            """,
            (org_id, field_name, display_name, field_type, needs_embedding, is_required),
            fetch="one",
        )

    def get_attribute_defs(self, org_id: int) -> List[Dict]:
        return self.execute_query(
            "SELECT * FROM contact_attribute_defs WHERE org_id = %s ORDER BY attr_def_id",
            (org_id,), fetch="all",
        )

    def get_attribute_def_by_name(self, org_id: int, field_name: str) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM contact_attribute_defs WHERE org_id = %s AND field_name = %s",
            (org_id, field_name), fetch="one",
        )

    # ------------------------------------------------------------------ #
    #  Contacts                                                            #
    # ------------------------------------------------------------------ #

    def create_contact(
        self,
        org_id: int,
        first_name: str,
        last_name: str,
        email: str = None,
        phone: str = None,
        created_by: int = None,
    ) -> Dict:
        return self.execute_query(
            """
            INSERT INTO contacts (org_id, first_name, last_name, email, phone, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, first_name, last_name, email, phone, created_by),
            fetch="one",
        )

    def get_contact(self, contact_id: int, org_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM contacts WHERE contact_id = %s AND org_id = %s",
            (contact_id, org_id), fetch="one",
        )

    def get_contacts_by_org(
        self, org_id: int, limit: int = 50, offset: int = 0
    ) -> List[Dict]:
        return self.execute_query(
            "SELECT * FROM contacts WHERE org_id = %s ORDER BY last_name, first_name "
            "LIMIT %s OFFSET %s",
            (org_id, limit, offset), fetch="all",
        )

    def count_contacts(self, org_id: int) -> int:
        row = self.execute_query(
            "SELECT COUNT(*) AS cnt FROM contacts WHERE org_id = %s",
            (org_id,), fetch="one",
        )
        return row["cnt"] if row else 0

    def update_contact(
        self,
        contact_id: int,
        org_id: int,
        first_name: str,
        last_name: str,
        email: str = None,
        phone: str = None,
    ) -> Optional[Dict]:
        return self.execute_query(
            """
            UPDATE contacts
            SET first_name = %s, last_name = %s, email = %s, phone = %s, updated_at = NOW()
            WHERE contact_id = %s AND org_id = %s
            RETURNING *
            """,
            (first_name, last_name, email, phone, contact_id, org_id),
            fetch="one",
        )

    def delete_contact(self, contact_id: int, org_id: int) -> bool:
        result = self.execute_query(
            "DELETE FROM contacts WHERE contact_id = %s AND org_id = %s RETURNING contact_id",
            (contact_id, org_id), fetch="one",
        )
        return result is not None

    def get_contacts_by_ids(self, contact_ids: List[int], org_id: int) -> List[Dict]:
        if not contact_ids:
            return []
        return self.execute_query(
            "SELECT * FROM contacts WHERE contact_id = ANY(%s) AND org_id = %s",
            (contact_ids, org_id), fetch="all",
        )

    # ------------------------------------------------------------------ #
    #  Contact Attribute Values                                            #
    # ------------------------------------------------------------------ #

    def upsert_attribute_value(
        self,
        contact_id: int,
        attr_def_id: int,
        org_id: int,
        field_type: str,
        value,
    ) -> None:
        col_map = {
            "text":    "value_text",
            "number":  "value_number",
            "date":    "value_date",
            "boolean": "value_boolean",
        }
        col = col_map.get(field_type, "value_text")
        self.execute_query(
            f"""
            INSERT INTO contact_attribute_values
                (contact_id, attr_def_id, org_id, {col}, updated_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (contact_id, attr_def_id) DO UPDATE
                SET {col} = EXCLUDED.{col}, updated_at = NOW()
            """,
            (contact_id, attr_def_id, org_id, value),
            fetch="none",
        )

    def get_contact_attribute_values(
        self, contact_id: int, org_id: int
    ) -> List[Dict]:
        return self.execute_query(
            """
            SELECT cav.*, cad.field_name, cad.display_name, cad.field_type, cad.needs_embedding
            FROM contact_attribute_values cav
            JOIN contact_attribute_defs cad ON cav.attr_def_id = cad.attr_def_id
            WHERE cav.contact_id = %s AND cav.org_id = %s
            ORDER BY cad.attr_def_id
            """,
            (contact_id, org_id), fetch="all",
        )

    # ------------------------------------------------------------------ #
    #  Contact Embeddings                                                  #
    # ------------------------------------------------------------------ #

    def upsert_contact_embedding(
        self,
        contact_id: int,
        org_id: int,
        field_name: str,
        embedding: List[float],
    ) -> None:
        import pickle
        import numpy as np
        emb_bytes = pickle.dumps(np.array(embedding, dtype="float32"))
        self.execute_query(
            """
            INSERT INTO contact_embeddings (contact_id, org_id, field_name, embedding, updated_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (contact_id, field_name) DO UPDATE
                SET embedding = EXCLUDED.embedding, updated_at = NOW()
            """,
            (contact_id, org_id, field_name, emb_bytes),
            fetch="none",
        )

    def semantic_search_contacts(
        self,
        org_id: int,
        field_name: str,
        query_embedding: List[float],
        top_k: int = 200,
        similarity_threshold: float = 0.55,
    ) -> List[Dict]:
        """
        Cosine similarity search in Python using numpy.
        Fetches all BYTEA embeddings for the given org+field from Postgres,
        unpickles them, computes cosine similarity against query_embedding,
        and returns the top_k results above similarity_threshold.
        Returns list of {contact_id, similarity}.
        """
        import pickle
        import numpy as np

        rows = self.execute_query(
            """
            SELECT contact_id, embedding
            FROM contact_embeddings
            WHERE org_id = %s AND field_name = %s
            """,
            (org_id, field_name),
            fetch="all",
        )
        if not rows:
            return []

        contact_ids = [r["contact_id"] for r in rows]
        matrix = np.array(
            [pickle.loads(bytes(r["embedding"])) for r in rows],
            dtype="float32",
        )

        q = np.array(query_embedding, dtype="float32")
        q_norm = np.linalg.norm(q)
        if q_norm == 0:
            return []

        row_norms = np.linalg.norm(matrix, axis=1)
        row_norms[row_norms == 0] = 1e-10
        similarities = matrix.dot(q) / (row_norms * q_norm)

        results = [
            {"contact_id": contact_ids[i], "similarity": float(similarities[i])}
            for i in range(len(similarities))
            if similarities[i] >= similarity_threshold
        ]
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    # ------------------------------------------------------------------ #
    #  Segments                                                            #
    # ------------------------------------------------------------------ #

    def create_segment(
        self,
        org_id: int,
        name: str,
        description: str = None,
        prompt: str = None,
        query_plan: dict = None,
        created_by: int = None,
        contact_ids: List[int] = None,
    ) -> Dict:
        segment = self.execute_query(
            """
            INSERT INTO segments (org_id, name, description, prompt, query_plan, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, name, description, prompt,
             json.dumps(query_plan) if query_plan else None, created_by),
            fetch="one",
        )
        if contact_ids:
            self.execute_many(
                "INSERT INTO segment_contacts (segment_id, contact_id) VALUES %s "
                "ON CONFLICT DO NOTHING",
                [(segment["segment_id"], cid) for cid in contact_ids],
            )
        return segment

    def get_segment(self, segment_id: int, org_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM segments WHERE segment_id = %s AND org_id = %s",
            (segment_id, org_id), fetch="one",
        )

    def get_segments_by_org(self, org_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT s.*, COUNT(sc.contact_id) AS contact_count
            FROM segments s
            LEFT JOIN segment_contacts sc ON s.segment_id = sc.segment_id
            WHERE s.org_id = %s
            GROUP BY s.segment_id
            ORDER BY s.created_at DESC
            """,
            (org_id,), fetch="all",
        )

    def get_segment_contacts(self, segment_id: int, org_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT c.contact_id, c.first_name, c.last_name, c.email, c.phone
            FROM segment_contacts sc
            JOIN contacts c ON sc.contact_id = c.contact_id
            WHERE sc.segment_id = %s AND c.org_id = %s
            ORDER BY c.last_name, c.first_name
            """,
            (segment_id, org_id), fetch="all",
        )

    def delete_segment(self, segment_id: int, org_id: int) -> bool:
        result = self.execute_query(
            "DELETE FROM segments WHERE segment_id = %s AND org_id = %s RETURNING segment_id",
            (segment_id, org_id), fetch="one",
        )
        return result is not None

    # ------------------------------------------------------------------ #
    #  Campaigns                                                           #
    # ------------------------------------------------------------------ #

    def create_campaign(
        self,
        org_id: int,
        name: str,
        description: str = None,
        prompt: str = None,
        query_plan: dict = None,
        created_by: int = None,
        contact_ids: List[int] = None,
    ) -> Dict:
        campaign = self.execute_query(
            """
            INSERT INTO campaigns (org_id, name, description, prompt, query_plan, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, name, description, prompt,
             json.dumps(query_plan) if query_plan else None, created_by),
            fetch="one",
        )
        if contact_ids:
            self.execute_many(
                "INSERT INTO campaign_contacts (campaign_id, contact_id) VALUES %s "
                "ON CONFLICT DO NOTHING",
                [(campaign["campaign_id"], cid) for cid in contact_ids],
            )
        return campaign

    def get_campaign(self, campaign_id: int, org_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM campaigns WHERE campaign_id = %s AND org_id = %s",
            (campaign_id, org_id), fetch="one",
        )

    def get_campaigns_by_org(self, org_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT c.*, COUNT(cc.contact_id) AS contact_count
            FROM campaigns c
            LEFT JOIN campaign_contacts cc ON c.campaign_id = cc.campaign_id
            WHERE c.org_id = %s
            GROUP BY c.campaign_id
            ORDER BY c.created_at DESC
            """,
            (org_id,), fetch="all",
        )

    def get_campaign_contacts(self, campaign_id: int, org_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT c.contact_id, c.first_name, c.last_name, c.email, c.phone
            FROM campaign_contacts cc
            JOIN contacts c ON cc.contact_id = c.contact_id
            WHERE cc.campaign_id = %s AND c.org_id = %s
            ORDER BY c.last_name, c.first_name
            """,
            (campaign_id, org_id), fetch="all",
        )

    def update_campaign_status(
        self, campaign_id: int, org_id: int, status: str
    ) -> Optional[Dict]:
        return self.execute_query(
            "UPDATE campaigns SET status = %s, updated_at = NOW() "
            "WHERE campaign_id = %s AND org_id = %s RETURNING *",
            (status, campaign_id, org_id), fetch="one",
        )

    def delete_campaign(self, campaign_id: int, org_id: int) -> bool:
        result = self.execute_query(
            "DELETE FROM campaigns WHERE campaign_id = %s AND org_id = %s RETURNING campaign_id",
            (campaign_id, org_id), fetch="one",
        )
        return result is not None

    # ------------------------------------------------------------------ #
    #  Events                                                              #
    # ------------------------------------------------------------------ #

    def create_event(
        self,
        org_id: int,
        name: str,
        description: str = None,
        location: str = None,
        event_date=None,
        prompt: str = None,
        query_plan: dict = None,
        created_by: int = None,
        contact_ids: List[int] = None,
    ) -> Dict:
        event = self.execute_query(
            """
            INSERT INTO events
                (org_id, name, description, location, event_date, prompt, query_plan, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, name, description, location, event_date, prompt,
             json.dumps(query_plan) if query_plan else None, created_by),
            fetch="one",
        )
        if contact_ids:
            self.execute_many(
                "INSERT INTO event_contacts (event_id, contact_id) VALUES %s "
                "ON CONFLICT DO NOTHING",
                [(event["event_id"], cid) for cid in contact_ids],
            )
        return event

    def get_event(self, event_id: int, org_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM events WHERE event_id = %s AND org_id = %s",
            (event_id, org_id), fetch="one",
        )

    def get_events_by_org(self, org_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT e.*, COUNT(ec.contact_id) AS invited_count
            FROM events e
            LEFT JOIN event_contacts ec ON e.event_id = ec.event_id
            WHERE e.org_id = %s
            GROUP BY e.event_id
            ORDER BY e.event_date DESC NULLS LAST
            """,
            (org_id,), fetch="all",
        )

    def get_event_contacts(self, event_id: int, org_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT c.contact_id, c.first_name, c.last_name, c.email, c.phone,
                   ec.rsvp_status
            FROM event_contacts ec
            JOIN contacts c ON ec.contact_id = c.contact_id
            WHERE ec.event_id = %s AND c.org_id = %s
            ORDER BY c.last_name, c.first_name
            """,
            (event_id, org_id), fetch="all",
        )

    def update_event_rsvp(
        self, event_id: int, contact_id: int, rsvp_status: str
    ) -> None:
        self.execute_query(
            "UPDATE event_contacts SET rsvp_status = %s "
            "WHERE event_id = %s AND contact_id = %s",
            (rsvp_status, event_id, contact_id), fetch="none",
        )

    def delete_event(self, event_id: int, org_id: int) -> bool:
        result = self.execute_query(
            "DELETE FROM events WHERE event_id = %s AND org_id = %s RETURNING event_id",
            (event_id, org_id), fetch="one",
        )
        return result is not None

    # ------------------------------------------------------------------ #
    #  Reminders                                                           #
    # ------------------------------------------------------------------ #

    def create_reminder(
        self,
        org_id: int,
        created_by: int,
        title: str,
        description: str = None,
        due_at=None,
        assigned_to: int = None,
    ) -> Dict:
        return self.execute_query(
            """
            INSERT INTO reminders
                (org_id, created_by, assigned_to, title, description, due_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, created_by, assigned_to or created_by, title, description, due_at),
            fetch="one",
        )

    def get_reminders(self, org_id: int, user_id: int) -> List[Dict]:
        return self.execute_query(
            """
            SELECT r.*,
                   u.first_name || ' ' || u.last_name AS assigned_to_name
            FROM reminders r
            LEFT JOIN users u ON r.assigned_to = u.user_id
            WHERE r.org_id = %s
              AND (r.created_by = %s OR r.assigned_to = %s)
              AND r.is_done = FALSE
            ORDER BY r.due_at ASC NULLS LAST, r.created_at DESC
            """,
            (org_id, user_id, user_id), fetch="all",
        )

    def update_reminder(
        self,
        reminder_id: int,
        org_id: int,
        user_id: int,
        title: str = None,
        description: str = None,
        due_at=None,
        is_done: bool = None,
        assigned_to: int = None,
    ) -> Optional[Dict]:
        updates = {}
        if title       is not None: updates["title"]       = title
        if description is not None: updates["description"] = description
        if due_at      is not None: updates["due_at"]      = due_at
        if is_done     is not None: updates["is_done"]     = is_done
        if assigned_to is not None: updates["assigned_to"] = assigned_to

        if not updates:
            return self.execute_query(
                "SELECT * FROM reminders WHERE reminder_id = %s AND org_id = %s "
                "AND (created_by = %s OR assigned_to = %s)",
                (reminder_id, org_id, user_id, user_id), fetch="one",
            )

        set_clause = ", ".join(f"{k} = %s" for k in updates)
        return self.execute_query(
            f"UPDATE reminders SET {set_clause}, updated_at = NOW() "
            f"WHERE reminder_id = %s AND org_id = %s "
            f"AND (created_by = %s OR assigned_to = %s) RETURNING *",
            (*updates.values(), reminder_id, org_id, user_id, user_id),
            fetch="one",
        )

    def delete_reminder(self, reminder_id: int, org_id: int, user_id: int) -> bool:
        result = self.execute_query(
            "DELETE FROM reminders WHERE reminder_id = %s AND org_id = %s "
            "AND created_by = %s RETURNING reminder_id",
            (reminder_id, org_id, user_id), fetch="one",
        )
        return result is not None

    # ------------------------------------------------------------------ #
    #  Import Jobs                                                         #
    # ------------------------------------------------------------------ #

    def create_import_job(
        self,
        org_id: int,
        created_by: int,
        file_name: str,
        raw_preview: dict = None,
        total_rows: int = 0,
    ) -> Dict:
        return self.execute_query(
            """
            INSERT INTO import_jobs
                (org_id, created_by, file_name, raw_preview, total_rows)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (org_id, created_by, file_name,
             json.dumps(raw_preview) if raw_preview else None, total_rows),
            fetch="one",
        )

    def update_import_job(self, job_id: int, org_id: int, **kwargs) -> Optional[Dict]:
        if not kwargs:
            return None
        # Serialize any dict values to JSON
        for k, v in kwargs.items():
            if isinstance(v, (dict, list)):
                kwargs[k] = json.dumps(v)
        set_clause = ", ".join(f"{k} = %s" for k in kwargs)
        return self.execute_query(
            f"UPDATE import_jobs SET {set_clause}, updated_at = NOW() "
            f"WHERE job_id = %s AND org_id = %s RETURNING *",
            (*kwargs.values(), job_id, org_id),
            fetch="one",
        )

    def get_import_job(self, job_id: int, org_id: int) -> Optional[Dict]:
        return self.execute_query(
            "SELECT * FROM import_jobs WHERE job_id = %s AND org_id = %s",
            (job_id, org_id), fetch="one",
        )

    def get_import_jobs_by_org(self, org_id: int) -> List[Dict]:
        return self.execute_query(
            "SELECT job_id, file_name, status, total_rows, imported_rows, "
            "error_rows, created_at, updated_at "
            "FROM import_jobs WHERE org_id = %s ORDER BY created_at DESC",
            (org_id,), fetch="all",
        )

    # ------------------------------------------------------------------ #
    #  Hybrid Contact Filter Query  (used by segments/campaigns/events)   #
    # ------------------------------------------------------------------ #

    def run_contact_filter_query(
        self,
        org_id: int,
        contact_ids: Optional[List[int]] = None,
        exact_filters: Optional[List[Dict]] = None,
    ) -> List[Dict]:
        """
        Executes exact-match filters against contacts + contact_attribute_values.

        exact_filters: list of {field_name, op, value}
          op: eq | neq | contains | gt | lt | gte | lte
          field_name: core field or custom attribute field_name

        If contact_ids is provided, only those contacts are considered
        (used to intersect with semantic search results).
        """
        conditions = ["c.org_id = %s"]
        params: List[Any] = [org_id]
        core_fields = {"first_name", "last_name", "email", "phone"}
        joins: List[str] = []
        join_idx = 0

        if contact_ids:
            conditions.append("c.contact_id = ANY(%s)")
            params.append(contact_ids)

        for f in (exact_filters or []):
            field = f["field_name"]
            op    = f["op"]
            val   = f["value"]
            pg_op = {
                "eq": "=", "neq": "!=", "gt": ">",
                "lt": "<", "gte": ">=", "lte": "<=",
            }.get(op, "=")

            if field in core_fields:
                if op == "contains":
                    conditions.append(f"c.{field} ILIKE %s")
                    params.append(f"%{val}%")
                else:
                    conditions.append(f"c.{field} {pg_op} %s")
                    params.append(val)
            else:
                a = f"av{join_idx}"
                join_idx += 1
                joins.append(
                    f"JOIN contact_attribute_values {a} "
                    f"  ON {a}.contact_id = c.contact_id "
                    f"JOIN contact_attribute_defs ad{a} "
                    f"  ON ad{a}.attr_def_id = {a}.attr_def_id "
                    f"  AND ad{a}.field_name = %s "
                    f"  AND ad{a}.org_id = %s"
                )
                params.extend([field, org_id])
                typed_col = (
                    f"{a}.value_boolean" if isinstance(val, bool) else
                    f"{a}.value_number"  if isinstance(val, (int, float)) else
                    f"{a}.value_text"
                )
                if op == "contains":
                    conditions.append(f"{a}.value_text ILIKE %s")
                    params.append(f"%{val}%")
                else:
                    conditions.append(f"{typed_col} {pg_op} %s")
                    params.append(val)

        join_sql  = " ".join(joins)
        where_sql = " AND ".join(conditions)
        sql = (
            f"SELECT DISTINCT c.contact_id, c.first_name, c.last_name, "
            f"c.email, c.phone, c.created_at "
            f"FROM contacts c {join_sql} "
            f"WHERE {where_sql} "
            f"ORDER BY c.last_name, c.first_name "
            f"LIMIT 500"
        )
        return self.execute_query(sql, tuple(params), fetch="all")
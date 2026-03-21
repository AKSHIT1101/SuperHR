from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.dependencies import get_db
from routes import auth, contacts, segments, campaigns, events, reminders, imports, schema, users, templates, analytics

app = FastAPI(
    title="AI-First CRM",
    description="A multi-tenant CRM where everything is driven by natural language prompts.",
    version="1.0.0",
)

# CORS — tighten origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  Routers                                                            #
# ------------------------------------------------------------------ #
app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(segments.router)
app.include_router(campaigns.router)
app.include_router(events.router)
app.include_router(reminders.router)
app.include_router(imports.router)
app.include_router(schema.router)
app.include_router(users.router)
app.include_router(templates.router)
app.include_router(analytics.router)


# ------------------------------------------------------------------ #
#  Startup                                                            #
# ------------------------------------------------------------------ #
@app.on_event("startup")
def startup():
    """Initialize DB connection pool and run migrations on startup."""
    get_db()  # triggers DatabaseManager init + table creation


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "AI-First CRM API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
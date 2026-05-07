from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta, timezone

from core.database import DatabaseManager
from core.dependencies import get_db, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", summary="Dashboard metrics plus monthly activity series")
def dashboard(
    months: int = Query(6, ge=1, le=24),
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Bundles overview metrics (existing keys unchanged plus additive dashboard fields)
    with merged monthly rows for the activity chart.
    """
    org_id = current_user["org_id"]
    user_id = current_user["user_id"]
    return {
        "metrics": db.get_overview_metrics(org_id, user_id),
        "monthly_activity": db.get_dashboard_monthly_activity(org_id, months),
    }


@router.get("/overview", summary="High-level org analytics")
def overview(
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.get_overview_metrics(current_user["org_id"], current_user["user_id"])


@router.get("/timeseries", summary="Time series analytics")
def timeseries(
    metric: str = Query(
        ...,
        description=(
            "contacts_created|campaigns_created|campaigns_sent|events_created|"
            "reminders_created|messages_sent|emails_sent|whatsapp_sent|"
            "messages_opened|messages_clicked"
        ),
    ),
    bucket: str = Query("day", description="day|week|month"),
    days: int = Query(90, ge=1, le=365),
    db: DatabaseManager = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days)

    try:
        return {
            "metric": metric,
            "bucket": bucket,
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
            "series": db.get_timeseries(
                org_id=current_user["org_id"],
                metric=metric,
                bucket=bucket,
                start_iso=start_dt.isoformat(),
                end_iso=end_dt.isoformat(),
            ),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


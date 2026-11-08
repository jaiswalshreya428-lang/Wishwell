"""
API Router Aggregator
Combines authentication, institution management, verifications, and health check.
"""

from fastapi import APIRouter
from datetime import datetime, timezone
from app.schemas.health import HealthResponse
from app.api.auth import router as auth_router
from app.api.institutions import router as institutions_router
from app.api.verifications import router as verifications_router
from app.api.wishes import router as wishes_router
from app.api.claims import router as claims_router
from app.api.deliveries import router as deliveries_router
from app.api.notifications import router as notifications_router
from app.api.impact import router as impact_router
from app.api.admin_analytics import router as admin_analytics_router

api_router = APIRouter(prefix="/api")

# Register sub-routers
api_router.include_router(auth_router)
api_router.include_router(institutions_router)
api_router.include_router(verifications_router)
api_router.include_router(wishes_router)
api_router.include_router(claims_router)
api_router.include_router(deliveries_router)
api_router.include_router(notifications_router)
api_router.include_router(impact_router)
api_router.include_router(admin_analytics_router)

@api_router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Service health check endpoint.
    Used by container orchestrators, load balancers, and monitoring.
    """
    return HealthResponse(
        status="ok",
        app_name="WishWell API",
        version="0.1.0",
        timestamp=datetime.now(timezone.utc),
        database="ready"
    )

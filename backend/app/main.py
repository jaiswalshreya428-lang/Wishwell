"""
WishWell FastAPI Backend Application
Entrypoint for the REST API server.

ARCHITECTURE NOTES:
- Security Headers: Injects strict HTTP response headers (X-Content-Type-Options, X-Frame-Options, HSTS).
- CORS Hardening: Whitelists specific origins, methods, and headers.
- Sanitized Error Handling: Unhandled exceptions return generic messages with an incident reference ID.
- Lifespan Context Manager: Controls background scheduler and database lifecycle cleanly.
"""

import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.scheduler import start_scheduler, stop_scheduler
from app.api.router import api_router

logger = logging.getLogger("wishwell.security")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup and shutdown routines.
    """
    print(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    start_scheduler()
    yield
    stop_scheduler()
    print(f"Shutting down {settings.PROJECT_NAME}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Verified Wish-Matching Platform connecting verified children's homes with donors.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- 1. Security Headers Middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Prevent clickjacking by forbidding embedding in iframes
        response.headers["X-Frame-Options"] = "DENY"
        # Enable legacy XSS auditor
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Control referrer leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Restrict browser capabilities / sensors
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Content Security Policy (disallow frame embedding)
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        # Enforce HTTPS transport in production
        if settings.ENVIRONMENT != "development":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# --- 2. Hardened Cross-Origin Resource Sharing (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# --- 3. Non-Verbose Generic Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Prevents leakage of stack traces, database schema info, or internal file paths to clients.
    Properly preserves intentional HTTP exceptions (e.g. 400, 401, 403, 404, 409) and validation errors.
    Logs unhandled 500 exceptions with an incident UUID.
    """
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None)
        )
    if isinstance(exc, RequestValidationError):
        val_errors = getattr(exc, "errors", lambda: [])()
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": val_errors}
        )

    incident_id = str(uuid.uuid4())
    logger.error(f"Unhandled Exception [Incident {incident_id}] on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Our engineering team has been notified.",
            "incident_id": incident_id,
        },
    )

# Register API Router
app.include_router(api_router)

@app.get("/", tags=["Root"])
async def root_index():
    """Welcome route confirming the API is reachable."""
    return {
        "project": "WishWell",
        "description": "Verified Wish-Matching Platform API",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "environment": settings.ENVIRONMENT
    }

@app.get("/health", tags=["Health"])
async def root_health_check():
    """Root health check alias for cloud load balancers and App Service probes."""
    return {
        "status": "ok",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

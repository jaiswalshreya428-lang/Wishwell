"""
Authentication Endpoints (/api/auth)
Handles registration, login, and profile retrieval.

ARCHITECTURE NOTES:
- Only 'donor' and 'institution' are permitted to self-register.
- Passwords are encrypted with bcrypt before being stored.
- Failed logins log an audit entry and return generic error messages to thwart user enumeration.
- Rate limiting guards against brute-force attacks.
- Atomic transactions ensure that institution user accounts and their institution profiles
  are created together without partial state corruptions.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    password_fingerprint,
)
from app.core.rate_limit import login_rate_limiter
from app.core.dependencies import get_current_user
from app.models.entities import User, Institution, AuditLog
from app.core.audit import record_audit_event
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Self-registration endpoint.
    Permits only 'donor' and 'institution' accounts.
    Administrative and verifier accounts must be provisioned by an admin.
    """
    # 1. Enforce Role Restriction Rule
    if payload.role not in ("donor", "institution"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is restricted to 'donor' and 'institution' roles. Administrative and verifier accounts must be provisioned by an administrator."
        )

    # 2. Check for duplicate email (parameterized query)
    existing_user_stmt = select(User).where(User.email == payload.email)
    existing_user_result = await db.execute(existing_user_stmt)
    if existing_user_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # 3. If institution, check for duplicate registration number
    if payload.role == "institution":
        if not payload.institution:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Institution details are required for institution registration."
            )
        inst_data = payload.institution
        reg_stmt = select(Institution).where(
            Institution.registration_number == inst_data.registration_number
        )
        existing_reg_result = await db.execute(reg_stmt)
        if existing_reg_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An institution with registration number '{inst_data.registration_number}' is already registered."
            )

    # 4. Create User entity with hashed password
    new_user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    await db.flush() # Flush to populate new_user.id for FK association

    # 5. If institution, create linked Institution profile in the same transaction
    if payload.role == "institution" and payload.institution:
        inst_data = payload.institution
        new_institution = Institution(
            user_id=new_user.id,
            name=inst_data.name,
            registration_number=inst_data.registration_number,
            address=inst_data.address,
            city=inst_data.city,
            state=inst_data.state,
            postal_code=inst_data.postal_code,
            phone=inst_data.phone,
            website_url=inst_data.website_url,
            description=inst_data.description,
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(new_institution)

    # 6. Audit log for user registration with hash chaining
    await record_audit_event(
        session=db,
        entity_type="users",
        entity_id=new_user.id,
        action="REGISTER",
        old_status=None,
        new_status=payload.role,
        changed_by=new_user.id,
        details=f"User self-registered as '{payload.role}'.",
        created_at=datetime.now(timezone.utc),
    )

    # Commit atomic transaction
    await db.commit()
    await db.refresh(new_user)

    # Reload eagerly for response serialization
    reload_stmt = select(User).options(selectinload(User.institution)).where(User.id == new_user.id)
    reloaded = (await db.execute(reload_stmt)).scalar_one()

    # 7. Generate short-lived JWT token (15 mins)
    token = create_access_token({
        "sub": str(reloaded.id),
        "email": reloaded.email,
        "role": reloaded.role,
        "name": reloaded.full_name,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=900,
        user=UserResponse.model_validate(reloaded)
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint.
    - Rate limited to prevent brute-force attacks.
    - Constant-time bcrypt password verification.
    - Generic error message on failure to prevent user enumeration.
    - Writes failed attempt to audit_log.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Step 1: Check Rate Limit (raises 429 if exceeded)
    login_rate_limiter.check_and_record(client_ip)

    # Step 2: Fetch user by email (parameterized query)
    stmt = select(User).options(selectinload(User.institution)).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Step 3: Verify password
    is_valid = False
    if user is not None:
        is_valid = verify_password(payload.password, user.password_hash)

    # Step 4: Handle Authentication Failure
    if not is_valid or user is None:
        # Audit log for failed login attempt with hash chaining
        await record_audit_event(
            session=db,
            entity_type="auth",
            entity_id=user.id if user else 0,
            action="LOGIN_FAILED",
            old_status=None,
            new_status=None,
            changed_by=user.id if user else None,
            details=f"Failed login attempt for email '{payload.email}' from IP '{client_ip}'. Reason: Invalid credentials.",
            created_at=datetime.now(timezone.utc),
        )
        await db.commit()

        # Generic error message to prevent user enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 5: Successful login -> reset rate limit for this IP
    login_rate_limiter.reset(client_ip)

    # Step 6: Generate short-lived JWT token
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=900,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the authenticated user's profile and institutional status (if applicable).
    """
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a short-lived (15-minute), single-use password reset token.
    Returns a generic message to avoid user enumeration; exposes reset_token in
    non-production/local evaluation mode since no SMTP gateway is configured.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    login_rate_limiter.check_and_record(f"forgot:{client_ip}")

    stmt = select(User).where(User.email == payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    reset_token = None
    if user is not None:
        reset_token = create_password_reset_token(
            user_id=user.id,
            email=user.email,
            current_password_hash=user.password_hash,
        )
        await record_audit_event(
            session=db,
            entity_type="auth",
            entity_id=user.id,
            action="PASSWORD_RESET_REQUESTED",
            old_status=None,
            new_status=None,
            changed_by=user.id,
            details=f"Password reset token issued for '{user.email}' from IP '{client_ip}'.",
            created_at=datetime.now(timezone.utc),
        )
        await db.commit()

    return ForgotPasswordResponse(
        message="If an account with that email exists, a 15-minute password reset token has been generated.",
        reset_token=reset_token if settings.ENVIRONMENT != "production" else None,
        expires_in=900,
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies a single-use password reset token and updates the user's bcrypt password hash.
    """
    try:
        token_data = decode_password_reset_token(payload.token)
        user_id = int(token_data.get("sub", "0"))
        token_fp = token_data.get("pw_fp")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None or not token_fp or password_fingerprint(user.password_hash) != token_fp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already-used password reset token.",
        )

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.now(timezone.utc)

    await record_audit_event(
        session=db,
        entity_type="auth",
        entity_id=user.id,
        action="PASSWORD_RESET_COMPLETED",
        old_status=None,
        new_status=None,
        changed_by=user.id,
        details=f"Password reset completed for '{user.email}'.",
        created_at=datetime.now(timezone.utc),
    )
    await db.commit()

    return ResetPasswordResponse(message="Password updated successfully. You can now sign in with your new password.")


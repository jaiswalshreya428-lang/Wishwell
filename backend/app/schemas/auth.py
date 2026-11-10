"""
Pydantic Schemas for Authentication & User Accounts
Enforces strict input validation and secure output serialization.

ARCHITECTURE NOTES:
- Pydantic v2 validates types, lengths, and formats before controller execution.
- Passwords are validated for a minimum length of 8 characters.
- Output models strip sensitive data (password_hash) from all API responses.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator, field_validator
from app.core.sanitizer import escape_html

# Disable slow/network-dependent MX DNS checks; strictly validate email syntax
try:
    import email_validator
    email_validator.CHECK_DELIVERABILITY = False
except Exception:
    pass

class InstitutionProfileCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    registration_number: str = Field(..., min_length=3, max_length=100)
    address: str = Field(..., min_length=5, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    postal_code: str = Field(..., min_length=3, max_length=20)
    phone: str = Field(..., min_length=7, max_length=30)
    website_url: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)

class RegisterRequest(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=150)
    role: str = Field(...)
    
    # Required only when role == 'institution'
    institution: Optional[InstitutionProfileCreate] = None

    @model_validator(mode="before")
    @classmethod
    def assemble_institution_payload(cls, data):
        if isinstance(data, dict):
            if data.get("role") == "institution" and not data.get("institution"):
                inst_name = data.get("institution_name") or data.get("name")
                if inst_name:
                    data["institution"] = {
                        "name": inst_name,
                        "registration_number": data.get("registration_number", "PENDING-REG"),
                        "address": data.get("address", "Address Provided on Verification"),
                        "city": data.get("city", "City"),
                        "state": data.get("state", "State"),
                        "postal_code": data.get("postal_code", "00000"),
                        "phone": data.get("phone", "0000000000"),
                        "website_url": data.get("website_url"),
                        "description": data.get("description"),
                    }
        return data

    @model_validator(mode="after")
    def validate_institution_payload(self):
        if self.role == "institution" and not self.institution:
            raise ValueError("Institution profile details are required when registering as an institution.")
        return self

class LoginRequest(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=1, max_length=128)

class InstitutionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    registration_number: str
    city: str
    state: str
    status: str

    @field_validator("name", "city", "state", mode="after")
    @classmethod
    def escape_inst_text(cls, v: str) -> str:
        return escape_html(v) or v

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime
    institution: Optional[InstitutionSummary] = None

    @field_validator("full_name", mode="after")
    @classmethod
    def escape_user_text(cls, v: str) -> str:
        return escape_html(v) or v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900 # 15 minutes in seconds
    user: UserResponse

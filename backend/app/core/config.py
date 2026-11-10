"""
Application Configuration Module
Reads environment variables securely with defaults for local development.
ARCHITECTURE NOTE: Secrets are NEVER hardcoded in production; they are injected via .env.
"""

import os
import json
from typing import List, Optional
from pydantic import Field, model_validator

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    
    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )

        PROJECT_NAME: str = "WishWell API"
        VERSION: str = "0.1.0"
        ENVIRONMENT: str = Field(default="development")

        # Database Settings
        DATABASE_URL: str = Field(
            default="mssql+aioodbc://sa:WishWell_SecureP@ss2026!@localhost:1433/wishwell?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )
        DATABASE_SYNC_URL: str = Field(
            default="mssql+pyodbc://sa:WishWell_SecureP@ss2026!@localhost:1433/wishwell?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )

        # Azurite / Azure Blob Storage
        AZURE_STORAGE_CONNECTION_STRING: str = Field(
            default="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
        )
        AZURE_STORAGE_CONTAINER_NAME: str = "delivery-photos"

        # Azure Cosmos DB (Semi-Structured Data & Polyglot Persistence)
        COSMOS_ENDPOINT: Optional[str] = Field(default=None)
        COSMOS_KEY: Optional[str] = Field(default=None)
        COSMOS_DATABASE_NAME: str = Field(default="wishwell-nosql")

        # Security & JWT Auth
        JWT_SECRET_KEY: str = Field(default="wishwell_development_jwt_secret_key_change_in_production_2026")
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

        # CORS
        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]

        @model_validator(mode="after")
        def validate_production_secrets(self):
            if self.ENVIRONMENT == "production":
                if self.JWT_SECRET_KEY == "wishwell_development_jwt_secret_key_change_in_production_2026":
                    raise ValueError("CRITICAL SECURITY VIOLATION: Default development JWT_SECRET_KEY cannot be used in production.")
            return self

    settings = Settings()

except ImportError:
    # Graceful fallback if pydantic_settings is not installed in the environment
    class FallbackSettings:
        PROJECT_NAME: str = "WishWell API"
        VERSION: str = "0.1.0"
        ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        DATABASE_URL: str = os.getenv(
            "DATABASE_URL",
            "mssql+aioodbc://sa:WishWell_SecureP@ss2026!@localhost:1433/wishwell?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )
        DATABASE_SYNC_URL: str = os.getenv(
            "DATABASE_SYNC_URL",
            "mssql+pyodbc://sa:WishWell_SecureP@ss2026!@localhost:1433/wishwell?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )
        AZURE_STORAGE_CONNECTION_STRING: str = os.getenv(
            "AZURE_STORAGE_CONNECTION_STRING",
            "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
        )
        AZURE_STORAGE_CONTAINER_NAME: str = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "delivery-photos")
        COSMOS_ENDPOINT: Optional[str] = os.getenv("COSMOS_ENDPOINT")
        COSMOS_KEY: Optional[str] = os.getenv("COSMOS_KEY")
        COSMOS_DATABASE_NAME: str = os.getenv("COSMOS_DATABASE_NAME", "wishwell-nosql")
        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "wishwell_development_jwt_secret_key_change_in_production_2026")
        JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
        
        _cors_env = os.getenv("CORS_ORIGINS")
        if _cors_env:
            try:
                CORS_ORIGINS: List[str] = json.loads(_cors_env)
            except Exception:
                CORS_ORIGINS: List[str] = [x.strip() for x in _cors_env.split(",") if x.strip()]
        else:
            CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    settings = FallbackSettings()


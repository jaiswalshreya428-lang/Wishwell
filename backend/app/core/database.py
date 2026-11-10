"""
Database Engine & Session Management (SQLAlchemy 2.0 Async)

ARCHITECTURE NOTES:
1. Uses SQLAlchemy 2.0 DeclarativeBase and async sessions via aioodbc.
2. In production / Docker, connecting to Microsoft SQL Server uses ODBC Driver 18.
3. FastAPI dependency get_db ensures sessions are automatically closed after request lifecycle.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 ORM models."""
    pass

# Initialize async engine lazily or with pooling
try:
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=(settings.ENVIRONMENT == "development"),
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    AsyncSessionLocal = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
except Exception as e:
    # Allows app to initialize even if ODBC driver isn't installed yet
    async_engine = None
    AsyncSessionLocal = None

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding a scoped database session.
    Automatically commits or rolls back on exception, then closes the connection.
    """
    if AsyncSessionLocal is None:
        raise RuntimeError("Database engine not initialized. Check ODBC driver and configuration.")

    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


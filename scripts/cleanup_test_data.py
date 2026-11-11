import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def cleanup():
    async with AsyncSessionLocal() as session:
        # Delete test wishes created with <script>
        res1 = await session.execute(text("DELETE FROM wishes WHERE title LIKE '%<script>%' OR item_name LIKE '%<script>%' OR description LIKE '%<script>%'"))
        print(f"Deleted test wishes: {res1.rowcount}")

        # Delete category 'A & B'
        res2 = await session.execute(text("DELETE FROM categories WHERE name = 'A & B'"))
        print(f"Deleted test category: {res2.rowcount}")

        await session.commit()
        print("Database cleanup completed successfully!")

if __name__ == "__main__":
    asyncio.run(cleanup())


.PHONY: help up down db-init backend frontend test verify clean

help:
	@echo "WishWell Project Management Commands:"
	@echo "  make up         - Start MSSQL and Azurite containers"
	@echo "  make down       - Stop containers"
	@echo "  make db-init    - Apply schema.sql and seed.sql to database"
	@echo "  make backend    - Start FastAPI backend server"
	@echo "  make frontend   - Start React frontend development server"
	@echo "  make test       - Run backend tests"
	@echo "  make verify     - Run database syntax and integrity verification"
	@echo "  make clean      - Clean cache and temporary files"

up:
	docker compose up -d

down:
	docker compose down

db-init:
	python db/init_db.py

backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -v

verify:
	python scripts/verify_db.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +


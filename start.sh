#!/usr/bin/env bash
# WishWell Linux / macOS Helper Script
set -e

ACTION="${1:-help}"

case "$ACTION" in
    up)
        echo "Starting MSSQL and Azurite containers..."
        docker compose up -d
        ;;
    down)
        echo "Stopping containers..."
        docker compose down
        ;;
    db-init)
        echo "Applying schema and seed data..."
        python3 db/init_db.py
        ;;
    backend)
        echo "Starting FastAPI backend..."
        cd backend && uvicorn app.main:app --reload --port 8000
        ;;
    frontend)
        echo "Starting React frontend..."
        cd frontend && npm run dev
        ;;
    test)
        echo "Running tests..."
        cd backend && pytest -v
        ;;
    verify)
        echo "Verifying database schema and stored procedures..."
        python3 scripts/verify_db.py
        ;;
    *)
        echo "WishWell - Commands available:"
        echo "  ./start.sh up         - Start MSSQL & Azurite containers"
        echo "  ./start.sh down       - Stop containers"
        echo "  ./start.sh db-init    - Run schema.sql and seed.sql"
        echo "  ./start.sh backend    - Start FastAPI server"
        echo "  ./start.sh frontend   - Start React Vite frontend"
        echo "  ./start.sh test       - Run backend tests"
        echo "  ./start.sh verify     - Run schema & T-SQL verification"
        ;;
esac


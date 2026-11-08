# WishWell Windows PowerShell Helper Script
param (
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "db-init", "backend", "frontend", "website", "preview", "test", "verify", "help")]
    [string]$Action = "help"
)

switch ($Action) {
    "up" {
        Write-Host "Starting MSSQL and Azurite containers..." -ForegroundColor Cyan
        docker compose up -d
    }
    "down" {
        Write-Host "Stopping containers..." -ForegroundColor Yellow
        docker compose down
    }
    "db-init" {
        Write-Host "Applying schema and seed data..." -ForegroundColor Cyan
        python db/init_db.py
    }
    "backend" {
        Write-Host "Starting FastAPI backend..." -ForegroundColor Green
        Set-Location backend
        python -m uvicorn app.main:app --reload --port 8000
    }
    "frontend" {
        Write-Host "Starting React frontend (Vite)..." -ForegroundColor Green
        Set-Location frontend
        npm run dev
    }
    "website" {
        Write-Host "Opening WishWell Interactive Website Preview..." -ForegroundColor Green
        python open_website.py
    }
    "preview" {
        Write-Host "Opening WishWell Interactive Website Preview..." -ForegroundColor Green
        python open_website.py
    }
    "test" {
        Write-Host "Running tests..." -ForegroundColor Cyan
        Set-Location backend
        python -m pytest -v
    }
    "verify" {
        Write-Host "Verifying database schema and stored procedures..." -ForegroundColor Cyan
        python scripts/verify_db.py
    }
    Default {
        Write-Host "WishWell - Commands available:" -ForegroundColor Cyan
        Write-Host "  .\start.ps1 up         - Start MSSQL & Azurite containers"
        Write-Host "  .\start.ps1 down       - Stop containers"
        Write-Host "  .\start.ps1 db-init    - Run schema.sql and seed.sql"
        Write-Host "  .\start.ps1 backend    - Start FastAPI server (http://localhost:8000/docs)"
        Write-Host "  .\start.ps1 website    - Open interactive website in your browser"
        Write-Host "  .\start.ps1 frontend   - Start React Vite frontend (requires npm)"
        Write-Host "  .\start.ps1 test       - Run backend tests"
        Write-Host "  .\start.ps1 verify     - Run schema & T-SQL verification"
    }
}


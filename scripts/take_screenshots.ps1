# Take screenshots of WishWell landing page at Desktop (1280px), Tablet (768px), and Mobile (375px)

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

Write-Host "Starting Vite preview server on port 4173..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd frontend && npx vite preview --port 4173" -PassThru -NoNewWindow
Start-Sleep -Seconds 4

try {
    $desktopPath = (Resolve-Path "docs\screenshots").Path + "\landing_desktop_1280px.png"
    $tabletPath  = (Resolve-Path "docs\screenshots").Path + "\landing_tablet_768px.png"
    $mobilePath   = (Resolve-Path "docs\screenshots").Path + "\landing_mobile_375px.png"

    Write-Host "Capturing Desktop (1280x2800)..."
    & $chromePath --headless=new --disable-gpu --hide-scrollbars --window-size=1280,2800 "--screenshot=$desktopPath" "http://localhost:4173/"
    Start-Sleep -Seconds 1

    Write-Host "Capturing Tablet (768x2800)..."
    & $chromePath --headless=new --disable-gpu --hide-scrollbars --window-size=768,2800 "--screenshot=$tabletPath" "http://localhost:4173/"
    Start-Sleep -Seconds 1

    Write-Host "Capturing Mobile (375x3400)..."
    & $chromePath --headless=new --disable-gpu --hide-scrollbars --window-size=375,3400 "--screenshot=$mobilePath" "http://localhost:4173/"
    Start-Sleep -Seconds 1

    Write-Host "Screenshots captured successfully."
}
finally {
    Write-Host "Stopping preview server (PID: $($proc.Id))..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-1) } | Stop-Process -Force -ErrorAction SilentlyContinue
}

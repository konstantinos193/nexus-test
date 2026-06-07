# Build nexus-launchpad via Docker (works on Windows without WSL rustup)
# Usage: .\build.ps1
# See STANDARD_NFT_LAUNCHPAD_GUIDE.md — anchor build + idl-build for client sync

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Nexus Launchpad Docker Build ===" -ForegroundColor Cyan

docker compose -f docker-compose.build.yml up --build --abort-on-container-exit
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed (exit $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

$so = @(
    "target\deploy\nexus_launchpad.so",
    "target\sbpf-solana-solana\release\nexus_launchpad.so"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$idl = "target\idl\nexus_launchpad.json"
if ($so) {
    Write-Host "Built: $so ($([math]::Round((Get-Item $so).Length/1KB)) KB)" -ForegroundColor Green
} else {
    Write-Host "Warning: .so not found under target/" -ForegroundColor Yellow
}
if (Test-Path $idl) {
    Write-Host "IDL:   $idl" -ForegroundColor Green
    $backendIdl = "..\Backend\src\solana\idl\nexus_launchpad.json"
    if (Test-Path (Split-Path $backendIdl -Parent)) {
        Copy-Item $idl $backendIdl -Force
        Write-Host "Synced IDL -> Backend" -ForegroundColor Green
    }
}

Write-Host "=== Done ===" -ForegroundColor Green
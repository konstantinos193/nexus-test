# Build nexus-launchpad inside Docker (no local Rust/Solana required)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Docker build: nexus-launchpad ===" -ForegroundColor Cyan
docker compose -f docker-compose.build.yml build --no-cache
docker compose -f docker-compose.build.yml run --rm anchor-build

if (Test-Path "target\deploy\nexus_launchpad.so") {
    $kb = [math]::Round((Get-Item "target\deploy\nexus_launchpad.so").Length / 1KB)
    Write-Host "Built target\deploy\nexus_launchpad.so ($kb KB)" -ForegroundColor Green
}
if (Test-Path "target\idl\nexus_launchpad.json") {
    Write-Host "IDL target\idl\nexus_launchpad.json" -ForegroundColor Green
}
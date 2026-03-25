# Test specific test cases by name pattern
# Usage: 
#   .\scripts\test-specific.ps1 "Mints an NFT successfully"
#   .\scripts\test-specific.ps1 "Mint"
#   .\scripts\test-specific.ps1 "Collection"

param(
    [Parameter(Mandatory=$true)]
    [string]$Pattern
)

Write-Host "Running tests matching pattern: $Pattern" -ForegroundColor Cyan
Write-Host ""

# Build first to ensure IDL is up to date
Write-Host "Building program..." -ForegroundColor Yellow
anchor build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up environment..." -ForegroundColor Yellow

# Set up environment variables that anchor test normally sets
# Based on Anchor.toml: cluster = "localnet", rpc_port = 8900
$env:ANCHOR_PROVIDER_URL = "http://localhost:8900"
$walletPath = "$env:USERPROFILE\.config\solana\id.json"
if (-not (Test-Path $walletPath)) {
    $walletPath = "$env:HOME\.config\solana\id.json"
}
$env:ANCHOR_WALLET = $walletPath

# Check if validator is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8900" -Method Get -TimeoutSec 1 -ErrorAction SilentlyContinue
} catch {
    Write-Host "Warning: Local validator not detected on port 8900" -ForegroundColor Yellow
    Write-Host "Starting anchor test to set up validator and run tests..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Note: anchor test doesn't support filtering. Running all tests." -ForegroundColor Yellow
    anchor test
    exit $LASTEXITCODE
}

Write-Host "Running tests..." -ForegroundColor Yellow

# Run tests with grep pattern
# Using --reporter spec to show output immediately as tests run
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts --grep "$Pattern" --reporter spec

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Tests failed!" -ForegroundColor Red
    exit 1
}

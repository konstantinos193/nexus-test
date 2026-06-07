# Deployment script for nexus-launchpad contract
# Usage: .\deploy.ps1

# Set RPC and wallet
$RPC = "https://rpc.nexus-web3.com"
$WALLET = "4B4eiAqGYpjwFabXJCSki3fuuTjv4NhEcfQ6axTBBJxW1aY4NTGbRPJjtWe7MkTbJbR3prkB9whCUJfGD6fK2yaa"
$PROGRAM_ID = "CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm"

Write-Host "=== Nexus Launchpad Contract Deployment ===" -ForegroundColor Green
Write-Host "RPC: $RPC" -ForegroundColor Yellow
Write-Host "Wallet: $WALLET" -ForegroundColor Yellow
Write-Host "Program ID: $PROGRAM_ID" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build the contract
Write-Host "Step 1: Building contract..." -ForegroundColor Cyan
cd "$PSScriptRoot"
& anchor build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy to the specified RPC
Write-Host "Step 2: Deploying to $RPC..." -ForegroundColor Cyan

$BINARY = "$PSScriptRoot\target\sbpf-solana-solana\release\nexus_launchpad.so"
Write-Host "Binary path: $BINARY" -ForegroundColor Yellow

# Check if binary exists
if (-not (Test-Path $BINARY)) {
    Write-Host "Binary not found at $BINARY" -ForegroundColor Red
    exit 1
}

Write-Host "Binary size: $((Get-Item $BINARY).Length / 1024) KB" -ForegroundColor Yellow

# Deploy using solana program deploy
solana program deploy `
    --url "$RPC" `
    --program-id "$PROGRAM_ID" `
    "$BINARY"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Program: $PROGRAM_ID" -ForegroundColor Green
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green

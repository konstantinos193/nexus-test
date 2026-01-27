# Deploy NeXus Smart Contracts to Devnet (PowerShell)

Write-Host "🚀 Deploying NeXus Smart Contracts to Devnet..." -ForegroundColor Cyan

# Check if Anchor is installed
try {
    $null = Get-Command anchor -ErrorAction Stop
} catch {
    Write-Host "❌ Anchor CLI not found. Please install Anchor first." -ForegroundColor Red
    exit 1
}

# Check if Solana CLI is installed
try {
    $null = Get-Command solana -ErrorAction Stop
} catch {
    Write-Host "❌ Solana CLI not found. Please install Solana CLI first." -ForegroundColor Red
    exit 1
}

# Check network
$config = solana config get
if ($config -notmatch "devnet") {
    Write-Host "⚠️  Warning: Not on devnet." -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

# Build programs
Write-Host "📦 Building programs..." -ForegroundColor Cyan
anchor build

# Deploy programs
Write-Host "🚀 Deploying programs..." -ForegroundColor Cyan

Write-Host "  → Deploying nexus-launchpad..." -ForegroundColor Yellow
anchor deploy --program-name nexus-launchpad --provider.cluster devnet

Write-Host "  → Deploying nexus-payment..." -ForegroundColor Yellow
anchor deploy --program-name nexus-payment --provider.cluster devnet

Write-Host "  → Deploying nexus-collection..." -ForegroundColor Yellow
anchor deploy --program-name nexus-collection --provider.cluster devnet

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update program IDs in Anchor.toml"
Write-Host "2. Update program IDs in Frontend/.env.local"
Write-Host "3. Update program IDs in Backend/.env"
Write-Host "4. Test the contracts with your frontend/backend"

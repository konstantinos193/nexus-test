# Build Solana programs using Docker (PowerShell)

Write-Host "🐳 Building NeXus smart contracts with Docker..." -ForegroundColor Cyan

# Ensure target directory exists
if (-not (Test-Path "target/deploy")) {
    New-Item -ItemType Directory -Path "target/deploy" -Force | Out-Null
}

# Build using Docker
docker-compose -f docker-compose.build.yml up --build

Write-Host "✅ Build complete!" -ForegroundColor Green

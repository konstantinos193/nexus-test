# Start Solana Localnet Validator
Write-Host "🚀 Starting Solana localnet validator..." -ForegroundColor Cyan
Write-Host ""

# Check if validator is already running
$validatorProcess = Get-Process -Name "solana-test-validator" -ErrorAction SilentlyContinue
if ($validatorProcess) {
    Write-Host "⚠️  Validator is already running!" -ForegroundColor Yellow
    Write-Host "   PID: $($validatorProcess.Id)" -ForegroundColor Yellow
    Write-Host "   Stop it first with: Stop-Process -Id $($validatorProcess.Id)" -ForegroundColor Yellow
    exit 1
}

# Start validator
Write-Host "Starting validator on http://localhost:8899..." -ForegroundColor Green
solana-test-validator

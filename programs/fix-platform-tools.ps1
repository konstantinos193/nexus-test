# Fix Platform Tools Installation Issue
# This script helps resolve the "Access is denied" error when installing platform-tools

Write-Host "=== Fixing Solana Platform Tools Installation ===" -ForegroundColor Cyan

# Option 1: Set environment variable to user-writable location
$toolsDir = "$env:USERPROFILE\.cache\solana\v1.52\platform-tools"
Write-Host "`nCreating directory: $toolsDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $toolsDir -Force -ErrorAction SilentlyContinue | Out-Null

# Set environment variable for current session
$env:SOLANA_PLATFORM_TOOLS_DIR = $toolsDir
$env:CARGO_BUILD_SBF_PLATFORM_TOOLS_DIR = $toolsDir

# Set permanently for user
[System.Environment]::SetEnvironmentVariable('SOLANA_PLATFORM_TOOLS_DIR', $toolsDir, 'User')
[System.Environment]::SetEnvironmentVariable('CARGO_BUILD_SBF_PLATFORM_TOOLS_DIR', $toolsDir, 'User')

Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "  SOLANA_PLATFORM_TOOLS_DIR = $toolsDir" -ForegroundColor Gray
Write-Host "  CARGO_BUILD_SBF_PLATFORM_TOOLS_DIR = $toolsDir" -ForegroundColor Gray

# Check if directory is writable
Write-Host "`nTesting write permissions..." -ForegroundColor Yellow
try {
    $testFile = Join-Path $toolsDir "test_write.tmp"
    "test" | Out-File -FilePath $testFile -ErrorAction Stop
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Write-Host "✓ Directory is writable" -ForegroundColor Green
} catch {
    Write-Host "✗ Directory is NOT writable: $_" -ForegroundColor Red
    Write-Host "`nSOLUTION: Run PowerShell as Administrator and try again" -ForegroundColor Yellow
    Write-Host "Or use WSL2 (recommended for Solana development on Windows)" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Close and reopen your terminal (to load new environment variables)" -ForegroundColor White
Write-Host "2. Try: anchor build" -ForegroundColor White
Write-Host "`nIf it still fails, you may need to:" -ForegroundColor Yellow
Write-Host "  - Run PowerShell as Administrator" -ForegroundColor White
Write-Host "  - Or use WSL2: wsl" -ForegroundColor White
Write-Host "  - Or manually download platform-tools from:" -ForegroundColor White
Write-Host "    https://github.com/solana-labs/platform-tools/releases" -ForegroundColor Cyan

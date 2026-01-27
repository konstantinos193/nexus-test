# WSL2 Production Setup Launcher for NeXus Smart Contracts
# This PowerShell script launches WSL2 and runs the setup script
# Run this from Windows PowerShell

Write-Host "NeXus WSL2 Production Setup Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is available
$wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wslAvailable) {
    Write-Host "ERROR: WSL is not installed or not in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "To install WSL2:" -ForegroundColor Yellow
    Write-Host "1. Open PowerShell as Administrator" -ForegroundColor Yellow
    Write-Host "2. Run: wsl --install" -ForegroundColor Yellow
    Write-Host "3. Reboot your computer" -ForegroundColor Yellow
    Write-Host "4. Then run this script again" -ForegroundColor Yellow
    exit 1
}

# Get the script directory and convert to WSL path
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# Convert Windows path to WSL path: E:\path -> /mnt/e/path
if ($scriptDir -match '^([A-Z]):') {
    $driveLetter = $matches[1].ToLower()
    $wslScriptDir = $scriptDir -replace "^[A-Z]:", "/mnt/$driveLetter" -replace '\\', '/'
} else {
    Write-Host "ERROR: Could not parse script directory path." -ForegroundColor Red
    exit 1
}

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "   1. Launch WSL2 (Ubuntu)" -ForegroundColor Gray
Write-Host "   2. Run the automated setup script" -ForegroundColor Gray
Write-Host "   3. Install Rust, Solana CLI, and Anchor" -ForegroundColor Gray
Write-Host "   4. Configure your Solana wallet and network" -ForegroundColor Gray
Write-Host ""
Write-Host "This will take 10-15 minutes (first time only)" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (Y/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "Setup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Launching WSL2 and running setup..." -ForegroundColor Green
Write-Host ""

# Verify the script file exists on Windows side
$windowsScriptPath = Join-Path $scriptDir "wsl2-setup.sh"
if (-not (Test-Path $windowsScriptPath)) {
    Write-Host "ERROR: Setup script not found at: $windowsScriptPath" -ForegroundColor Red
    exit 1
}

# Run the setup script in WSL
# First check if /mnt/e is accessible
Write-Host "Checking WSL mount access..." -ForegroundColor Gray
$mountCheck = wsl sh -c "if [ -d /mnt/e ]; then echo 'Mount OK'; ls -d /mnt/e/* 2>/dev/null | head -3; else echo 'Mount not accessible'; fi"
Write-Host $mountCheck
Write-Host ""

# Try to run the script - if it fails, provide manual instructions
Write-Host "Attempting to run setup script..." -ForegroundColor Green
$wslCmd = "cd '$wslScriptDir'; if [ $? -eq 0 ]; then chmod +x wsl2-setup.sh; sh wsl2-setup.sh; else echo 'ERROR: Could not access directory. Please run manually from WSL:'; echo '  cd $wslScriptDir'; echo '  sh wsl2-setup.sh'; exit 1; fi"
$result = wsl sh -c $wslCmd
$exitCode = $LASTEXITCODE

# If the above failed, provide clear manual instructions
if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host ("=" * 50) -ForegroundColor Yellow
    Write-Host "MANUAL SETUP REQUIRED" -ForegroundColor Yellow
    Write-Host ("=" * 50) -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The script could not be run automatically from PowerShell." -ForegroundColor Yellow
    Write-Host "Please run it manually from WSL:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Open WSL2 (Ubuntu) terminal" -ForegroundColor Cyan
    Write-Host "2. Run:" -ForegroundColor Cyan
    Write-Host "   cd $wslScriptDir" -ForegroundColor White
    Write-Host "   sh wsl2-setup.sh" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "Setup script completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open WSL2 (Ubuntu) terminal" -ForegroundColor Gray
Write-Host "   2. Navigate to: cd /mnt/e/programming/Martech/programs" -ForegroundColor Gray
Write-Host "   3. Build: anchor build" -ForegroundColor Gray
Write-Host "   4. Deploy: anchor deploy --provider.cluster devnet" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use the deployment script: ./scripts/deploy.sh" -ForegroundColor Yellow
Write-Host ""

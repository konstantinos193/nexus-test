# Calculate Solana program deployment costs based on binary sizes
# Run this after anchor build to see deployment cost estimates
#
# DEPLOYMENT BUFFER SIZE:
#   For upgradeable programs: buffer = 2 * program_size + 45 bytes
#   This allows space for future upgrades without reallocation
#
# OPTIMIZATION TIPS:
#   - Use 'anchor build' (default features include no-idl, no-log-ix-name)
#   - For development with logs: 'anchor build -- --features logs'
#   - Clean unused buffer accounts: 'solana program show --buffers' then 'solana program close <addr>'

Write-Host "Calculating Solana Program Deployment Costs..." -ForegroundColor Cyan
Write-Host ""

# Default deploy directory (Anchor's default)
$DEPLOY_DIR = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "target/deploy" }

if (-not (Test-Path $DEPLOY_DIR)) {
    Write-Host "Error: Deploy directory not found: $DEPLOY_DIR" -ForegroundColor Red
    Write-Host "   Run 'anchor build' first, or set DEPLOY_DIR environment variable"
    exit 1
}

# Check if solana CLI is available for accurate rent calculation
$useSolanaCLI = $false
try {
    $null = Get-Command solana -ErrorAction Stop
    $useSolanaCLI = $true
    Write-Host "Using 'solana rent' command for accurate calculations" -ForegroundColor Gray
} catch {
    Write-Host "Note: Install Solana CLI for accurate rent calculations (using estimates)" -ForegroundColor Yellow
}

# Function to get rent for a given size in bytes
function Get-RentCost {
    param([long]$sizeBytes)
    
    if ($useSolanaCLI) {
        try {
            $output = solana rent $sizeBytes 2>&1
            # Parse "Rent-exempt minimum: X.XXXXXX SOL" from output
            if ($output -match "Rent-exempt minimum:\s*([\d.]+)\s*SOL") {
                return [double]$matches[1]
            }
        } catch { }
    }
    
    # Fallback: approximate calculation
    # Formula: (128 + bytes) * 3480 * 2 / 1e9 SOL
    $lamports = (128 + $sizeBytes) * 3480 * 2
    return [math]::Round($lamports / 1000000000, 6)
}

# Program buffer overhead for upgradeable programs: 2x + 45 bytes
$BUFFER_MULTIPLIER = 2
$BUFFER_OVERHEAD = 45

# Find all .so files
$soFiles = Get-ChildItem -Path $DEPLOY_DIR -Filter "*.so" -ErrorAction SilentlyContinue

if ($soFiles.Count -eq 0) {
    Write-Host "Warning: No .so files found in $DEPLOY_DIR" -ForegroundColor Yellow
    exit 1
}

Write-Host "Program Size Analysis:"
Write-Host "================================================================================"
Write-Host ("{0,-30} {1,12} {2,12} {3,15}" -f "Program", "Size (KB)", "Size (bytes)", "Cost (SOL)")
Write-Host "================================================================================"

$totalBytes = 0
$totalBufferBytes = 0
$totalCost = 0
$results = @()

foreach ($soFile in $soFiles) {
    $sizeBytes = $soFile.Length
    $sizeKB = [math]::Round($sizeBytes / 1024, 2)
    
    # For upgradeable programs, buffer = 2x + 45 bytes
    $bufferSize = ($sizeBytes * $BUFFER_MULTIPLIER) + $BUFFER_OVERHEAD
    $cost = Get-RentCost -sizeBytes $bufferSize
    
    $totalBytes += $sizeBytes
    $totalBufferBytes += $bufferSize
    $totalCost += $cost
    
    $results += [PSCustomObject]@{
        Program = $soFile.Name
        SizeKB = $sizeKB
        SizeBytes = $sizeBytes
        BufferBytes = $bufferSize
        Cost = $cost
    }
    
    Write-Host ("{0,-30} {1,12:N2} {2,12:N0} {3,15:N6}" -f $soFile.Name, $sizeKB, $sizeBytes, $cost)
}

Write-Host "================================================================================"

# Calculate totals
$totalKB = [math]::Round($totalBytes / 1024, 2)
$totalBufferKB = [math]::Round($totalBufferBytes / 1024, 2)

Write-Host ("{0,-30} {1,12:N2} {2,12:N0} {3,15:N6}" -f "TOTAL", $totalKB, $totalBytes, $totalCost)
Write-Host "--------------------------------------------------------------------------------"
Write-Host ""
Write-Host "Note: Each program buffer = 2x program size + 45 bytes (for upgradeable programs)" -ForegroundColor Gray
Write-Host "      Total buffer space: $totalBufferKB KB ($totalBufferBytes bytes)" -ForegroundColor Gray
Write-Host ""

# Show in USD (approximate, using $100/SOL as default)
$SOL_PRICE = if ($env:SOL_PRICE) { [double]$env:SOL_PRICE } else { 100.0 }
$totalUSD = [math]::Round($totalCost * $SOL_PRICE, 2)

Write-Host ""
Write-Host "Deployment Cost Summary:" -ForegroundColor Green
Write-Host "   Total rent-exempt:  $([math]::Round($totalCost, 6)) SOL"
Write-Host ""
Write-Host "   At `$$SOL_PRICE/SOL: ~`$$totalUSD USD" -ForegroundColor Yellow
Write-Host ""
Write-Host "Size Summary:" -ForegroundColor Cyan
Write-Host "   Program binaries: $totalKB KB ($([math]::Round($totalBytes)) bytes)"
Write-Host "   Buffer accounts:  $totalBufferKB KB ($totalBufferBytes bytes)"
$avgKB = [math]::Round($totalKB / $soFiles.Count, 2)
Write-Host "   Average per program: $avgKB KB"
Write-Host ""
Write-Host "Optimization Tips:" -ForegroundColor Magenta
Write-Host "   - Build with defaults:    anchor build"
Write-Host "   - Debug build (larger):   anchor build -- --features logs"
Write-Host "   - Generate IDL only:      anchor build -- --no-default-features --features idl-build"
Write-Host "   - Clean failed buffers:   solana program show --buffers"
Write-Host "   - Recover buffer SOL:     solana program close <BUFFER_ADDRESS>"
Write-Host "   - Extend existing prog:   solana program extend <PROGRAM_ID> <BYTES>"

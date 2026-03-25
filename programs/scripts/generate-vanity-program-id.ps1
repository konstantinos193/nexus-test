# Generate a vanity program ID with a custom suffix (like pump.fun does with "pump")
# Usage: .\generate-vanity-program-id.ps1 <suffix> [program-name]
# Example: .\generate-vanity-program-id.ps1 nexus nexus_collection
# Note: Use your own unique suffix, not "pump" (that's already taken by pump.fun)

param(
    [Parameter(Mandatory=$true)]
    [string]$Suffix,
    
    [Parameter(Mandatory=$false)]
    [string]$ProgramName = ""
)

# Convert suffix to lowercase for consistency
$SuffixLower = $Suffix.ToLower()

Write-Host "🔍 Generating vanity program ID ending with: '$SuffixLower'" -ForegroundColor Cyan
Write-Host "   This may take a while depending on suffix length..." -ForegroundColor Yellow
Write-Host ""

# Create keypairs directory if it doesn't exist
$KeypairsDir = "keypairs"
if (-not (Test-Path $KeypairsDir)) {
    New-Item -ItemType Directory -Path $KeypairsDir | Out-Null
}

# Generate vanity keypair
$KeypairFile = if ($ProgramName) {
    "$KeypairsDir/${ProgramName}_${SuffixLower}.json"
} else {
    "$KeypairsDir/program_${SuffixLower}.json"
}

Write-Host "⏳ Grinding for vanity address (this can take minutes to hours)..." -ForegroundColor Yellow
Write-Host "   Using: solana-keygen grind --ends-with $SuffixLower:1" -ForegroundColor Gray

# Generate the vanity keypair
$grindResult = & solana-keygen grind --ends-with "$SuffixLower:1" --outfile $KeypairFile 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generating vanity keypair" -ForegroundColor Red
    Write-Host $grindResult
    exit 1
}

# Extract the public key (program ID)
$ProgramId = & solana-keygen pubkey $KeypairFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error extracting public key" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Vanity program ID generated!" -ForegroundColor Green
Write-Host "   Program ID: $ProgramId" -ForegroundColor Cyan
Write-Host "   Keypair saved to: $KeypairFile" -ForegroundColor Cyan
Write-Host ""

# If program name is provided, update Anchor.toml and the program file
if ($ProgramName) {
    Write-Host "📝 Updating configuration files..." -ForegroundColor Yellow
    
    # Convert program name to match Anchor.toml format (nexus_collection -> nexus-collection)
    $ProgramDirName = $ProgramName -replace '_', '-'
    $ProgramFile = "programs\$ProgramDirName\src\lib.rs"
    
    if (-not (Test-Path $ProgramFile)) {
        Write-Host "⚠️  Warning: Program file not found at $ProgramFile" -ForegroundColor Yellow
        Write-Host "   Skipping program file update." -ForegroundColor Yellow
    } else {
        # Update declare_id! in the program file
        $content = Get-Content $ProgramFile -Raw
        $content = $content -replace 'declare_id!\("[^"]*"\);', "declare_id!(`"$ProgramId`");"
        Set-Content $ProgramFile -Value $content -NoNewline
        Write-Host "   ✅ Updated $ProgramFile" -ForegroundColor Green
    }
    
    # Update Anchor.toml
    if (Test-Path "Anchor.toml") {
        $anchorContent = Get-Content "Anchor.toml" -Raw
        
        # Update for localnet
        if ($anchorContent -match '\[programs\.localnet\]') {
            $pattern = "($ProgramName = `")[^`"]*(`")"
            if ($anchorContent -match $pattern) {
                $anchorContent = $anchorContent -replace $pattern, "`$1$ProgramId`$2"
            } else {
                # Add it under [programs.localnet]
                $anchorContent = $anchorContent -replace '(\[programs\.localnet\])', "`$1`r`n$ProgramName = `"$ProgramId`""
            }
        }
        
        # Update for devnet
        if ($anchorContent -match '\[programs\.devnet\]') {
            $pattern = "($ProgramName = `")[^`"]*(`")"
            if ($anchorContent -match $pattern) {
                $anchorContent = $anchorContent -replace $pattern, "`$1$ProgramId`$2"
            } else {
                # Add it under [programs.devnet]
                $anchorContent = $anchorContent -replace '(\[programs\.devnet\])', "`$1`r`n$ProgramName = `"$ProgramId`""
            }
        }
        
        Set-Content "Anchor.toml" -Value $anchorContent -NoNewline
        Write-Host "   ✅ Updated Anchor.toml" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: Anchor.toml not found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🎉 Done! Your program ID has been updated." -ForegroundColor Green
    Write-Host "   Remember to:" -ForegroundColor Yellow
    Write-Host "   1. Keep the keypair file safe: $KeypairFile" -ForegroundColor Gray
    Write-Host "   2. Rebuild your program: anchor build" -ForegroundColor Gray
    Write-Host "   3. Deploy with the new keypair: anchor deploy --program-keypair $KeypairFile" -ForegroundColor Gray
} else {
    Write-Host "💡 Tip: Run with a program name to auto-update configuration:" -ForegroundColor Yellow
    Write-Host "   .\generate-vanity-program-id.ps1 $Suffix <program-name>" -ForegroundColor Gray
}

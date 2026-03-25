# Strip Solana program binaries to minimize size
# Run this after anchor build to strip debug symbols from .so files

Write-Host "🔧 Stripping Solana program binaries..." -ForegroundColor Cyan

# Find llvm-strip or fallback to strip
$STRIP_CMD = $null
if (Get-Command llvm-strip -ErrorAction SilentlyContinue) {
    $STRIP_CMD = "llvm-strip"
    Write-Host "Using llvm-strip"
} elseif (Get-Command strip -ErrorAction SilentlyContinue) {
    $STRIP_CMD = "strip"
    Write-Host "Using strip (llvm-strip not found)"
} else {
    Write-Host "❌ Error: Neither llvm-strip nor strip found. Please install LLVM tools." -ForegroundColor Red
    exit 1
}

# Default deploy directory (Anchor's default)
$DEPLOY_DIR = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "target/deploy" }

if (-not (Test-Path $DEPLOY_DIR)) {
    Write-Host "⚠️  Warning: Deploy directory not found: $DEPLOY_DIR" -ForegroundColor Yellow
    Write-Host "   Run 'anchor build' first, or set DEPLOY_DIR environment variable"
    exit 1
}

# Strip all .so files in deploy directory
$STRIPPED = 0
$soFiles = Get-ChildItem -Path $DEPLOY_DIR -Filter "*.so" -ErrorAction SilentlyContinue

if ($soFiles.Count -eq 0) {
    Write-Host "⚠️  No .so files found in $DEPLOY_DIR" -ForegroundColor Yellow
    exit 1
}

foreach ($soFile in $soFiles) {
    Write-Host "Stripping: $($soFile.Name)"
    
    try {
        $sizeBefore = (Get-Item $soFile.FullName).Length
        
        # Use llvm-strip -s or strip -s
        if ($STRIP_CMD -eq "llvm-strip") {
            & llvm-strip -s $soFile.FullName
        } else {
            & strip -s $soFile.FullName
        }
        
        if ($LASTEXITCODE -eq 0) {
            $sizeAfter = (Get-Item $soFile.FullName).Length
            $reduction = $sizeBefore - $sizeAfter
            $reductionPercent = [math]::Round(($reduction / $sizeBefore) * 100, 2)
            
            Write-Host "  Size: $([math]::Round($sizeAfter / 1KB, 2)) KB (reduced by $([math]::Round($reduction / 1KB, 2)) KB, $reductionPercent%)" -ForegroundColor Green
            $STRIPPED++
        } else {
            Write-Host "  ⚠️  Warning: Failed to strip $($soFile.Name)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Error stripping $($soFile.Name): $_" -ForegroundColor Yellow
    }
}

Write-Host "✅ Stripped $STRIPPED binary file(s)" -ForegroundColor Green
Write-Host "   Deploy directory: $DEPLOY_DIR"

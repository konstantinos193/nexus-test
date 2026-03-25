# Download all images from placehold.co (PowerShell)
# This script downloads images for IPFS upload

$SUPPLY = 1500
$IMAGE_SIZE = 500
$FORMAT = "png"
$COLORS = @("FF6B6B", "4ECDC4", "45B7D1", "FFA07A", "98D8C8", "F7DC6F", "BB8FCE", "85C1E2", "F8B739", "52BE80", "E74C3C", "3498DB", "9B59B6", "1ABC9C", "F39C12", "34495E", "E67E22", "16A085", "27AE60", "2980B9")

Write-Host "Downloading $SUPPLY images..."

for ($i = 0; $i -lt $SUPPLY; $i++) {
    $colorIndex = $i % $COLORS.Length
    $bgColor = $COLORS[$colorIndex]
    $textColor = "FFFFFF"
    $text = "NFT%20%23$i"
    
    $url = "https://placehold.co/500x500/$bgColor/$textColor/$FORMAT`?text=$text"
    $outputPath = "images\$i.$FORMAT"
    
    Invoke-WebRequest -Uri $url -OutFile $outputPath
    
    if ($i % 100 -eq 0) {
        Write-Host "Downloaded $i/$SUPPLY images..."
    }
}

Write-Host "✅ All images downloaded!"

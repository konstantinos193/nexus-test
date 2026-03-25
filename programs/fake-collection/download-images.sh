#!/bin/bash
# Download all images from placehold.co
# This script downloads images for IPFS upload

SUPPLY=1500
IMAGE_SIZE=500
FORMAT=png
COLORS=(FF6B6B 4ECDC4 45B7D1 FFA07A 98D8C8 F7DC6F BB8FCE 85C1E2 F8B739 52BE80 E74C3C 3498DB 9B59B6 1ABC9C F39C12 34495E E67E22 16A085 27AE60 2980B9)

echo "Downloading 1500 images..."

for i in $(seq 0 $((SUPPLY - 1))); do
  COLOR_INDEX=$((i % 20))
  BG_COLOR=${COLORS[$COLOR_INDEX]}
  TEXT_COLOR="FFFFFF"
  TEXT="NFT%20%23$i"
  
  URL="https://placehold.co/500x500/${BG_COLOR}/${TEXT_COLOR}/png?text=${TEXT}"
  
  curl -o "images/$i.png" "${URL}"
  
  if [ $((i % 100)) -eq 0 ]; then
    echo "Downloaded $i/1500 images..."
  fi
done

echo "✅ All images downloaded!"

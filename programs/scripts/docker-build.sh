#!/bin/bash

# Build Solana programs using Docker

set -e

echo "🐳 Building NeXus smart contracts with Docker..."

# Ensure target directory exists
mkdir -p target/deploy

# Build using Docker
docker-compose -f docker-compose.build.yml up --build

echo "✅ Build complete!"

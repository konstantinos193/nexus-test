#!/bin/bash

# Strip Solana program binaries to minimize size
# Run this after anchor build to strip debug symbols from .so files

set -e

echo "🔧 Stripping Solana program binaries..."

# Find llvm-strip or fallback to strip
STRIP_CMD=""
if command -v llvm-strip &> /dev/null; then
    STRIP_CMD="llvm-strip"
    echo "Using llvm-strip"
elif command -v strip &> /dev/null; then
    STRIP_CMD="strip"
    echo "Using strip (llvm-strip not found)"
else
    echo "❌ Error: Neither llvm-strip nor strip found. Please install LLVM tools."
    exit 1
fi

# Default deploy directory (Anchor's default)
DEPLOY_DIR="${DEPLOY_DIR:-target/deploy}"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "⚠️  Warning: Deploy directory not found: $DEPLOY_DIR"
    echo "   Run 'anchor build' first, or set DEPLOY_DIR environment variable"
    exit 1
fi

# Strip all .so files in deploy directory
STRIPPED=0
for so_file in "$DEPLOY_DIR"/*.so; do
    if [ -f "$so_file" ]; then
        echo "Stripping: $(basename "$so_file")"
        "$STRIP_CMD" -s "$so_file" || {
            echo "⚠️  Warning: Failed to strip $(basename "$so_file")"
            continue
        }
        STRIPPED=$((STRIPPED + 1))
        
        # Show size reduction
        if command -v ls &> /dev/null; then
            SIZE=$(ls -lh "$so_file" | awk '{print $5}')
            echo "  Size: $SIZE"
        fi
    fi
done

if [ $STRIPPED -eq 0 ]; then
    echo "⚠️  No .so files found in $DEPLOY_DIR"
    exit 1
fi

echo "✅ Stripped $STRIPPED binary file(s)"
echo "   Deploy directory: $DEPLOY_DIR"

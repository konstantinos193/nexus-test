#!/bin/bash

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

set -e

echo "Calculating Solana Program Deployment Costs..."
echo ""

# Default deploy directory (Anchor's default)
DEPLOY_DIR="${DEPLOY_DIR:-target/deploy}"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: Deploy directory not found: $DEPLOY_DIR"
    echo "   Run 'anchor build' first, or set DEPLOY_DIR environment variable"
    exit 1
fi

# Check if solana CLI is available
USE_SOLANA_CLI=false
if command -v solana &> /dev/null; then
    USE_SOLANA_CLI=true
    echo "Using 'solana rent' command for accurate calculations"
else
    echo "Note: Install Solana CLI for accurate rent calculations (using estimates)"
fi

# Function to get rent for a given size in bytes
get_rent_cost() {
    local size_bytes=$1
    
    if [ "$USE_SOLANA_CLI" = true ]; then
        # Parse "Rent-exempt minimum: X.XXXXXX SOL" from solana rent output
        local rent_output=$(solana rent $size_bytes 2>&1)
        local cost=$(echo "$rent_output" | grep -oP 'Rent-exempt minimum:\s*\K[\d.]+' || echo "")
        if [ -n "$cost" ]; then
            echo "$cost"
            return
        fi
    fi
    
    # Fallback: approximate calculation
    # Formula: (128 + bytes) * 3480 * 2 / 1e9 SOL
    local lamports=$(echo "($size_bytes + 128) * 3480 * 2" | bc)
    echo "scale=6; $lamports / 1000000000" | bc
}

# Program buffer overhead for upgradeable programs: 2x + 45 bytes
BUFFER_MULTIPLIER=2
BUFFER_OVERHEAD=45

# Find all .so files
so_files=$(find "$DEPLOY_DIR" -name "*.so" -type f 2>/dev/null)

if [ -z "$so_files" ]; then
    echo "Warning: No .so files found in $DEPLOY_DIR"
    exit 1
fi

echo ""
echo "Program Size Analysis:"
echo "================================================================================"
printf "%-30s %12s %12s %15s\n" "Program" "Size (KB)" "Size (bytes)" "Cost (SOL)"
echo "================================================================================"

total_bytes=0
total_buffer_bytes=0
total_cost=0

for so_file in $so_files; do
    if [ -f "$so_file" ]; then
        filename=$(basename "$so_file")
        size_bytes=$(stat -f%z "$so_file" 2>/dev/null || stat -c%s "$so_file" 2>/dev/null || echo "0")
        size_kb=$(echo "scale=2; $size_bytes / 1024" | bc)
        
        # For upgradeable programs, buffer = 2x + 45 bytes
        buffer_size=$(echo "$size_bytes * $BUFFER_MULTIPLIER + $BUFFER_OVERHEAD" | bc)
        cost=$(get_rent_cost $buffer_size)
        
        total_bytes=$((total_bytes + size_bytes))
        total_buffer_bytes=$((total_buffer_bytes + buffer_size))
        total_cost=$(echo "scale=6; $total_cost + $cost" | bc)
        
        printf "%-30s %12.2f %12s %15.6f\n" "$filename" "$size_kb" "$size_bytes" "$cost"
    fi
done

echo "================================================================================"

# Calculate totals
total_kb=$(echo "scale=2; $total_bytes / 1024" | bc)
total_buffer_kb=$(echo "scale=2; $total_buffer_bytes / 1024" | bc)

printf "%-30s %12.2f %12s %15.6f\n" "TOTAL" "$total_kb" "$total_bytes" "$total_cost"
echo "--------------------------------------------------------------------------------"
echo ""
echo "Note: Each program buffer = 2x program size + 45 bytes (for upgradeable programs)"
echo "      Total buffer space: $total_buffer_kb KB ($total_buffer_bytes bytes)"
echo ""

# Show in USD (approximate, using $100/SOL as default)
SOL_PRICE=${SOL_PRICE:-100}
total_usd=$(echo "scale=2; $total_cost * $SOL_PRICE" | bc)

echo ""
echo "Deployment Cost Summary:"
echo "   Total rent-exempt:  $(printf "%.6f" $total_cost) SOL"
echo ""
echo "   At \$$SOL_PRICE/SOL: ~\$$total_usd USD"
echo ""
echo "Size Summary:"
echo "   Program binaries: $(printf "%.2f" $total_kb) KB ($(printf "%.0f" $total_bytes) bytes)"
echo "   Buffer accounts:  $(printf "%.2f" $total_buffer_kb) KB ($total_buffer_bytes bytes)"
program_count=$(echo "$so_files" | wc -l | tr -d ' ')
echo "   Average per program: $(echo "scale=2; $total_kb / $program_count" | bc) KB"
echo ""
echo "Optimization Tips:"
echo "   - Build with defaults:    anchor build"
echo "   - Debug build (larger):   anchor build -- --features logs"
echo "   - Generate IDL only:      anchor build -- --no-default-features --features idl-build"
echo "   - Clean failed buffers:   solana program show --buffers"
echo "   - Recover buffer SOL:     solana program close <BUFFER_ADDRESS>"
echo "   - Extend existing prog:   solana program extend <PROGRAM_ID> <BYTES>"

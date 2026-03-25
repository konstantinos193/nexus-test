#!/bin/bash
# Generate a vanity program ID with a custom suffix (like pump.fun does with "pump")
# Usage: ./generate-vanity-program-id.sh <suffix> [program-name]
# Example: ./generate-vanity-program-id.sh nexus nexus_collection
# Note: Use your own unique suffix, not "pump" (that's already taken by pump.fun)

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <suffix> [program-name]"
    echo "Example: $0 nexus nexus_collection"
    echo ""
    echo "This will generate a program ID ending with the specified suffix."
    echo "If program-name is provided, it will update Anchor.toml and the program's declare_id! macro."
    echo ""
    echo "⚠️  Use your own unique suffix (e.g., 'nexus', 'martech') - don't use 'pump' (that's pump.fun's suffix)"
    exit 1
fi

SUFFIX="$1"
PROGRAM_NAME="${2:-}"

# Convert suffix to lowercase for consistency
SUFFIX_LOWER=$(echo "$SUFFIX" | tr '[:upper:]' '[:lower:]')

echo "🔍 Generating vanity program ID ending with: '$SUFFIX_LOWER'"
echo "   This may take a while depending on suffix length..."
echo ""

# Create keypairs directory if it doesn't exist
KEYPAIRS_DIR="keypairs"
mkdir -p "$KEYPAIRS_DIR"

# Generate vanity keypair
KEYPAIR_FILE="$KEYPAIRS_DIR/${PROGRAM_NAME:-program}_${SUFFIX_LOWER}.json"

echo "⏳ Grinding for vanity address (this can take minutes to hours)..."
echo "   Using: solana-keygen grind --ends-with $SUFFIX_LOWER:1"

# Change to keypairs directory so the generated file is saved there
cd "$KEYPAIRS_DIR"

# Generate the vanity keypair (it will save automatically to current directory)
# Capture output to find the generated filename
GRIND_OUTPUT=$(solana-keygen grind --ends-with "$SUFFIX_LOWER:1" 2>&1)

# Extract the generated filename from output (format: "Wrote keypair to <filename>.json")
# Use sed for portability (works on both GNU and BSD sed)
GENERATED_FILE=$(echo "$GRIND_OUTPUT" | sed -n 's/.*Wrote keypair to \([^ ]*\)\.json.*/\1.json/p' | head -1)

# Change back to original directory
cd - > /dev/null

# If we found the generated file, rename it to our desired name
if [ -n "$GENERATED_FILE" ] && [ -f "$KEYPAIRS_DIR/$GENERATED_FILE" ]; then
    mv "$KEYPAIRS_DIR/$GENERATED_FILE" "$KEYPAIR_FILE"
else
    # Fallback: find the most recently created .json file in keypairs directory
    GENERATED_FILE=$(ls -t "$KEYPAIRS_DIR"/*.json 2>/dev/null | head -1)
    if [ -n "$GENERATED_FILE" ]; then
        mv "$GENERATED_FILE" "$KEYPAIR_FILE"
    else
        echo "❌ Error: Could not find generated keypair file"
        echo "   Grind output:"
        echo "$GRIND_OUTPUT"
        exit 1
    fi
fi

# Extract the public key (program ID)
PROGRAM_ID=$(solana-keygen pubkey "$KEYPAIR_FILE")

echo ""
echo "✅ Vanity program ID generated!"
echo "   Program ID: $PROGRAM_ID"
echo "   Keypair saved to: $KEYPAIR_FILE"
echo ""

# If program name is provided, update Anchor.toml and the program file
if [ -n "$PROGRAM_NAME" ]; then
    echo "📝 Updating configuration files..."
    
    # Convert program name to match Anchor.toml format (nexus_collection -> nexus-collection)
    PROGRAM_DIR_NAME=$(echo "$PROGRAM_NAME" | tr '_' '-')
    PROGRAM_FILE="programs/$PROGRAM_DIR_NAME/src/lib.rs"
    
    if [ ! -f "$PROGRAM_FILE" ]; then
        echo "⚠️  Warning: Program file not found at $PROGRAM_FILE"
        echo "   Skipping program file update."
    else
        # Update declare_id! in the program file
        # Find the declare_id! line and replace it
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/declare_id!(\"[^\"]*\");/declare_id!(\"$PROGRAM_ID\");/" "$PROGRAM_FILE"
        else
            # Linux
            sed -i "s/declare_id!(\"[^\"]*\");/declare_id!(\"$PROGRAM_ID\");/" "$PROGRAM_FILE"
        fi
        echo "   ✅ Updated $PROGRAM_FILE"
    fi
    
    # Update Anchor.toml
    if [ -f "Anchor.toml" ]; then
        # Update for localnet
        if grep -q "\[programs.localnet\]" Anchor.toml; then
            if grep -q "^$PROGRAM_NAME = " Anchor.toml; then
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/^$PROGRAM_NAME = \".*\"/$PROGRAM_NAME = \"$PROGRAM_ID\"/" Anchor.toml
                else
                    sed -i "s/^$PROGRAM_NAME = \".*\"/$PROGRAM_NAME = \"$PROGRAM_ID\"/" Anchor.toml
                fi
            else
                # Add it under [programs.localnet]
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "/\[programs.localnet\]/a\\
$PROGRAM_NAME = \"$PROGRAM_ID\"
" Anchor.toml
                else
                    sed -i "/\[programs.localnet\]/a $PROGRAM_NAME = \"$PROGRAM_ID\"" Anchor.toml
                fi
            fi
        fi
        
        # Update for devnet
        if grep -q "\[programs.devnet\]" Anchor.toml; then
            if grep -q "^$PROGRAM_NAME = " Anchor.toml; then
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/^$PROGRAM_NAME = \".*\"/$PROGRAM_NAME = \"$PROGRAM_ID\"/" Anchor.toml
                else
                    sed -i "s/^$PROGRAM_NAME = \".*\"/$PROGRAM_NAME = \"$PROGRAM_ID\"/" Anchor.toml
                fi
            else
                # Add it under [programs.devnet]
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "/\[programs.devnet\]/a\\
$PROGRAM_NAME = \"$PROGRAM_ID\"
" Anchor.toml
                else
                    sed -i "/\[programs.devnet\]/a $PROGRAM_NAME = \"$PROGRAM_ID\"" Anchor.toml
                fi
            fi
        fi
        
        echo "   ✅ Updated Anchor.toml"
    else
        echo "⚠️  Warning: Anchor.toml not found"
    fi
    
    echo ""
    echo "🎉 Done! Your program ID has been updated."
    echo "   Remember to:"
    echo "   1. Keep the keypair file safe: $KEYPAIR_FILE"
    echo "   2. Rebuild your program: anchor build"
    echo "   3. Deploy with the new keypair: anchor deploy --program-keypair $KEYPAIR_FILE"
else
    echo "💡 Tip: Run with a program name to auto-update configuration:"
    echo "   $0 $SUFFIX <program-name>"
fi

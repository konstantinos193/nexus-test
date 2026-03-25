#!/bin/bash
# Test specific test cases by name pattern
# Usage: 
#   ./scripts/test-specific.sh "Mints an NFT successfully"
#   ./scripts/test-specific.sh "Mint"
#   ./scripts/test-specific.sh "Collection"

if [ -z "$1" ]; then
    echo "Usage: $0 <test-pattern>"
    echo "Example: $0 'Mints an NFT successfully'"
    exit 1
fi

PATTERN="$1"

echo "Running tests matching pattern: $PATTERN"
echo ""

# Build first to ensure IDL is up to date
echo "Building program..."
anchor build
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "Setting up test environment..."

# Source the setup script to start validator and deploy if needed
source ./scripts/setup-test-env.sh

echo "Running filtered tests..."
echo ""

# Run tests with grep pattern
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts --grep "$PATTERN"

if [ $? -eq 0 ]; then
    echo ""
    echo "Tests passed!"
else
    echo ""
    echo "Tests failed!"
    exit 1
fi

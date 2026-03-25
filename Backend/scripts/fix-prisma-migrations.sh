#!/bin/sh
# Fix Prisma Migration Issues
# This script helps resolve common Prisma migration problems

set -e

echo "🔧 Fixing Prisma migration issues..."

# Step 1: Clear Prisma cache
echo "📦 Clearing Prisma cache..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
rm -rf .prisma

# Step 2: Validate schema
echo "✅ Validating Prisma schema..."
npx prisma validate || {
    echo "❌ Schema validation failed. Please fix schema errors first."
    exit 1
}

# Step 3: Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma client. Check your schema."
    exit 1
}

# Step 4: Check migration status
echo "📊 Checking migration status..."
npx prisma migrate status || {
    echo "⚠️  Migration status check failed. Attempting to fix..."
    
    # Try to reset migrations if in development
    if [ "$NODE_ENV" != "production" ]; then
        echo "🔄 Resetting migrations (development mode)..."
        npx prisma migrate reset --force --skip-seed || {
            echo "❌ Migration reset failed."
            exit 1
        }
    else
        echo "❌ Cannot reset migrations in production. Please fix manually."
        exit 1
    fi
}

# Step 5: Apply migrations
echo "🚀 Applying migrations..."
if [ "$NODE_ENV" = "production" ]; then
    npx prisma migrate deploy
else
    npx prisma migrate dev --name fix_migrations
fi

echo "✅ Prisma migrations fixed successfully!"

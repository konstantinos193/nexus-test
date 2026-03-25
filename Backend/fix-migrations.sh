#!/bin/sh
# Fix failed migrations script
# This script resolves failed migrations and applies pending ones

echo "Resolving failed migration: 20260127041736_clean_collection_slugs"
npx prisma migrate resolve --rolled-back 20260127041736_clean_collection_slugs 2>/dev/null || echo "Migration already resolved or doesn't exist"

echo "Applying pending migrations..."
npx prisma migrate deploy

echo "Migration fix complete!"

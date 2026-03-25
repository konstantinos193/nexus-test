/**
 * Delete all collections script
 * Because sometimes you need to start fresh (and databases need spring cleaning too)
 * 
 * Run with: npx ts-node prisma/delete-collections.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Starting collection deletion...');
  console.log('Because sometimes you need to burn it all down and start again');

  const count = await prisma.collection.count();
  console.log(`📊 Found ${count} collections to delete`);

  if (count === 0) {
    console.log('✅ No collections to delete. Database is already clean!');
    return;
  }

  const result = await prisma.collection.deleteMany({});
  console.log(`✅ Deleted ${result.count} collections`);
  console.log('🎉 All collections have been removed!');
}

main()
  .catch((e) => {
    console.error('💥 Deletion failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

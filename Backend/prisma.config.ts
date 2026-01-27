/**
 * Prisma 7 config – datasource URL lives here now, not in schema.
 * Migrate uses this for connection; PrismaClient still reads DATABASE_URL at runtime.
 */
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})

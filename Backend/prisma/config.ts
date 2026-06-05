import { PrismaConfig } from '@prisma/client'

const config: PrismaConfig = {
  datasources: {
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL,
    },
  },
}

export default config

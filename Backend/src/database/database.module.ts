import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Collection } from './entities/collection.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required but not found in environment variables');
        }

        // Parse DATABASE_URL (postgresql://user:password@host:port/database?schema=public)
        const url = new URL(databaseUrl);
        const database = url.pathname.slice(1); // Remove leading '/'
        const schema = url.searchParams.get('schema') || 'public';

        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          username: url.username,
          password: url.password,
          database: database,
          schema: schema,
          entities: [Collection],
          synchronize: false, // Use migrations in production
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Collection]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Collection, CollectionStatus } from '../database/entities/collection.entity';
import { computeEffectiveStatus } from '../collections/collections.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AdminUpdateCollectionDto } from './dto/admin-update-collection.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    private readonly dataSource: DataSource,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const result = await this.dataSource.query(`
      SELECT
        COUNT(*)::int                                                          AS "totalCollections",
        COUNT(*) FILTER (WHERE "effectiveStatus" = 'minting')::int            AS "activeCollections",
        COALESCE(SUM(minted), 0)::int                                         AS "totalMinted",
        COUNT(DISTINCT "creatorAddress")::int                                  AS "uniqueCreators",
        COUNT(*) FILTER (WHERE featured = true)::int                          AS "featuredCount",
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int  AS "newLast7Days"
      FROM collection
      WHERE "deletedAt" IS NULL
    `);
    return result[0];
  }

  async getCreators(): Promise<Array<{
    creatorAddress: string;
    displayName: string;
    collectionCount: number;
    totalMinted: number;
    lastActivityAt: string;
  }>> {
    return this.dataSource.query(`
      SELECT
        "creatorAddress",
        creator AS "displayName",
        COUNT(*)::int     AS "collectionCount",
        COALESCE(SUM(minted), 0)::int AS "totalMinted",
        MAX("createdAt")  AS "lastActivityAt"
      FROM collection
      WHERE "deletedAt" IS NULL
      GROUP BY "creatorAddress", creator
      ORDER BY "totalMinted" DESC
    `);
  }

  async updateCollection(id: string, dto: AdminUpdateCollectionDto): Promise<void> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }

    const updates: Partial<Collection> = {};

    if (dto.featured !== undefined) {
      updates.featured = dto.featured;
    }

    if (dto.status !== undefined) {
      updates.status = dto.status;
      updates.effectiveStatus = computeEffectiveStatus(dto.status, collection.phases ?? []);
    }

    if (Object.keys(updates).length > 0) {
      await this.collectionRepository.update(id, updates);
    }
  }

  async deleteCollection(id: string): Promise<void> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
    await this.collectionRepository.softDelete(id);
  }
}

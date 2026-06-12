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
import { AuditService } from '../audit/audit.service';
import { AuthedAdmin } from '../auth/decorators/current-user.decorator';
import { PLATFORM_FEE_BPS } from '../solana/constants';

// Per-collection fee bps falls back to the platform default when a row didn't store its own.
const DEFAULT_FEE_BPS = Number(PLATFORM_FEE_BPS) || 100;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    // NOTE: the table is "Collection" (quoted PascalCase). Unquoted `collection` does not
    // exist — the previous code's `FROM collection` was a latent bug, fixed here.
    const result = await this.dataSource.query(
      `
      SELECT
        COUNT(*)::int                                                          AS "totalCollections",
        COUNT(*) FILTER (WHERE "effectiveStatus" = 'minting')::int            AS "activeCollections",
        COALESCE(SUM(minted), 0)::int                                         AS "totalMinted",
        COUNT(DISTINCT "creatorAddress")::int                                  AS "uniqueCreators",
        COUNT(*) FILTER (WHERE featured = true)::int                          AS "featuredCount",
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int  AS "newLast7Days",
        COALESCE(SUM(
          CASE WHEN price IS NOT NULL AND price > 0
            THEN minted * price * COALESCE("platformFeeBasisPoints", $1) / 10000.0
            ELSE 0 END
        ), 0)::float8                                                         AS "totalFeeRevenue"
      FROM "Collection"
      WHERE "deletedAt" IS NULL
      `,
      [DEFAULT_FEE_BPS],
    );
    return result[0];
  }

  async getCreators(): Promise<Array<{
    creatorAddress: string;
    displayName: string;
    collectionCount: number;
    totalMinted: number;
    feeRevenue: number;
    lastActivityAt: string;
  }>> {
    return this.dataSource.query(
      `
      SELECT
        "creatorAddress",
        creator AS "displayName",
        COUNT(*)::int                AS "collectionCount",
        COALESCE(SUM(minted), 0)::int AS "totalMinted",
        COALESCE(SUM(
          CASE WHEN price IS NOT NULL AND price > 0
            THEN minted * price * COALESCE("platformFeeBasisPoints", $1) / 10000.0
            ELSE 0 END
        ), 0)::float8                 AS "feeRevenue",
        MAX("createdAt")             AS "lastActivityAt"
      FROM "Collection"
      WHERE "deletedAt" IS NULL
      GROUP BY "creatorAddress", creator
      ORDER BY "totalMinted" DESC
      `,
      [DEFAULT_FEE_BPS],
    );
  }

  async updateCollection(
    id: string,
    dto: AdminUpdateCollectionDto,
    actor: AuthedAdmin,
    ip?: string,
  ): Promise<void> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }

    const updates: Partial<Collection> = {};

    if (dto.featured !== undefined) {
      updates.featured = dto.featured;
      // Unfeaturing clears the curated order so stale ranks don't resurface later.
      if (dto.featured === false) (updates as any).featuredRank = null;
    }

    if (dto.featuredRank !== undefined) {
      updates.featuredRank = dto.featuredRank;
      updates.featured = true; // Ranking only makes sense for featured collections.
    }

    if (dto.status !== undefined) {
      updates.status = dto.status;
      updates.effectiveStatus = computeEffectiveStatus(dto.status, collection.phases ?? []);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedBy = actor.email;
      await this.collectionRepository.update(id, updates);
    }

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'collection.update',
      targetType: 'collection',
      targetId: id,
      metadata: { featured: dto.featured, status: dto.status, featuredRank: dto.featuredRank },
      ip,
    });
  }

  /** Assign featuredRank by position and ensure each listed collection is featured. */
  async reorderFeatured(orderedIds: string[], actor: AuthedAdmin, ip?: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await manager.update(Collection, orderedIds[i], {
          featuredRank: i,
          featured: true,
          updatedBy: actor.email,
        });
      }
    });
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'collection.featured_reorder',
      targetType: 'collection',
      metadata: { orderedIds },
      ip,
    });
  }

  async deleteCollection(id: string, actor: AuthedAdmin, ip?: string): Promise<void> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
    await this.collectionRepository.softDelete(id);
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'collection.delete',
      targetType: 'collection',
      targetId: id,
      metadata: { name: collection.name, slug: collection.slug },
      ip,
    });
  }

  /** Undo a soft delete. */
  async restoreCollection(id: string, actor: AuthedAdmin, ip?: string): Promise<void> {
    const res = await this.collectionRepository.restore(id);
    if (!res.affected) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'collection.restore',
      targetType: 'collection',
      targetId: id,
      ip,
    });
  }
}

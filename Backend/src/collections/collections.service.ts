import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NFTCollection } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async findFeatured(): Promise<NFTCollection[]> {
    // Get featured collections, prefer minting status
    const collections = await this.prisma.collection.findMany({
      where: {
        featured: true,
      },
      orderBy: [
        { status: 'asc' }, // 'minting' comes before others alphabetically
        { minted: 'desc' },
      ],
      take: 10,
    });
    // Convert dates to ISO strings
    return collections.map(this.formatCollection);
  }

  async findByTab(tab: string): Promise<NFTCollection[]> {
    const now = new Date();
    let collections;

    switch (tab) {
      case 'trending':
        collections = await this.prisma.collection.findMany({
          orderBy: { minted: 'desc' },
          take: 6,
        });
        break;

      case 'new':
        collections = await this.prisma.collection.findMany({
          orderBy: { createdAt: 'desc' },
          take: 6,
        });
        break;

      case 'ending_soon':
        collections = await this.prisma.collection.findMany({
          where: {
            endDate: {
              not: null,
              gte: now,
            },
          },
          orderBy: { endDate: 'asc' },
          take: 6,
        });
        break;

      case 'free_mint':
        collections = await this.prisma.collection.findMany({
          where: {
            OR: [{ price: 0 }, { price: null }],
          },
          take: 6,
        });
        break;

      default:
        return this.findByTab('trending');
    }

    return collections.map(this.formatCollection);
  }

  async findAll(filters: {
    status?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
  }): Promise<NFTCollection[]> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    switch (filters.sortBy) {
      case 'newest':
        orderBy.createdAt = 'desc';
        break;
      case 'oldest':
        orderBy.createdAt = 'asc';
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      case 'minted':
        orderBy.minted = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    // Default limit when searching (e.g. header dropdown) for faster, smaller responses
    const take =
      filters.limit ?? (search ? 15 : undefined);

    const collections = await this.prisma.collection.findMany({
      where,
      orderBy,
      ...(take != null && { take }),
    });

    return collections.map(this.formatCollection);
  }

  /** Resolve by slug (e.g. "nexus-genesis") or by id (UUID). */
  async findOne(idOrSlug: string): Promise<NFTCollection | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const collection = await this.prisma.collection.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    });
    return collection ? this.formatCollection(collection) : null;
  }

  // Format collection dates to ISO strings for API response
  private formatCollection(collection: any): NFTCollection {
    return {
      ...collection,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      endDate: collection.endDate ? collection.endDate.toISOString() : undefined,
      blockchain: collection.blockchain as 'solana',
      status: collection.status as NFTCollection['status'],
    };
  }
}

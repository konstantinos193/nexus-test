import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../database/entities/collection.entity';
import { NFTCollection } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
  ) {}

  async findFeatured(): Promise<NFTCollection[]> {
    // Get featured collections, prefer minting status
    const collections = await this.collectionRepository.find({
      where: {
        featured: true,
      },
      order: {
        status: 'ASC', // 'minting' comes before others alphabetically
        minted: 'DESC',
      },
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
        collections = await this.collectionRepository.find({
          order: { minted: 'DESC' },
          take: 6,
        });
        break;

      case 'new':
        collections = await this.collectionRepository.find({
          order: { createdAt: 'DESC' },
          take: 6,
        });
        break;

      case 'ending_soon':
        collections = await this.collectionRepository
          .createQueryBuilder('collection')
          .where('collection.endDate IS NOT NULL')
          .andWhere('collection.endDate >= :now', { now })
          .orderBy('collection.endDate', 'ASC')
          .take(6)
          .getMany();
        break;

      case 'free_mint':
        collections = await this.collectionRepository.find({
          where: [
            { price: 0 },
            { price: null },
          ],
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
    creatorAddress?: string;
  }): Promise<NFTCollection[]> {
    const queryBuilder = this.collectionRepository.createQueryBuilder('collection');

    if (filters.creatorAddress) {
      queryBuilder.where('collection.creatorAddress = :creatorAddress', {
        creatorAddress: filters.creatorAddress,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('collection.status = :status', { status: filters.status });
    }

    const search = filters.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(collection.name ILIKE :search OR collection.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Default limit when searching (e.g. header dropdown) for faster, smaller responses
    const take = filters.limit ?? (search ? 15 : undefined);
    if (take != null) {
      queryBuilder.take(take);
    }

    switch (filters.sortBy) {
      case 'newest':
        queryBuilder.orderBy('collection.createdAt', 'DESC');
        break;
      case 'oldest':
        queryBuilder.orderBy('collection.createdAt', 'ASC');
        break;
      case 'name':
        queryBuilder.orderBy('collection.name', 'ASC');
        break;
      case 'minted':
        queryBuilder.orderBy('collection.minted', 'DESC');
        break;
      default:
        queryBuilder.orderBy('collection.createdAt', 'DESC');
    }

    const collections = await queryBuilder.getMany();
    return collections.map(this.formatCollection);
  }

  /** Resolve by slug (e.g. "nexus-genesis") or by id (UUID). */
  async findOne(idOrSlug: string): Promise<NFTCollection | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const collection = await this.collectionRepository.findOne({
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
      mintStart: collection.mintStart ? collection.mintStart.toISOString() : undefined,
      endDate: collection.endDate ? collection.endDate.toISOString() : undefined,
      blockchain: collection.blockchain as 'solana',
      status: collection.status as NFTCollection['status'],
    };
  }
}

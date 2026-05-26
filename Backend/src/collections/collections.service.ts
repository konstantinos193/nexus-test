import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../database/entities/collection.entity';
import { NFTCollection } from './dto/collection.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
  ) {}

  async findFeatured(): Promise<NFTCollection[]> {
    const collections = await this.collectionRepository.find({
      where: { featured: true },
      order: { status: 'ASC', minted: 'DESC' },
      take: 10,
    });
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
          where: [{ price: 0 }, { price: null }],
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
    const qb = this.collectionRepository.createQueryBuilder('collection');

    if (filters.creatorAddress) {
      qb.where('collection.creatorAddress = :creatorAddress', { creatorAddress: filters.creatorAddress });
    }
    if (filters.status) {
      qb.andWhere('collection.status = :status', { status: filters.status });
    }

    const search = filters.search?.trim();
    if (search) {
      qb.andWhere(
        '(collection.name ILIKE :search OR collection.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const take = filters.limit ?? (search ? 15 : undefined);
    if (take != null) qb.take(take);

    switch (filters.sortBy) {
      case 'newest':  qb.orderBy('collection.createdAt', 'DESC'); break;
      case 'oldest':  qb.orderBy('collection.createdAt', 'ASC');  break;
      case 'name':    qb.orderBy('collection.name',      'ASC');  break;
      case 'minted':  qb.orderBy('collection.minted',    'DESC'); break;
      default:        qb.orderBy('collection.createdAt', 'DESC');
    }

    return (await qb.getMany()).map(this.formatCollection);
  }

  async findOne(idOrSlug: string): Promise<NFTCollection | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const collection = await this.collectionRepository.findOne({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    });
    return collection ? this.formatCollection(collection) : null;
  }

  private formatCollection(collection: any): NFTCollection {
    return {
      ...collection,
      createdAt:  collection.createdAt.toISOString(),
      updatedAt:  collection.updatedAt.toISOString(),
      mintStart:  collection.mintStart  ? collection.mintStart.toISOString()  : undefined,
      endDate:    collection.endDate    ? collection.endDate.toISOString()    : undefined,
      blockchain: collection.blockchain as 'solana',
      status:     collection.status     as NFTCollection['status'],
    };
  }

  /**
   * Save a new collection to the DB after the frontend has signed and confirmed
   * the on-chain tx. Status goes straight to 'ready' — no separate confirm step.
   */
  async deployCollection(data: CreateCollectionDto): Promise<{
    collectionId: string;
    collectionAddress: string;
    slug: string;
  }> {
    const base = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const slug = `${base}-${Date.now().toString(36)}`;

    const firstPhase = data.phases?.[0];
    const lastPhase  = data.phases?.at(-1);

    const collection = this.collectionRepository.create({
      name:               data.name,
      slug,
      description:        data.description,
      imageUrl:           data.collectionImage || '',
      bannerUrl:          data.bannerImage,
      creator:            data.creatorAddress,
      creatorAddress:     data.creatorAddress,
      blockchain:         'solana',
      totalSupply:        data.totalSupply        ?? 0,
      minted:             0,
      price:              data.freeMint ? 0 : (data.mintPrice ?? 0),
      status:             'ready',
      mintStart:          firstPhase?.startDateTime ? new Date(firstPhase.startDateTime) : undefined,
      endDate:            lastPhase?.endDateTime    ? new Date(lastPhase.endDateTime)    : undefined,
      featured:           false,
      royaltyBasisPoints: Math.round((data.royaltyPercent ?? 0) * 100),
      mintAddress:        data.collectionAddress,
      ipfsHash:           data.txSignature,
      phases:             data.phases,
      fundReceivers:      data.fundReceivers,
    });

    const saved = await this.collectionRepository.save(collection);

    return {
      collectionId:     saved.id,
      collectionAddress: saved.mintAddress ?? '',
      slug:             saved.slug,
    };
  }

  async confirmDeployment(collectionId: string, txSignature: string): Promise<NFTCollection> {
    await this.collectionRepository.update(
      { id: collectionId },
      { status: 'ready', ipfsHash: txSignature },
    );
    const updated = await this.collectionRepository.findOne({ where: { id: collectionId } });
    return this.formatCollection(updated!);
  }
}

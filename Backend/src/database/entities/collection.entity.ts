import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('Collection')
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  slug: string; // Human-readable URL identifier, e.g. "nexus-genesis"

  @Column()
  @Index()
  name: string;

  @Column('text')
  description: string;

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  bannerUrl?: string;

  @Column()
  creator: string;

  @Column()
  @Index()
  creatorAddress: string;

  @Column({ default: 'solana' })
  blockchain: string;

  @Column({ default: 0 })
  totalSupply: number;

  @Column({ default: 0 })
  @Index()
  minted: number;

  @Column('float', { nullable: true })
  price?: number;

  @Column({ default: 'draft' })
  @Index()
  status: string; // draft, preparing, ready, minting, completed, paused

  @Column({ default: false })
  @Index()
  featured: boolean;

  @Column({ nullable: true })
  mintStart?: Date; // When minting starts (for countdown and phase calculation)

  @Column({ nullable: true })
  endDate?: Date; // When minting ends

  @Column('jsonb', { nullable: true })
  traits?: Record<string, any>; // NFT traits/attributes stored as JSON

  @Column('jsonb', { nullable: true })
  phases?: Record<string, any>[];

  @Column('jsonb', { nullable: true })
  fundReceivers?: Record<string, any>[];

  @Column({ nullable: true })
  ipfsHash?: string; // IPFS hash for metadata

  /** Royalty percentage (seller fee basis points, e.g., 500 = 5%) - only indexed for tradable collections */
  @Column('int', { nullable: true })
  royaltyBasisPoints?: number;

  /** Platform fee percentage (basis points, e.g., 500 = 5%) - only indexed for tradable collections */
  @Column('int', { nullable: true })
  platformFeeBasisPoints?: number;

  /** On-chain mint address for the collection */
  @Column({ nullable: true })
  @Index()
  mintAddress?: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

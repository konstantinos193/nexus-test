import { ApiProperty } from '@nestjs/swagger';

export class NFTCollection {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'URL-safe identifier for /drops/[slug]' })
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty({ required: false })
  bannerUrl?: string;

  @ApiProperty()
  creator: string;

  @ApiProperty()
  creatorAddress: string;

  @ApiProperty({ enum: ['solana'] })
  blockchain: 'solana';

  @ApiProperty()
  totalSupply: number;

  @ApiProperty()
  minted: number;

  @ApiProperty({ required: false })
  price?: number;

  @ApiProperty({ enum: ['draft', 'preparing', 'ready', 'minting', 'completed', 'paused'] })
  status: 'draft' | 'preparing' | 'ready' | 'minting' | 'completed' | 'paused';

  @ApiProperty({ required: false, type: 'array' })
  traits?: { name: string; value: string; rarity?: number }[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ required: false })
  mintStart?: string;

  @ApiProperty({ required: false })
  endDate?: string;

  @ApiProperty({ required: false })
  featured?: boolean;

  @ApiProperty({ required: false, description: 'Royalty percentage (seller fee basis points, e.g., 500 = 5%) - only indexed for tradable collections' })
  royaltyBasisPoints?: number;

  @ApiProperty({ required: false, description: 'Platform fee percentage (basis points, e.g., 500 = 5%) - only indexed for tradable collections' })
  platformFeeBasisPoints?: number;
}

import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

/**
 * Ordered list of collection ids. Index becomes featuredRank (0 first), and each
 * listed collection is set featured = true. Used by the Featured management view.
 */
export class ReorderFeaturedDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  orderedIds: string[];
}

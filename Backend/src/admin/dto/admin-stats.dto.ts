export class AdminStatsDto {
  totalCollections: number;
  activeCollections: number;
  totalMinted: number;
  uniqueCreators: number;
  featuredCount: number;
  newLast7Days: number;
  // All-time platform fee revenue (SOL), snapshot from minted × price × feeBps.
  totalFeeRevenue: number;
}

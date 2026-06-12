/**
 * generate-nft.dto.ts - The shape of what the frontend sends when it wants NFTs.
 * Lives in the body as a JSON string (it's multipart, so we get a string field).
 * We validate it here so the service doesn't have to worry about garbage input.
 *
 * @author Juan – dto architect, class-validator enthusiast (reluctantly)
 */

// Type definitions – no validators needed here, just shapes the service consumes
export interface LayerConfigItem {
  id: string
  name: string
  order: number
}

export interface ExclusionRuleItem {
  id: string
  layerAId: string
  valueA: string
  layerBId: string
  valueB: string
}

// The full config object parsed from the 'config' form field
export interface GenerateNftConfig {
  layers: LayerConfigItem[]
  exclusionRules: ExclusionRuleItem[]
  // { layerId: { valueFilename: "percentage string" } }
  rarityByLayer: Record<string, Record<string, string>>
  // { layerId: { valueFilename: "display name" } }
  valueNameOverrides: Record<string, Record<string, string>>
  collectionNameBase: string
  collectionDescription: string
  externalUrl: string
  outputSize: 'layer' | '512' | '1024'
  // null = generate all valid combos up to 2000
  supply: number | null
}

// What the service returns to the controller
export interface GenerateNftResult {
  token: string
  count: number
  rarityIndex: Array<{ tokenId: number; rank: number; score: number }>
  expiresAt: string // ISO date string
}

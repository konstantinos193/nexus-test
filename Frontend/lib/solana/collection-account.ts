import { PublicKey } from '@solana/web3.js'
import { ON_CHAIN_TO_UI, type OnChainStandard, type UiMetadataStandard } from './standards'

/** Decode metadata_standard u8 from a nexus Collection account buffer. */
export function decodeMetadataStandard(data: Buffer): OnChainStandard {
  // 8 disc + 5×32 pubkeys + 6×8 u64/i64 + 8 created_at + 2 fee_bps + 1 mint_limit
  const offset = 8 + 160 + 48 + 8 + 2 + 1
  return data[offset] as OnChainStandard
}

export function decodeCollectionMintSeed(data: Buffer): PublicKey {
  const offset = 8 + 32 // after discriminator + authority
  return new PublicKey(data.subarray(offset, offset + 32))
}

export function uiStandardFromAccount(data: Buffer): UiMetadataStandard | null {
  const raw = decodeMetadataStandard(data)
  return ON_CHAIN_TO_UI[raw] ?? null
}

export function decodeMintAuthority(data: Buffer): PublicKey {
  const offset = 8 + 64 // after authority + mint
  return new PublicKey(data.subarray(offset, offset + 32))
}
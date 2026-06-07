// Encode create_collection instruction data.
// Signature: create_collection(collection_name: String, metadata_uri: String, config: CollectionConfig, platform_fee_bps: u16)
async function buildCreateCollectionData(params: {
  collectionName: string
  metadataUri: string
  maxSupply: bigint
  pricePerNft: bigint
  startTime: bigint
  endTime: bigint | null
  metadataStandardVariant: number
  platformFeeBps: number
}): Promise<Buffer> {
  const disc = await anchorDiscriminator('create_collection')

  const nameBuf = encodeBorshString(params.collectionName.slice(0, 32))
  const uriBuf = encodeBorshString(params.metadataUri.slice(0, 128)) // metadata_uri (max 128 bytes on-chain)

  const feeBuf = Buffer.alloc(2)
  feeBuf.writeUInt16LE(params.platformFeeBps, 0)

  return Buffer.concat([
    disc,
    nameBuf,
    uriBuf,
    // CollectionConfig fields (AnchorSerialize order):
    encodeU64LE(params.maxSupply),                // max_supply
    encodeU64LE(params.pricePerNft),              // price_per_nft
    encodeI64LE(params.startTime),                // start_time
    encodeOptionI64(params.endTime),              // end_time: Option<i64>
    Buffer.from([0x00]),                          // mint_limit_per_wallet: None
    Buffer.from([params.metadataStandardVariant]),// metadata_standard (u8 enum variant)
    Buffer.from([0x00]),                          // freeze_trading_until_date: None
    Buffer.from([0x00]),                          // freeze_trading_until_sold_out: false
    feeBuf,                                       // platform_fee_bps
  ])
}

export { buildCreateCollectionData }

// Analyze the full instruction to find where the issue is
const hex = "9cfb5c36e902105205000000746573743343000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe803000000000000005ed0b2000000003266256a0000000000000200006400";

const buffer = Buffer.from(hex, 'hex');

// Helper functions
function encodeU64LE(v) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(v), 0);
  return buf;
}

function encodeI64LE(v) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(v), 0);
  return buf;
}

function encodeOptionI64(v) {
  return v === null ? Buffer.from([0]) : Buffer.concat([Buffer.from([1]), encodeI64LE(v)]);
}

console.log("Full instruction analysis:");
console.log("Total length:", buffer.length);

// Parse the instruction step by step
let offset = 0;

// 1. Discriminator (8 bytes)
const discriminator = buffer.slice(offset, offset + 8);
console.log("\n1. Discriminator (8 bytes):", discriminator.toString('hex'));
offset += 8;

// 2. Collection name
const nameLen = buffer.readUInt32LE(offset);
console.log("\n2. Name length:", nameLen);
offset += 4;
const name = buffer.slice(offset, offset + nameLen).toString('utf8');
console.log("   Name:", name);
offset += nameLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

// 3. Metadata URI
const uriLen = buffer.readUInt32LE(offset);
console.log("\n3. URI length:", uriLen);
offset += 4;
const uri = buffer.slice(offset, offset + uriLen).toString('utf8');
console.log("   URI:", uri);
offset += uriLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

console.log("\nAfter strings, offset:", offset);

// 4. CollectionConfig
console.log("\n4. CollectionConfig struct:");

// max_supply (8 bytes)
const maxSupply = buffer.readBigUInt64LE(offset);
console.log("   max_supply:", maxSupply.toString(), "(should be 1000)");
offset += 8;

// price_per_nft (8 bytes)
const pricePerNft = buffer.readBigUInt64LE(offset);
console.log("   price_per_nft:", pricePerNft.toString());
offset += 8;

// start_time (8 bytes)
const startTime = buffer.readBigInt64LE(offset);
console.log("   start_time:", startTime.toString());
offset += 8;

// end_time (8 bytes)
const endTime = buffer.readBigInt64LE(offset);
console.log("   end_time:", endTime.toString());
offset += 8;

// freeze_trading_until_sold_out (1 byte)
const freezeUntilSoldOut = buffer.readUInt8(offset);
console.log("   freeze_trading_until_sold_out:", freezeUntilSoldOut);
offset += 1;

// freeze_trading_until_date (8 bytes)
const freezeUntilDate = buffer.readBigInt64LE(offset);
console.log("   freeze_trading_until_date:", freezeUntilDate.toString());
offset += 8;

// mint_limit_per_wallet (8 bytes)
const mintLimitPerWallet = buffer.readBigUInt64LE(offset);
console.log("   mint_limit_per_wallet:", mintLimitPerWallet.toString());
offset += 8;

// platform_fee_bps (2 bytes)
const platformFeeBps = buffer.readUInt16LE(offset);
console.log("   platform_fee_bps:", platformFeeBps);
offset += 2;

console.log("\nTotal bytes processed:", offset);
console.log("Remaining bytes:", buffer.length - offset);

// Now let's see what the CollectionConfig should look like with the expected values
console.log("\n=== Expected CollectionConfig ===");
const expectedMaxSupply = 1000;
const expectedPricePerNft = BigInt(100000000); // 0.1 SOL in lamports
const expectedStartTime = BigInt(1749312000); // Example timestamp
const expectedEndTime = null;
const expectedMintLimitPerWallet = 2;
const expectedPlatformFeeBps = 100;

console.log("Expected max_supply:", expectedMaxSupply);
console.log("Expected price_per_nft:", expectedPricePerNft.toString());
console.log("Expected start_time:", expectedStartTime.toString());
console.log("Expected end_time:", expectedEndTime);
console.log("Expected mint_limit_per_wallet:", expectedMintLimitPerWallet);
console.log("Expected platform_fee_bps:", expectedPlatformFeeBps);

// Build what the CollectionConfig should look like
const expectedConfig = Buffer.concat([
  encodeU64LE(expectedMaxSupply),
  encodeU64LE(expectedPricePerNft),
  encodeI64LE(expectedStartTime),
  encodeOptionI64(expectedEndTime),
  Buffer.from([0x00]), // mint_limit_per_wallet: None
  Buffer.from([0x02]), // metadata_standard variant
  Buffer.from([0x00]), // freeze_trading_until_date: None
  Buffer.from([0x00]), // freeze_trading_until_sold_out: false
  Buffer.from([expectedPlatformFeeBps, 0x00]) // platform_fee_bps (little-endian)
]);

console.log("\nExpected CollectionConfig hex:", expectedConfig.toString('hex'));

// Get the actual CollectionConfig from the transaction
const actualConfigStart = 8 + 4 + 5 + 3 + 4 + 67 + 1; // Approximate
const paddedConfigStart = actualConfigStart + (4 - (actualConfigStart % 4)) % 4;
const actualConfig = buffer.slice(paddedConfigStart, paddedConfigStart + expectedConfig.length);

console.log("Actual CollectionConfig hex:", actualConfig.toString('hex'));
console.log("Match:", expectedConfig.equals(actualConfig) ? 'YES' : 'NO');

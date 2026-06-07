// Analyze the debug hex data
const hex = "9cfb5c36e902105205000000746573743300000043000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe803000000000000005ed0b200000000bf6d256a0000000000000200006400";

const buffer = Buffer.from(hex, 'hex');

console.log("Debug hex analysis:");
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
console.log("   Name length in hex:", nameLen.toString(16));
offset += nameLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

// 3. Check padding
const paddingBytes = buffer.slice(offset, offset + 3);
console.log("\n3. Padding bytes (3):", paddingBytes.toString('hex'));
console.log("   Padding correct:", paddingBytes.toString('hex') === '000000' ? 'YES' : 'NO');
offset += 3; // Skip padding

// 4. Metadata URI
const uriLen = buffer.readUInt32LE(offset);
console.log("\n4. URI length:", uriLen);
console.log("   URI length in hex:", uriLen.toString(16));
offset += 4;
const uri = buffer.slice(offset, offset + uriLen).toString('utf8');
console.log("   URI:", uri);
offset += uriLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

console.log("\nAfter strings, offset:", offset);

// 5. CollectionConfig - max_supply
const maxSupply = buffer.readBigUInt64LE(offset);
console.log("\n5. max_supply:", maxSupply.toString(), "(should be 1000)");
offset += 8;

// Check if the issue is in the CollectionConfig
if (maxSupply.toString() === '1000') {
  console.log("✅ max_supply is correct (1000)!");
  console.log("❌ But still getting 0x66 error");
  
  // Let's check the CollectionConfig field order more carefully
  console.log("\nChecking CollectionConfig fields:");
  
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
  
  console.log("\nPossible issues:");
  console.log("1. Field order mismatch between frontend and Rust");
  console.log("2. Data type encoding issue");
  console.log("3. Missing required field");
  console.log("4. Invalid value in another field");
  
  // Check the Rust struct field order again
  console.log("\nRust CollectionConfig field order:");
  console.log("1. max_supply: u64");
  console.log("2. price_per_nft: u64");
  console.log("3. start_time: i64");
  console.log("4. end_time: Option<i64>");
  console.log("5. mint_limit_per_wallet: Option<u8>");
  console.log("6. metadata_standard: MetadataStandard");
  console.log("7. freeze_trading_until_date: Option<i64>");
  console.log("8. freeze_trading_until_sold_out: bool");
  
  console.log("\nFrontend encoding order:");
  console.log("1. max_supply: u64 ✅");
  console.log("2. price_per_nft: u64 ✅");
  console.log("3. start_time: i64 ✅");
  console.log("4. end_time: Option<i64> ✅");
  console.log("5. mint_limit_per_wallet: Option<u8> (None = [0x00]) ✅");
  console.log("6. metadata_standard: u8 enum ✅");
  console.log("7. freeze_trading_until_date: Option<i64> (None = [0x00]) ✅");
  console.log("8. freeze_trading_until_sold_out: bool (false = [0x00]) ✅");
  
  console.log("\nThe field order looks correct. Let me check the actual values...");
  
  // Check for invalid values
  if (pricePerNft.toString() === '0') {
    console.log("❌ price_per_nft is 0 - this might be the issue!");
  }
  if (startTime.toString() === '0') {
    console.log("❌ start_time is 0 - this might be the issue!");
  }
  if (endTime.toString() === '-1') {
    console.log("❌ end_time is -1 (None) - this is expected");
  }
  if (mintLimitPerWallet.toString() === '0') {
    console.log("❌ mint_limit_per_wallet is 0 (None) - this is expected");
  }
  
} else {
  console.log("❌ max_supply is still wrong:", maxSupply.toString());
}

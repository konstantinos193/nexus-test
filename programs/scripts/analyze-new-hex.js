// Analyze the new hex data with padding fix
const hex = "9cfb5c36e902105205000000746573743300000043000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe803000000000000005ed0b200000000486d256a0000000000000200006400";

const buffer = Buffer.from(hex, 'hex');

console.log("New hex analysis with padding fix:");
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

// 3. Check padding
const paddingBytes = buffer.slice(offset, offset + 3);
console.log("\n3. Padding bytes (3):", paddingBytes.toString('hex'));
console.log("   Padding correct:", paddingBytes.toString('hex') === '000000' ? 'YES' : 'NO');
offset += 3; // Skip padding

// 4. Metadata URI
const uriLen = buffer.readUInt32LE(offset);
console.log("\n4. URI length:", uriLen);
offset += 4;
const uri = buffer.slice(offset, offset + uriLen).toString('utf8');
console.log("   URI:", uri);
offset += uriLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

console.log("\nAfter strings, offset:", offset);

// 5. CollectionConfig
console.log("\n5. CollectionConfig struct:");

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

// Check if max_supply is now correct
if (maxSupply.toString() === '1000') {
  console.log("\n✅ max_supply is now correct (1000)!");
  console.log("❌ But still getting 0x66 error - must be a different issue");
} else {
  console.log("\n❌ max_supply is still wrong:", maxSupply.toString());
}

console.log("\nPossible remaining issues:");
console.log("1. CollectionConfig field order mismatch");
console.log("2. Data type encoding issue");
console.log("3. Missing required field");
console.log("4. Invalid value in another field");

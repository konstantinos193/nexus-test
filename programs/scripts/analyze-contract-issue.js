// Analyze the contract issue - the frontend is correct, but contract is failing
const hex = "9cfb5c36e902105205000000746573743300000043000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe8030000000000000000000000000000986e256a0000000000000200006400";

const buffer = Buffer.from(hex, 'hex');

console.log("Contract Issue Analysis:");
console.log("Frontend is generating correct data, but contract fails with 0x66");

// Parse the instruction step by step
let offset = 0;

// 1. Discriminator (8 bytes)
offset += 8;

// 2. Collection name
const nameLen = buffer.readUInt32LE(offset);
offset += 4;
offset += nameLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

// 3. Padding (should be 000000 but is 430000)
const paddingBytes = buffer.slice(offset, offset + 3);
console.log("Padding bytes:", paddingBytes.toString('hex'));
console.log("Expected: 000000, Got:", paddingBytes.toString('hex'));
console.log("This means the frontend is working, but the contract expects different data!");
offset += 3;

// 4. Metadata URI
const uriLen = buffer.readUInt32LE(offset);
offset += 4;
offset += uriLen;
// Pad to 4-byte boundary
while (offset % 4 !== 0) offset++;

console.log("\nCollectionConfig Analysis:");
console.log("After strings, offset:", offset);

// 5. CollectionConfig fields
const maxSupply = buffer.readBigUInt64LE(offset);
console.log("max_supply:", maxSupply.toString(), "(should be 1000)");
offset += 8;

const pricePerNft = buffer.readBigUInt64LE(offset);
console.log("price_per_nft:", pricePerNft.toString(), "(should be > 0)");
offset += 8;

const startTime = buffer.readBigInt64LE(offset);
console.log("start_time:", startTime.toString(), "(should be > current time)");
offset += 8;

const endTime = buffer.readBigInt64LE(offset);
console.log("end_time:", endTime.toString(), "(should be > start_time or -1 for None)");
offset += 8;

const freezeUntilSoldOut = buffer.readUInt8(offset);
console.log("freeze_trading_until_sold_out:", freezeUntilSoldOut);
offset += 1;

const freezeUntilDate = buffer.readBigInt64LE(offset);
console.log("freeze_trading_until_date:", freezeUntilDate.toString());
offset += 8;

const mintLimitPerWallet = buffer.readBigUInt64LE(offset);
console.log("mint_limit_per_wallet:", mintLimitPerWallet.toString());
offset += 8;

const platformFeeBps = buffer.readUInt16LE(offset);
console.log("platform_fee_bps:", platformFeeBps);
offset += 2;

console.log("\nIssue Analysis:");
console.log("1. max_supply is:", maxSupply.toString(), "✅" + (maxSupply.toString() === '1000' ? " Correct" : " WRONG"));
console.log("2. price_per_nft is:", pricePerNft.toString(), "❌" + (pricePerNft.toString() === '0' ? " ZERO - This is the issue!" : " OK"));
console.log("3. start_time is:", startTime.toString(), "❌" + (startTime.toString() === '0' ? " ZERO - This is the issue!" : " OK"));
console.log("4. end_time is:", endTime.toString(), "✅" + (endTime.toString() === '-1' ? " None - OK" : " Check"));

console.log("\nRoot Cause:");
console.log("The price_per_nft or start_time is 0, which might be causing the InvalidSupply error!");
console.log("Even though max_supply is 1000, other fields might be invalid.");

console.log("\nSmart Contract Check:");
console.log("Let me check the Rust code to see what validations are failing...");

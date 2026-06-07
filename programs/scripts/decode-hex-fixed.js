// Decode the hex instruction data to find the issue
const hex = "9cfb5c36e902105205000000746573743343000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe803000000000000005ed0b2000000003266256a0000000000000200006400";

function decodeHex(hex) {
  const buffer = Buffer.from(hex, 'hex');
  let offset = 0;
  
  console.log("Instruction Data Analysis:");
  console.log("Total length:", buffer.length, "bytes");
  
  // Instruction discriminator (8 bytes)
  const discriminator = buffer.readBigUInt64LE(offset);
  console.log("Discriminator:", "0x" + discriminator.toString(16));
  offset += 8;
  
  // String length prefix (4 bytes)
  const nameLen = buffer.readUInt32LE(offset);
  console.log("Name length:", nameLen);
  offset += 4;
  
  // String data
  const name = buffer.slice(offset, offset + nameLen).toString('utf8');
  console.log("Name:", name);
  offset += nameLen;
  
  // Pad to next multiple of 4
  while (offset % 4 !== 0) offset++;
  
  // String length prefix (4 bytes)
  const uriLen = buffer.readUInt32LE(offset); 
  console.log("URI length:", uriLen);
  offset += 4;
  
  // String data
  const uri = buffer.slice(offset, offset + uriLen).toString('utf8');
  console.log("URI:", uri);
  offset += uriLen;
  
  // Pad to next multiple of 4
  while (offset % 4 !== 0) offset++;
  
  console.log("\nAfter strings, offset:", offset);
  console.log("Remaining bytes:", buffer.length - offset);
  
  // CollectionConfig struct
  if (offset + 8 <= buffer.length) {
    // max_supply (8 bytes)
    const maxSupply = buffer.readBigUInt64LE(offset);
    console.log("max_supply:", maxSupply.toString(), "(this should be 1000)");
    offset += 8;
  }
  
  if (offset + 8 <= buffer.length) {
    // price_per_nft (8 bytes)
    const pricePerNft = buffer.readBigUInt64LE(offset);
    console.log("price_per_nft:", pricePerNft.toString());
    offset += 8;
  }
  
  if (offset + 8 <= buffer.length) {
    // start_time (8 bytes)
    const startTime = buffer.readBigInt64LE(offset);
    console.log("start_time:", startTime.toString());
    offset += 8;
  }
  
  if (offset + 8 <= buffer.length) {
    // end_time (8 bytes) - optional, check if it's disabled
    const endTime = buffer.readBigInt64LE(offset);
    console.log("end_time:", endTime.toString(), "(should be -1 if disabled)");
    offset += 8;
  }
  
  if (offset + 1 <= buffer.length) {
    // freeze_trading_until_sold_out (1 byte)
    const freezeUntilSoldOut = buffer.readUInt8(offset);
    console.log("freeze_trading_until_sold_out:", freezeUntilSoldOut);
    offset += 1;
  }
  
  // Pad to next multiple of 1 for struct alignment
  while (offset % 1 !== 0) offset++;
  
  if (offset + 8 <= buffer.length) {
    // freeze_trading_until_date (8 bytes)
    const freezeUntilDate = buffer.readBigInt64LE(offset);
    console.log("freeze_trading_until_date:", freezeUntilDate.toString());
    offset += 8;
  }
  
  if (offset + 8 <= buffer.length) {
    // mint_limit_per_wallet (8 bytes)
    const mintLimitPerWallet = buffer.readBigUInt64LE(offset);
    console.log("mint_limit_per_wallet:", mintLimitPerWallet.toString());
    offset += 8;
  }
  
  if (offset + 2 <= buffer.length) {
    // platform_fee_bps (2 bytes)
    const platformFeeBps = buffer.readUInt16LE(offset);
    console.log("platform_fee_bps:", platformFeeBps);
    offset += 2;
  }
  
  console.log("\nTotal bytes processed:", offset);
  console.log("Remaining bytes:", buffer.length - offset);
  
  // Show the raw bytes around the CollectionConfig area
  console.log("\nRaw bytes around CollectionConfig:");
  const configStart = 8 + 4 + 5 + 3 + 4 + 43 + 1; // Approximate start of CollectionConfig
  const configEnd = Math.min(configStart + 50, buffer.length);
  console.log("Bytes", configStart, "to", configEnd + ":");
  console.log(buffer.slice(configStart, configEnd).toString('hex'));
}

decodeHex(hex);

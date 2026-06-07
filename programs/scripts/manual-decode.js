// Manual decode to find the exact issue
const hex = "9cfb5c36e902105205000000746573743343000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe803000000000000005ed0b2000000003266256a0000000000000200006400";

const buffer = Buffer.from(hex, 'hex');

console.log("Hex breakdown:");
console.log("Full hex:", hex);
console.log("Buffer length:", buffer.length);

// Manual analysis
console.log("\nManual breakdown:");
console.log("Bytes 0-7 (discriminator):", buffer.slice(0, 8).toString('hex'));
console.log("Bytes 8-11 (name length):", buffer.slice(8, 12).toString('hex'));
console.log("Bytes 12-16 (name):", buffer.slice(12, 17).toString('hex'));
console.log("Bytes 17-19 (padding):", buffer.slice(17, 20).toString('hex'));
console.log("Bytes 20-23 (uri length):", buffer.slice(20, 24).toString('hex'));

// Read the values
const nameLen = buffer.readUInt32LE(8);
const uriLen = buffer.readUInt32LE(20);

console.log("\nDecoded values:");
console.log("Name length:", nameLen);
console.log("URI length:", uriLen);

// Show what the actual URI should be
const expectedUriStart = 24;
const expectedUriBytes = buffer.slice(expectedUriStart, expectedUriStart + 43);
console.log("Expected URI bytes (43 bytes):", expectedUriBytes.toString('hex'));
console.log("Expected URI:", expectedUriBytes.toString('utf8'));

// Find where the CollectionConfig should start
const configStart = 24 + 43; // After URI
const paddedConfigStart = configStart + (4 - (configStart % 4)) % 4; // Pad to 4-byte boundary

console.log("\nCollectionConfig should start at byte:", paddedConfigStart);
console.log("Bytes at CollectionConfig start:", buffer.slice(paddedConfigStart, paddedConfigStart + 40).toString('hex'));

// Try to read max_supply from the correct position
if (paddedConfigStart + 8 <= buffer.length) {
  const maxSupply = buffer.readBigUInt64LE(paddedConfigStart);
  console.log("max_supply at correct position:", maxSupply.toString());
}

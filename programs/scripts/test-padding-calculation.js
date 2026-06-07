// Test the padding calculation
function encodeBorshString(s) {
  const bytes = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

// Test with the actual values
const name = "test3";
const uri = "ipfs://bafybeic25bdh36as53bhbmyiycisxkhwu223vjhx7i2g5ejp2kzhrh42p4/";

console.log("Testing padding calculation:");
console.log("Name:", name);
console.log("URI:", uri);

const nameBuf = encodeBorshString(name);
const uriBuf = encodeBorshString(uri);

console.log("\nName buffer:");
console.log("Length:", nameBuf.length);
console.log("Hex:", nameBuf.toString('hex'));
console.log("Length % 4:", nameBuf.length % 4);

console.log("\nURI buffer:");
console.log("Length:", uriBuf.length);
console.log("Hex:", uriBuf.toString('hex'));

// Calculate padding
const paddingSize = (4 - (nameBuf.length % 4)) % 4;
console.log("\nPadding size needed:", paddingSize);

const namePadding = Buffer.alloc(paddingSize);
console.log("Padding bytes:", namePadding.toString('hex'));

// Create the full buffer with padding
const fullBuffer = Buffer.concat([nameBuf, namePadding, uriBuf]);
console.log("\nFull buffer with padding:");
console.log("Length:", fullBuffer.length);
console.log("Hex:", fullBuffer.toString('hex'));

// Check what happens at the URI length position
const uriLenPos = nameBuf.length + paddingSize;
console.log("\nURI length position:", uriLenPos);
console.log("Bytes at URI length:", fullBuffer.slice(uriLenPos, uriLenPos + 4).toString('hex'));
console.log("URI length as uint32:", fullBuffer.readUInt32LE(uriLenPos));

// Compare with expected
console.log("\nExpected URI length:", uri.length);
console.log("Expected length bytes:", Buffer.alloc(4).writeUInt32LE(uri.length, 0) || '43 00 00 00');

// Test the actual calculation
const expectedLen = Buffer.alloc(4);
expectedLen.writeUInt32LE(uri.length, 0);
console.log("Expected length bytes:", expectedLen.toString('hex'));

// Check if the issue is in the concatenation
console.log("\nManual concatenation test:");
console.log("Name buffer:", nameBuf.toString('hex'));
console.log("Padding:", namePadding.toString('hex'));
console.log("URI buffer:", uriBuf.toString('hex'));
console.log("Combined:", Buffer.concat([nameBuf, namePadding, uriBuf]).toString('hex'));

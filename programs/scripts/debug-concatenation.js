// Debug the concatenation issue
function encodeBorshString(s) {
  const bytes = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

// Test with the actual values
const name = "test3";
const uri = "ipfs://bafybeic25bdh36as53bhbmyiycisxkhwu223vjhx7i2g5ejp2kzhrh42p4/";

console.log("Testing concatenation:");
console.log("Name:", name);
console.log("URI:", uri);

const nameEncoded = encodeBorshString(name);
const uriEncoded = encodeBorshString(uri);

console.log("\nName encoded:", nameEncoded.toString('hex'));
console.log("URI encoded:", uriEncoded.toString('hex'));

// Test concatenation
const concatenated = Buffer.concat([nameEncoded, uriEncoded]);
console.log("\nConcatenated:", concatenated.toString('hex'));

// Now let's see what happens with padding
console.log("\nWith padding to 4-byte boundaries:");
let offset = nameEncoded.length;
console.log("Name length:", nameEncoded.length);
console.log("Should pad to:", offset + (4 - (offset % 4)) % 4);

// Simulate the actual concatenation with padding
const paddedName = nameEncoded;
const paddedUriStart = paddedName.length;
const paddedUriStartWithPadding = paddedUriStart + (4 - (paddedUriStart % 4)) % 4;

console.log("URI should start at:", paddedUriStartWithPadding);

// Create the full buffer
const fullBuffer = Buffer.alloc(paddedUriStartWithPadding + uriEncoded.length);
fullBuffer.set(paddedName, 0);
fullBuffer.set(uriEncoded, paddedUriStartWithPadding);

console.log("Full buffer:", fullBuffer.toString('hex'));

// Check what's at the URI length position
const uriLenPos = paddedUriStartWithPadding;
console.log("URI length position:", uriLenPos);
console.log("Bytes at URI length:", fullBuffer.slice(uriLenPos, uriLenPos + 4).toString('hex'));

// Compare with actual
const actualHex = "9cfb5c36e902105205000000746573743343000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342f";
const actualBuffer = Buffer.from(actualHex, 'hex');

console.log("\nActual buffer (after discriminator):", actualBuffer.slice(8).toString('hex'));
console.log("Our buffer:", fullBuffer.toString('hex'));
console.log("Match:", fullBuffer.equals(actualBuffer.slice(8)) ? 'YES' : 'NO');

// Show the differences
console.log("\nDifferences:");
for (let i = 0; i < Math.min(fullBuffer.length, actualBuffer.slice(8).length); i++) {
  if (fullBuffer[i] !== actualBuffer.slice(8)[i]) {
    console.log(`Byte ${i}: expected ${fullBuffer[i].toString(16).padStart(2, '0')}, actual ${actualBuffer.slice(8)[i].toString(16).padStart(2, '0')}`);
  }
}

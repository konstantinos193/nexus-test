// Test the string encoding to find the issue
function encodeBorshString(s) {
  const bytes = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

// Test with the actual values
const name = "test3";
const uri = "ipfs://bafybeic25bdh36as53bhbmyiycisxkhwu223vjhx7i2g5ejp2kzhrh42p4/";

console.log("Name encoding:");
console.log("String:", name);
console.log("Length:", name.length);
const nameEncoded = encodeBorshString(name);
console.log("Encoded:", nameEncoded.toString('hex'));
console.log("Length bytes:", nameEncoded.slice(0, 4).toString('hex'));
console.log("String bytes:", nameEncoded.slice(4).toString('hex'));

console.log("\nURI encoding:");
console.log("String:", uri);
console.log("Length:", uri.length);
const uriEncoded = encodeBorshString(uri);
console.log("Encoded:", uriEncoded.toString('hex'));
console.log("Length bytes:", uriEncoded.slice(0, 4).toString('hex'));
console.log("String bytes:", uriEncoded.slice(4).toString('hex'));

// Test what happens when we concatenate
const combined = Buffer.concat([nameEncoded, uriEncoded]);
console.log("\nCombined encoding:");
console.log("Hex:", combined.toString('hex'));

// Check what the actual transaction has
const actualHex = "9cfb5c36e902105205000000746573743343000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342f";
const actualBuffer = Buffer.from(actualHex, 'hex');

console.log("\nActual transaction (after discriminator):");
console.log("Hex:", actualBuffer.slice(8).toString('hex'));

// Compare
console.log("\nComparison:");
console.log("Expected (after discriminator):", combined.toString('hex'));
console.log("Actual (after discriminator):", actualBuffer.slice(8).toString('hex'));
console.log("Match:", combined.equals(actualBuffer.slice(8)) ? 'YES' : 'NO');

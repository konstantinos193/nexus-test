// Debug the URI length issue
const hex = "9cfb5c36e902105205000000746573743343000000697066733a2f2f626166796265696332356264683336617335336268626d796979636973786b687775323233766a68783769326735656a70326b7a687268343270342fe803000000000000005ed0b2000000003266256a0000000000000200006400";

const buffer = Buffer.from(hex, 'hex');

console.log("Debugging URI length issue:");
console.log("Full hex:", hex);

// Show the bytes around the URI length
console.log("\nBytes around URI length (should be at offset 20):");
console.log("Bytes 16-23:", buffer.slice(16, 24).toString('hex'));
console.log("Byte 20:", buffer.slice(20, 21).toString('hex'));
console.log("Byte 21:", buffer.slice(21, 22).toString('hex'));
console.log("Byte 22:", buffer.slice(22, 23).toString('hex'));
console.log("Byte 23:", buffer.slice(23, 24).toString('hex'));

// Read URI length as little-endian
const uriLenBytes = buffer.slice(20, 24);
console.log("\nURI length bytes:", uriLenBytes.toString('hex'));
console.log("URI length as uint32 LE:", uriLenBytes.readUInt32LE(0));

// What should it be?
const expectedUri = "ipfs://bafybeic25bdh36as53bhbmyiycisxkhwu223vjhx7i2g5ejp2kzhrh42p4/";
console.log("\nExpected URI:", expectedUri);
console.log("Expected URI length:", expectedUri.length);

// Show what the correct encoding should look like
const expectedLen = Buffer.alloc(4);
expectedLen.writeUInt32LE(expectedUri.length, 0);
console.log("Expected length bytes:", expectedLen.toString('hex'));

// Check if there's a byte order issue
console.log("\nChecking byte order:");
console.log("Current bytes read as LE:", uriLenBytes.readUInt32LE(0));
console.log("Current bytes read as BE:", uriLenBytes.readUInt32BE(0));

// Maybe the issue is that the data is being written in BE instead of LE
if (uriLenBytes.readUInt32BE(0) === expectedUri.length) {
  console.log("FOUND IT! The data is being written in big-endian instead of little-endian!");
} else {
  console.log("Not a simple byte order issue. Let's check further...");
  
  // Show the actual bytes that should be there
  console.log("\nExpected bytes at position 20-23:", expectedLen.toString('hex'));
  console.log("Actual bytes at position 20-23:", uriLenBytes.toString('hex'));
  
  // Maybe the issue is in the discriminator or previous data
  console.log("\nChecking if discriminator is correct...");
  const discriminator = buffer.slice(0, 8);
  console.log("Discriminator:", discriminator.toString('hex'));
  
  // Check name encoding
  console.log("\nChecking name encoding...");
  const nameLen = buffer.readUInt32LE(8);
  console.log("Name length bytes:", buffer.slice(8, 12).toString('hex'));
  console.log("Name length:", nameLen);
  
  const name = buffer.slice(12, 12 + nameLen).toString('utf8');
  console.log("Name:", name);
  
  // Check padding
  const paddingStart = 12 + nameLen;
  const paddingEnd = paddingStart + (4 - (paddingStart % 4)) % 4;
  console.log("Padding bytes:", buffer.slice(paddingStart, paddingEnd).toString('hex'));
  
  // Show where URI should start
  const uriStart = paddingEnd;
  console.log("URI should start at byte:", uriStart);
  console.log("Bytes at URI start:", buffer.slice(uriStart, uriStart + 4).toString('hex'));
}

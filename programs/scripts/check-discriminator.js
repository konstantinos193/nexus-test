const crypto = require('crypto');

// Compute the correct discriminator for create_collection
async function anchorDiscriminator(name) {
  const preimage = Buffer.from(`global:${name}`, 'utf8');
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

async function main() {
  const discriminator = await anchorDiscriminator('create_collection');
  console.log('Expected discriminator for create_collection:');
  console.log('Hex:', discriminator.toString('hex'));
  console.log('Little-endian:', discriminator.readBigUInt64LE(0).toString(16));
  
  // Compare with actual from the transaction
  const actual = Buffer.from('9cfb5c36e9021052', 'hex');
  console.log('\nActual discriminator from transaction:');
  console.log('Hex:', actual.toString('hex'));
  console.log('Little-endian:', actual.readBigUInt64LE(0).toString(16));
  
  console.log('\nMatch:', discriminator.equals(actual) ? 'YES' : 'NO');
}

main();

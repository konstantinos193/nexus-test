const fs = require('fs');
const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');

function anchorDiscriminator(name) {
  const crypto = require('crypto');
  const preimage = Buffer.from(`global:${name}`, 'utf8');
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 3) {
    console.error('Usage: node scripts/simulate-create-collection.cjs <rpcUrl> <programId> <ixDataHex> [authorityKeypair.json]');
    process.exit(1);
  }
  const [rpcUrl, programIdStr, ixHex, keypairPath] = argv;
  const conn = new Connection(rpcUrl, 'confirmed');
  const programId = new PublicKey(programIdStr);

  let authority;
  if (keypairPath) {
    const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    authority = Keypair.fromSecretKey(Uint8Array.from(secret));
  } else {
    authority = Keypair.generate();
    console.warn('No keypair provided — using ephemeral authority:', authority.publicKey.toBase58());
  }

  const mintPubkey = authority.publicKey;
  const collectionPda = (await PublicKey.findProgramAddress([Buffer.from('collection'), mintPubkey.toBuffer()], programId))[0];
  const registryPda = (await PublicKey.findProgramAddress([Buffer.from('registry')], programId))[0];
  const mintAuthorityPda = (await PublicKey.findProgramAddress([Buffer.from('mint_authority'), mintPubkey.toBuffer()], programId))[0];
  const platformWallet = authority.publicKey;

  const ixData = Buffer.from(ixHex, 'hex');

  const keys = [
    { pubkey: collectionPda,           isSigner: false, isWritable: true  },
    { pubkey: mintPubkey,              isSigner: true,  isWritable: true  },
    { pubkey: registryPda,             isSigner: false, isWritable: true  },
    { pubkey: authority.publicKey,     isSigner: true,  isWritable: true  },
    { pubkey: mintAuthorityPda,        isSigner: false, isWritable: false },
    { pubkey: authority.publicKey,     isSigner: false, isWritable: true  },
    { pubkey: platformWallet,          isSigner: false, isWritable: false },
    { pubkey: new PublicKey('CoREENxT6tW1HoK8ypYmtXvZApgjbpa9xcfc1mpRj9DA'), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({ programId, keys, data: ixData });

  const { blockhash } = await conn.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: authority.publicKey });
  tx.add(ix);
  tx.sign(authority);

  console.log('Simulating transaction...');
  console.log(' programId:', programId.toBase58());
  console.log(' collectionPda:', collectionPda.toBase58());
  console.log(' mint:', mintPubkey.toBase58());
  console.log(' registryPda:', registryPda.toBase58());
  console.log(' mintAuthorityPda:', mintAuthorityPda.toBase58());
  console.log(' authority:', authority.publicKey.toBase58());
  console.log(' ixData len:', ixData.length);

  const sim = await conn.simulateTransaction(tx);
  console.log('--- Simulation result ---');
  console.log(JSON.stringify(sim.value, null, 2));
  if (sim.value.err) {
    console.log('\nProgram logs:');
    (sim.value.logs || []).forEach(l => console.log(l));
  } else {
    console.log('Simulation successful.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

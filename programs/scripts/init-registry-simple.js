const web3 = require('@solana/web3.js');
const fs = require('fs');

async function initializeRegistry() {
  // Create connection
  const connection = new web3.Connection('https://rpc.nexus-web3.com');
  
  // Load the deployer keypair
  const wallet = web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('deployer-keypair.json', 'utf8')))
  );
  
  // Program ID
  const PROGRAM_ID = new web3.PublicKey('CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm');
  
  // Find registry PDA
  const [registryPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    PROGRAM_ID
  );
  
  console.log('Registry PDA:', registryPda.toString());
  console.log('Authority:', wallet.publicKey.toString());
  
  try {
    // Check if registry exists
    const existingRegistry = await connection.getAccountInfo(registryPda);
    if (existingRegistry) {
      console.log('Registry already exists!');
      return;
    }
    
    // Create the instruction manually
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: registryPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: PROGRAM_ID,
      data: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]) // initialize_registry instruction discriminator
    });
    
    // Create and send transaction
    const transaction = new web3.Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign and send
    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [wallet]);
    
    console.log('Registry initialized! Transaction:', signature);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

initializeRegistry();

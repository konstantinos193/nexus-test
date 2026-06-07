const anchor = require('@coral-xyz/anchor');
const web3 = require('@solana/web3.js');

async function initializeRegistry() {
  // Create connection
  const connection = new web3.Connection('https://rpc.nexus-web3.com');
  
  // Load the deployer keypair
  const wallet = web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(require('fs').readFileSync('deployer-keypair.json', 'utf8')))
  );
  
  // Create provider
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
  anchor.setProvider(provider);
  
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
    // Load IDL
    const idl = JSON.parse(require('fs').readFileSync('target/idl/nexus_launchpad.json', 'utf8'));
    const program = new anchor.Program(idl, PROGRAM_ID, provider);
    
    // Check if registry exists
    const existingRegistry = await connection.getAccountInfo(registryPda);
    if (existingRegistry) {
      console.log('Registry already exists!');
      return;
    }
    
    // Initialize registry
    const tx = await program.methods
      .initializeRegistry()
      .accounts({
        registry: registryPda,
        authority: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log('Registry initialized! Transaction:', tx);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

initializeRegistry();

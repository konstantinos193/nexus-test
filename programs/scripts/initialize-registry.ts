import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusLaunchpad } from "../target/types/nexus_launchpad";
import { PublicKey } from "@solana/web3.js";

// Configure the provider to use the deployer keypair
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// The program ID
const PROGRAM_ID = new PublicKey("CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm");

// Find the registry PDA
const [registryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("registry")],
  PROGRAM_ID
);

async function initializeRegistry() {
  console.log("Initializing registry...");
  console.log("Registry PDA:", registryPda.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  try {
    const program = new Program<NexusLaunchpad>(
      // @ts-ignore
      require("../target/idl/nexus_launchpad.json"),
      PROGRAM_ID,
      provider
    );

    // Check if registry already exists
    const existingRegistry = await provider.connection.getAccountInfo(registryPda);
    if (existingRegistry) {
      console.log("Registry already exists!");
      return;
    }

    // Initialize the registry
    const tx = await program.methods
      .initializeRegistry()
      .accounts({
        registry: registryPda,
        authority: provider.wallet.publicKey,
        systemProgram: new PublicKey("11111111111111111111111111111111"),
      })
      .rpc();

    console.log("Registry initialized! Transaction:", tx);

    // Verify
    const registryAccount = await program.account.collectionRegistry.fetch(registryPda);
    console.log("Registry authority:", registryAccount.authority.toString());
    console.log("Registry count:", registryAccount.collectionCount);

  } catch (error) {
    console.error("Error initializing registry:", error);
  }
}

initializeRegistry();

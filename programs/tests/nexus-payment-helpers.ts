import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusPayment } from "../target/types/nexus_payment";

// Configure the client
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.NexusPayment as Program<NexusPayment>;
export const creator = provider.wallet;
export { provider };

// Same pattern as nexus-launchpad-helpers: confirm airdrop before using funds
export async function airdropAndConfirm(
  publicKey: anchor.web3.PublicKey,
  amount: number = 2 * anchor.web3.LAMPORTS_PER_SOL
): Promise<void> {
  const signature = await provider.connection.requestAirdrop(publicKey, amount);
  await provider.connection.confirmTransaction(signature);
  await new Promise(resolve => setTimeout(resolve, 500));
}

export async function waitAfterAirdrop(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Global before hook to ensure provider wallet has sufficient funds
export async function ensureProviderFunds(): Promise<void> {
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  const minBalance = 10 * anchor.web3.LAMPORTS_PER_SOL; // 10 SOL minimum
  
  if (balance < minBalance) {
    const airdropAmount = minBalance - balance + anchor.web3.LAMPORTS_PER_SOL;
    const signature = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      airdropAmount
    );
    await provider.connection.confirmTransaction(signature);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Helper to create a splitter with unique creator to avoid PDA conflicts
export async function createSplitter(feeBps: number, platformKeypair?: anchor.web3.Keypair, uniqueCreator?: anchor.web3.Keypair) {
  const platform = platformKeypair || anchor.web3.Keypair.generate();
  const creatorKey = uniqueCreator || creator;
  const [splitterPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("splitter"), creatorKey.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .initialize(feeBps)
    .accountsStrict({
      splitter: splitterPda,
      creator: creatorKey.publicKey,
      platform: platform.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers(uniqueCreator ? [uniqueCreator] : [])
    .rpc();

  return { splitterPda, platform, creator: creatorKey };
}

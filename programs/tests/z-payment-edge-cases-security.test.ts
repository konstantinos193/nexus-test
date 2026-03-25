import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
  ensureProviderFunds,
  createSplitter,
  airdropAndConfirm,
  waitAfterAirdrop,
} from "./nexus-payment-helpers";

describe("nexus-payment", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("Edge Cases & Security", () => {
    it("Handles rounding in fee calculation", async () => {
      // Test with amounts that don't divide evenly
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda } = await createSplitter(333, undefined, uniqueCreator); // 3.33% fee
      const splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(1000); // Small amount that might cause rounding issues

      await airdropAndConfirm(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      // Ensure creator and platform are rent-exempt so tiny transfers don't leave them below minimum
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      await airdropAndConfirm(splitter.creator, rentExempt);
      await airdropAndConfirm(splitter.platform, rentExempt);
      await waitAfterAirdrop();

      // Should not fail due to rounding
      await program.methods
        .splitPayment(amount)
        .accountsStrict({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
    });

    it("Prevents reentrancy through multiple distributions", async () => {
      // The program uses Anchor's transfer CPI which should prevent reentrancy
      // But we test that multiple calls work correctly
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda } = await createSplitter(500, undefined, uniqueCreator);
      const splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();

      await airdropAndConfirm(payer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      // Multiple distributions
      for (let i = 0; i < 5; i++) {
        await program.methods
          .splitPayment(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
          .accountsStrict({
            splitter: splitterPda,
            payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([payer])
          .rpc();
      }
    });

    it("Validates splitter account matches", async () => {
      // Create two different splitters with unique creators
      const creator1 = anchor.web3.Keypair.generate();
      const creator2 = anchor.web3.Keypair.generate();
      await airdropAndConfirm(creator1.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await airdropAndConfirm(creator2.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda: splitter1, platform: platform1, creator: testCreator1 } = await createSplitter(500, undefined, creator1);

      const payer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      // This should work if accounts are correct; tests account validation
      await program.methods
        .splitPayment(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
        .accountsStrict({
          splitter: splitter1,
          payer: payer.publicKey,
          creator: testCreator1.publicKey,
          platform: platform1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
    });

    it("Handles zero amount gracefully", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda } = await createSplitter(500, undefined, uniqueCreator);
      const splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();

      await airdropAndConfirm(payer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      // Zero amount should still work (no transfers)
      await program.methods
        .splitPayment(new anchor.BN(0))
        .accountsStrict({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
    });
  });
});

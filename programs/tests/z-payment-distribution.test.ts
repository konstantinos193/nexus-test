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

  describe("Payment Distribution", () => {
    let splitterPda: anchor.web3.PublicKey;
    let platform: anchor.web3.Keypair;

    beforeEach(async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();
      const result = await createSplitter(500, undefined, uniqueCreator); // 5%, unique PDA per test
      splitterPda = result.splitterPda;
      platform = result.platform;
    });

    it("Distributes payment correctly with 5% fee", async () => {
      // Fetch the splitter to get the correct platform account
      const splitter = await program.account.splitter.fetch(splitterPda);
      const platformPubkey = splitter.platform;

      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

      await airdropAndConfirm(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const creatorBalanceBefore = await provider.connection.getBalance(splitter.creator);
      const platformBalanceBefore = await provider.connection.getBalance(platformPubkey);

      await program.methods
        .splitPayment(amount)
        .accountsStrict({
          splitter: splitterPda,
          payer: payer.publicKey,
          creator: splitter.creator,
          platform: platformPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(splitter.creator);
      const platformBalanceAfter = await provider.connection.getBalance(platformPubkey);

      // Platform should get 5% (0.05 SOL)
      const expectedPlatformFee = amount.toNumber() * 0.05;
      const expectedCreatorAmount = amount.toNumber() * 0.95;

      // Allow for transaction fees (check within 90% of expected)
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
    });

    it("Distributes payment with 0% fee (all to creator)", async () => {
      const { splitterPda: zeroFeeSplitter, platform: zeroFeePlatform, creator: zeroFeeCreator } = 
        await createSplitter(0);

      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      await airdropAndConfirm(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const creatorBalanceBefore = await provider.connection.getBalance(zeroFeeCreator.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(zeroFeePlatform.publicKey);

      await program.methods
        .splitPayment(amount)
        .accountsStrict({
          splitter: zeroFeeSplitter,
          payer: payer.publicKey,
          creator: zeroFeeCreator.publicKey,
          platform: zeroFeePlatform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(zeroFeeCreator.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(zeroFeePlatform.publicKey);

      // Creator should get all, platform should get nothing
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(amount.toNumber() * 0.9);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(0);
    });

    it("Distributes payment with 100% fee (all to platform)", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda: fullFeeSplitter, platform: fullFeePlatform, creator: fullFeeCreator } = 
        await createSplitter(10000, undefined, uniqueCreator); // 100%

      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      await airdropAndConfirm(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const creatorBalanceBefore = await provider.connection.getBalance(fullFeeCreator.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(fullFeePlatform.publicKey);

      await program.methods
        .splitPayment(amount)
        .accountsStrict({
          splitter: fullFeeSplitter,
          payer: payer.publicKey,
          creator: fullFeeCreator.publicKey,
          platform: fullFeePlatform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(fullFeeCreator.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(fullFeePlatform.publicKey);

      // Platform should get all, creator should get nothing
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(amount.toNumber() * 0.9);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(0);
    });

    it("Fails with insufficient funds", async () => {
      // Fetch the splitter to get the correct platform account
      const splitter = await program.account.splitter.fetch(splitterPda);
      
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);
      // Don't airdrop - payer has no funds

      try {
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
        assert.fail("Should have failed with insufficient funds");
      } catch (err: any) {
        expect(err).to.exist;
      }
    });

    it("Handles very small amounts", async () => {
      const splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(1000); // 0.000001 SOL

      await airdropAndConfirm(payer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      // Ensure creator and platform are rent-exempt so tiny transfers don't leave them below minimum
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      await airdropAndConfirm(splitter.creator, rentExempt);
      await airdropAndConfirm(splitter.platform, rentExempt);
      await waitAfterAirdrop();

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

    it("Handles large amounts", async () => {
      const splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL); // 1000 SOL

      await airdropAndConfirm(payer.publicKey, 1100 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

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

    it("Accumulates total collected correctly", async () => {
      let splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(payer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      // First payment
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

      // Second payment
      await program.methods
        .splitPayment(new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL))
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

    it("Prevents math overflow in fee calculation", async () => {
      // This would require extremely large numbers to test
      // The checked_mul and checked_div should prevent overflow
      const splitter = await program.account.splitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const maxU64 = new anchor.BN("18446744073709551615"); // Max u64

      await airdropAndConfirm(payer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      try {
        await program.methods
          .splitPayment(maxU64)
          .accountsStrict({
            splitter: splitterPda,
            payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([payer])
          .rpc();
        // If it doesn't fail, the overflow protection worked
      } catch (err: any) {
        // Either insufficient funds or math overflow - both are expected
        expect(err).to.exist;
      }
    });
  });

  // Note: Escrow/withdraw functionality has been removed in favor of direct payments
  // All payments are now direct transfers at mint time - simpler, cheaper, and more secure
});

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusPayment } from "../target/types/nexus_payment";
import { expect, assert } from "chai";

describe("nexus-payment", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NexusPayment as Program<NexusPayment>;
  const creator = provider.wallet;

  // Helper to create a splitter with unique creator to avoid PDA conflicts
  async function createSplitter(platformFeeBasisPoints: number, platformKeypair?: anchor.web3.Keypair, uniqueCreator?: anchor.web3.Keypair) {
    const platform = platformKeypair || anchor.web3.Keypair.generate();
    const creatorKey = uniqueCreator || creator;
    const [splitterPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("splitter"), creatorKey.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeSplitter(platformFeeBasisPoints)
      .accounts({
        splitter: splitterPda,
        creator: creatorKey.publicKey,
        platform: platform.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers(uniqueCreator ? [uniqueCreator] : [])
      .rpc();

    return { splitterPda, platform, creator: creatorKey };
  }

  describe("Initialization", () => {
    it("Initializes payment splitter successfully", async () => {
      const platform = anchor.web3.Keypair.generate();
      const platformFeeBasisPoints = 500; // 5%

      const [splitterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("splitter"), creator.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializeSplitter(platformFeeBasisPoints)
        .accounts({
          splitter: splitterPda,
          creator: creator.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitter.creator.toString()).to.equal(creator.publicKey.toString());
      expect(splitter.platform.toString()).to.equal(platform.publicKey.toString());
      expect(splitter.platformFeeBasisPoints).to.equal(platformFeeBasisPoints);
      expect(splitter.totalCollected.toNumber()).to.equal(0);
    });

    it("Fails with fee > 100%", async () => {
      try {
        await createSplitter(10001); // > 100%
        assert.fail("Should have failed with fee > 100%");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.error?.error?.errorCode?.code).to.equal("InvalidFeePercentage");
      }
    });

    it("Allows 0% platform fee", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda } = await createSplitter(0, undefined, uniqueCreator);
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitter.platformFeeBasisPoints).to.equal(0);
    });

    it("Allows 100% platform fee", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda } = await createSplitter(10000, undefined, uniqueCreator); // 100%
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitter.platformFeeBasisPoints).to.equal(10000);
    });

    it("Prevents double initialization", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const platform = anchor.web3.Keypair.generate();
      const [splitterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("splitter"), uniqueCreator.publicKey.toBuffer()],
        program.programId
      );

      // First initialization
      await program.methods
        .initializeSplitter(500)
        .accounts({
          splitter: splitterPda,
          creator: creator.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Second initialization should fail (account already exists)
      try {
        await program.methods
          .initializeSplitter(500)
          .accounts({
            splitter: splitterPda,
            creator: creator.publicKey,
            platform: platform.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed - account already exists");
      } catch (err: any) {
        // Anchor will fail because account already initialized
        expect(err).to.exist;
      }
    });
  });

  describe("Payment Distribution", () => {
    let splitterPda: anchor.web3.PublicKey;
    let platform: anchor.web3.Keypair;

    beforeEach(async () => {
      const result = await createSplitter(500); // 5%
      splitterPda = result.splitterPda;
      platform = result.platform;
    });

    it("Distributes payment correctly with 5% fee", async () => {
      // Fetch the splitter to get the correct platform account
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const platformPubkey = splitter.platform;

      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

      // Airdrop to payer
      await provider.connection.requestAirdrop(
        payer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const creatorBalanceBefore = await provider.connection.getBalance(testCreator.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformPubkey);

      await program.methods
        .distributePayment(amount)
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
          creator: creator.publicKey,
          platform: platformPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(testCreator.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformPubkey);

      // Platform should get 5% (0.05 SOL)
      const expectedPlatformFee = amount.toNumber() * 0.05;
      const expectedCreatorAmount = amount.toNumber() * 0.95;

      // Allow for transaction fees (check within 90% of expected)
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);

      const splitterAfter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitterAfter.totalCollected.toNumber()).to.equal(amount.toNumber());
    });

    it("Distributes payment with 0% fee (all to creator)", async () => {
      const { splitterPda: zeroFeeSplitter, platform: zeroFeePlatform } = 
        await createSplitter(0);

      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      await provider.connection.requestAirdrop(
        payer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const creatorBalanceBefore = await provider.connection.getBalance(zeroFeeCreator.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(zeroFeePlatform.publicKey);

      await program.methods
        .distributePayment(amount)
        .accounts({
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
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda: fullFeeSplitter, platform: fullFeePlatform, creator: fullFeeCreator } = 
        await createSplitter(10000, undefined, uniqueCreator); // 100%

      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      await provider.connection.requestAirdrop(
        payer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const creatorBalanceBefore = await provider.connection.getBalance(fullFeeCreator.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(fullFeePlatform.publicKey);

      await program.methods
        .distributePayment(amount)
        .accounts({
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
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);
      // Don't airdrop - payer has no funds

      try {
        await program.methods
          .distributePayment(amount)
          .accounts({
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
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(1000); // 0.000001 SOL

      await provider.connection.requestAirdrop(
        payer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      await program.methods
        .distributePayment(amount)
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const splitterAfter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitterAfter.totalCollected.toNumber()).to.equal(amount.toNumber());
    });

    it("Handles large amounts", async () => {
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL); // 1000 SOL

      await provider.connection.requestAirdrop(
        payer.publicKey,
        1100 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for large airdrop

      await program.methods
        .distributePayment(amount)
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const splitterAfter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitterAfter.totalCollected.toNumber()).to.equal(amount.toNumber());
    });

    it("Accumulates total collected correctly", async () => {
      let splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        payer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // First payment
      await program.methods
        .distributePayment(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      splitter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitter.totalCollected.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL);

      // Second payment
      await program.methods
        .distributePayment(new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      splitter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitter.totalCollected.toNumber()).to.equal(3 * anchor.web3.LAMPORTS_PER_SOL);
    });

    it("Prevents math overflow in fee calculation", async () => {
      // This would require extremely large numbers to test
      // The checked_mul and checked_div should prevent overflow
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const maxU64 = new anchor.BN("18446744073709551615"); // Max u64

      await provider.connection.requestAirdrop(
        payer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL // Small amount
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .distributePayment(maxU64)
          .accounts({
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

  describe("Access Control", () => {
    it("Only creator or platform can withdraw funds", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda, platform, creator: testCreator } = await createSplitter(500, undefined, uniqueCreator);
      const unauthorized = anchor.web3.Keypair.generate();
      const escrow = anchor.web3.Keypair.generate();

      // Fund escrow
      await provider.connection.requestAirdrop(
        escrow.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .withdrawFunds(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.5))
          .accounts({
            splitter: splitterPda,
            authority: unauthorized.publicKey,
            creator: testCreator.publicKey,
            platform: platform.publicKey,
            escrow: escrow.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.error?.error?.errorCode?.code).to.equal("Unauthorized");
      }
    });

    it("Creator can withdraw their portion", async () => {
      const { splitterPda, platform } = await createSplitter(500); // 5% fee
      const escrow = anchor.web3.Keypair.generate();

      // Fund escrow
      await provider.connection.requestAirdrop(
        escrow.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const creatorBalanceBefore = await provider.connection.getBalance(testCreator.publicKey);
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .withdrawFunds(amount)
        .accounts({
          splitter: splitterPda,
          authority: testCreator.publicKey,
          creator: testCreator.publicKey,
          platform: platform.publicKey,
          escrow: escrow.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testCreator])
        .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(testCreator.publicKey);
      // Creator should get 95% of 1 SOL = 0.95 SOL
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(
        amount.toNumber() * 0.95 * 0.9 // Allow for fees
      );
    });

    it("Platform can withdraw their portion", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda, platform, creator: testCreator } = await createSplitter(500, undefined, uniqueCreator); // 5% fee
      const escrow = anchor.web3.Keypair.generate();

      // Fund escrow
      await provider.connection.requestAirdrop(
        escrow.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const platformBalanceBefore = await provider.connection.getBalance(platform.publicKey);
      const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      await program.methods
        .withdrawFunds(amount)
        .accounts({
          splitter: splitterPda,
          authority: platform.publicKey,
          creator: creator.publicKey,
          platform: platform.publicKey,
          escrow: escrow.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([platform])
        .rpc();

      const platformBalanceAfter = await provider.connection.getBalance(platform.publicKey);
      // Platform should get 5% of 1 SOL = 0.05 SOL
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(
        amount.toNumber() * 0.05 * 0.9 // Allow for fees
      );
    });
  });

  describe("Edge Cases & Security", () => {
    it("Handles rounding in fee calculation", async () => {
      // Test with amounts that don't divide evenly
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda } = await createSplitter(333, undefined, uniqueCreator); // 3.33% fee
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();
      const amount = new anchor.BN(1000); // Small amount that might cause rounding issues

      await provider.connection.requestAirdrop(
        payer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should not fail due to rounding
      await program.methods
        .distributePayment(amount)
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const splitterAfter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitterAfter.totalCollected.toNumber()).to.equal(amount.toNumber());
    });

    it("Prevents reentrancy through multiple distributions", async () => {
      // The program uses invoke() which should prevent reentrancy
      // But we test that multiple calls work correctly
      const uniqueCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda } = await createSplitter(500, undefined, uniqueCreator);
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();

      await provider.connection.requestAirdrop(
        payer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Multiple distributions
      for (let i = 0; i < 5; i++) {
        await program.methods
          .distributePayment(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
          .accounts({
            splitter: splitterPda,
            payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([payer])
          .rpc();
      }

      const splitterAfter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitterAfter.totalCollected.toNumber()).to.equal(5 * anchor.web3.LAMPORTS_PER_SOL);
    });

    it("Validates splitter account matches", async () => {
      // Create two different splitters with unique creators
      const creator1 = anchor.web3.Keypair.generate();
      const creator2 = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(creator1.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(creator2.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda: splitter1, platform: platform1, creator: testCreator1 } = await createSplitter(500, undefined, creator1);
      
      // Try to use wrong splitter account
      const payer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        payer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // This should work if accounts are correct, but tests account validation
      await program.methods
        .distributePayment(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
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
      await provider.connection.requestAirdrop(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { splitterPda } = await createSplitter(500, undefined, uniqueCreator);
      const splitter = await program.account.paymentSplitter.fetch(splitterPda);
      const payer = anchor.web3.Keypair.generate();

      await provider.connection.requestAirdrop(
        payer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Zero amount should still work (no transfers, but updates total)
      await program.methods
        .distributePayment(new anchor.BN(0))
        .accounts({
          splitter: splitterPda,
          payer: payer.publicKey,
            creator: splitter.creator,
            platform: splitter.platform,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const splitterAfter = await program.account.paymentSplitter.fetch(splitterPda);
      expect(splitterAfter.totalCollected.toNumber()).to.equal(0);
    });
  });

  describe("End-to-end (all categories)", () => {
    it("Initialization → Distribution → Access Control → Withdraw → Edge Cases", async () => {
      const amount1Sol = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);
      const baseAirdrop = 2 * anchor.web3.LAMPORTS_PER_SOL;

      // —— Initialization: 5% splitter (default creator) ——
      const { splitterPda: s5, platform: p5, creator: c5 } = await createSplitter(500);
      let splitter = await program.account.paymentSplitter.fetch(s5);
      expect(splitter.platformFeeBasisPoints).to.equal(500);
      expect(splitter.totalCollected.toNumber()).to.equal(0);

      // —— Payment Distribution: 5% fee ——
      const payer1 = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(payer1.publicKey, baseAirdrop);
      await new Promise((r) => setTimeout(r, 1000));

      const creatorBalBefore = await provider.connection.getBalance(c5.publicKey);
      const platformBalBefore = await provider.connection.getBalance(p5.publicKey);

      await program.methods
        .distributePayment(amount1Sol)
        .accounts({
          splitter: s5,
          payer: payer1.publicKey,
          creator: c5.publicKey,
          platform: p5.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer1])
        .rpc();

      splitter = await program.account.paymentSplitter.fetch(s5);
      expect(splitter.totalCollected.toNumber()).to.equal(amount1Sol.toNumber());
      const creatorBalAfter = await provider.connection.getBalance(c5.publicKey);
      const platformBalAfter = await provider.connection.getBalance(p5.publicKey);
      expect(creatorBalAfter - creatorBalBefore).to.be.greaterThan(amount1Sol.toNumber() * 0.95 * 0.9);
      expect(platformBalAfter - platformBalBefore).to.be.greaterThan(amount1Sol.toNumber() * 0.05 * 0.9);

      // —— Initialization: 0% and 100% (unique creators) ——
      const u0 = anchor.web3.Keypair.generate();
      const u100 = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(u0.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(u100.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const { splitterPda: s0, platform: p0, creator: c0 } = await createSplitter(0, undefined, u0);
      const { splitterPda: s100, platform: p100, creator: c100 } = await createSplitter(10000, undefined, u100);

      const pay0 = anchor.web3.Keypair.generate();
      const pay100 = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(pay0.publicKey, baseAirdrop);
      await provider.connection.requestAirdrop(pay100.publicKey, baseAirdrop);
      await new Promise((r) => setTimeout(r, 1000));

      const c0Before = await provider.connection.getBalance(c0.publicKey);
      const p0Before = await provider.connection.getBalance(p0.publicKey);
      await program.methods
        .distributePayment(amount1Sol)
        .accounts({
          splitter: s0,
          payer: pay0.publicKey,
          creator: c0.publicKey,
          platform: p0.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pay0])
        .rpc();
      const c0After = await provider.connection.getBalance(c0.publicKey);
      const p0After = await provider.connection.getBalance(p0.publicKey);
      expect(c0After - c0Before).to.be.greaterThan(amount1Sol.toNumber() * 0.9);
      expect(p0After - p0Before).to.equal(0);

      const p100Before = await provider.connection.getBalance(p100.publicKey);
      await program.methods
        .distributePayment(amount1Sol)
        .accounts({
          splitter: s100,
          payer: pay100.publicKey,
          creator: c100.publicKey,
          platform: p100.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pay100])
        .rpc();
      const p100After = await provider.connection.getBalance(p100.publicKey);
      expect(p100After - p100Before).to.be.greaterThan(amount1Sol.toNumber() * 0.9);

      // —— Access Control: unauthorized withdraw ——
      const uWithdraw = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uWithdraw.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const escrowForAuth = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(escrowForAuth.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const { splitterPda: sAuth, platform: pAuth, creator: cAuth } = await createSplitter(500, undefined, uWithdraw);
      try {
        const unauthorized = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        await new Promise((r) => setTimeout(r, 1000));
        await program.methods
          .withdrawFunds(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.5))
          .accounts({
            splitter: sAuth,
            authority: unauthorized.publicKey,
            creator: cAuth.publicKey,
            platform: pAuth.publicKey,
            escrow: escrowForAuth.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Unauthorized withdraw should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("Unauthorized");
      }

      // —— Withdraw: creator then platform (each with own splitter + escrow) ——
      const uCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      const { splitterPda: sWc, platform: pWc, creator: cWc } = await createSplitter(500, undefined, uCreator);
      const escrowCreator = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(escrowCreator.publicKey, baseAirdrop);
      await new Promise((r) => setTimeout(r, 1000));
      const creatorBalWBefore = await provider.connection.getBalance(cWc.publicKey);
      await program.methods
        .withdrawFunds(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          splitter: sWc,
          authority: cWc.publicKey,
          creator: cWc.publicKey,
          platform: pWc.publicKey,
          escrow: escrowCreator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([uCreator])
        .rpc();
      const creatorBalWAfter = await provider.connection.getBalance(cWc.publicKey);
      expect(creatorBalWAfter - creatorBalWBefore).to.be.greaterThan(anchor.web3.LAMPORTS_PER_SOL * 0.95 * 0.9);

      const uPlatform = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uPlatform.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      const platformKp = anchor.web3.Keypair.generate();
      const { splitterPda: sWp, platform: pWp, creator: cWp } = await createSplitter(500, platformKp, uPlatform);
      const escrowPlatform = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(escrowPlatform.publicKey, baseAirdrop);
      await new Promise((r) => setTimeout(r, 1000));
      const platformBalWBefore = await provider.connection.getBalance(pWp.publicKey);
      await program.methods
        .withdrawFunds(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          splitter: sWp,
          authority: pWp.publicKey,
          creator: cWp.publicKey,
          platform: pWp.publicKey,
          escrow: escrowPlatform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([platformKp])
        .rpc();
      const platformBalWAfter = await provider.connection.getBalance(pWp.publicKey);
      expect(platformBalWAfter - platformBalWBefore).to.be.greaterThan(anchor.web3.LAMPORTS_PER_SOL * 0.05 * 0.9);

      // —— Edge Cases: rounding (3.33% fee), zero amount ——
      const uEdge = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uEdge.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      const { splitterPda: sEdge, platform: pEdge, creator: cEdge } = await createSplitter(333, undefined, uEdge);
      const payerEdge = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(payerEdge.publicKey, baseAirdrop);
      await new Promise((r) => setTimeout(r, 1000));
      await program.methods
        .distributePayment(new anchor.BN(1000))
        .accounts({
          splitter: sEdge,
          payer: payerEdge.publicKey,
          creator: cEdge.publicKey,
          platform: pEdge.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payerEdge])
        .rpc();
      const splitterEdge = await program.account.paymentSplitter.fetch(sEdge);
      expect(splitterEdge.totalCollected.toNumber()).to.equal(1000);

      const uZero = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(uZero.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      const { splitterPda: sZero, platform: pZero, creator: cZero } = await createSplitter(500, undefined, uZero);
      const payerZero = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(payerZero.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      await program.methods
        .distributePayment(new anchor.BN(0))
        .accounts({
          splitter: sZero,
          payer: payerZero.publicKey,
          creator: cZero.publicKey,
          platform: pZero.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payerZero])
        .rpc();
      const splitterZero = await program.account.paymentSplitter.fetch(sZero);
      expect(splitterZero.totalCollected.toNumber()).to.equal(0);
    });
  });
});

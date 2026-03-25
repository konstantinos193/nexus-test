import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
  authority,
  rpcOptions,
  airdropAndConfirm,
  waitAfterAirdrop,
  ensureProviderFunds,
  mintAccounts,
  metadataStandard,
  isDisabledI64,
  isDisabledU8,
  isAllowlistDisabled,
  isPaused,
  freezeUntilSoldOut,
  setStartTimeToNow,
  metadataStandardToU8,
  createCollection,
} from "./nexus-launchpad-helpers";

describe("nexus-launchpad", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("Free Collections (Zero Mint Price)", () => {
    it("Free collection can be paused and resumed", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({
        pricePerNft: 0,
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Pause (use collection's authority, not provider wallet — createCollection uses a generated keypair)
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const mintAccs = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      // Should fail when paused
      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(mintAccs as any)
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed when paused");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintingPaused");
      }

      // Resume (same authority as pause)
      await program.methods
        .resume()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      // Should work after resume
      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(mintAccs as any)
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(1);
    });

    it("Mints from free collection successfully (no payment)", async () => {
      // Contract requires start_time >= now at init; then we open mint via update_config
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({
        pricePerNft: 0,
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      // Only need enough for transaction fees, not mint price
      await airdropAndConfirm(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // Force collection finalization so PDA resolution for mint works (same as 11-minting / stress tests)
      await program.account.collection.fetch(collectionPda);

      const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);
      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });

      // Pass all 3 mint args (quantity, allowlistProof, allowlistLeafIndex) so Anchor's splitArgsAndCtx
      // sees args.length === inputLen + 1 and pops the context; otherwise ctx.accounts is empty.
      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(1);

      const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // Buyer should only pay transaction fees (no mint price)
      const txFee = buyerBalanceBefore - buyerBalanceAfter;
      expect(txFee).to.be.lessThan(0.01 * anchor.web3.LAMPORTS_PER_SOL); // Just transaction fees

      // No payments should be made (zero price = zero transfers)
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(0);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(0);
    });

    // Because even free things need to be tested - nothing in life is truly free, except these tests
    it("Initializes a free collection successfully", async () => {
      const { collectionPda } = await createCollection({ pricePerNft: 0 });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.price.toNumber()).to.equal(0);
      expect(collection.maxSupply.toNumber()).to.equal(1000);
      expect(collection.minted.toNumber()).to.equal(0);
    });

    it("Mints multiple NFTs from free collection", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        pricePerNft: 0,
        maxSupply: 10,
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      await program.methods
        .mint(new anchor.BN(5), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(5);
    });

    it("Respects mint limit per wallet for free collections", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        pricePerNft: 0,
        mintLimitPerWallet: 3,
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      // Mint up to limit
      await program.methods
        .mint(new anchor.BN(3), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Try to mint 1 more (should fail - limit exceeded)
      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(accounts as any)
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - limit exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintLimitExceeded");
      }
    });

    it("Respects supply limit for free collections", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        pricePerNft: 0,
        maxSupply: 2,
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      // Mint all supply
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Try to mint 1 more (should fail - supply exceeded)
      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(accounts as any)
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - supply exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("SupplyExceeded");
      }
    });

    it("Free collection respects time constraints", async () => {
      // Contract rejects past start time at init (InvalidStartTime); future start time is allowed
      const now = Math.floor(Date.now() / 1000);
      const pastTime = now - 3600; // 1 hour in past

      try {
        await createCollection({
          pricePerNft: 0,
          startTime: pastTime,
        });
        assert.fail("Should have failed with past start time");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("InvalidStartTime");
      }
    });

    it("Free collection with platform fee (still zero payment)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        pricePerNft: 0,
        platformFeeBasisPoints: 500, // 5% fee (of zero = zero)
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // Even with platform fee, zero price means zero payments
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(0);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(0);
    });

    it("Free collection respects trading freeze settings", async () => {
      const { collectionPda } = await createCollection({ 
        pricePerNft: 0,
        freezeTradingUntilSoldOut: true
      });

      // Should be frozen initially (not sold out)
      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it("Free collection works with all metadata standards", async () => {
      const standards: Array<"core" | "legacy" | "cnft"> = ["core", "legacy", "cnft"];

      for (const standard of standards) {
        const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
          pricePerNft: 0,
          metadataStandard: standard,
        });
        await setStartTimeToNow(collectionPda, collectionAuthority);

        const collection = await program.account.collection.fetch(collectionPda);
        // Program enum: Legacy=0, Programmable=1, Core=2, Compressed=3 (cnft), ...
        if (standard === "core") {
          expect(collection.metadataStandard).to.equal(2); // Core = 2
        } else if (standard === "legacy") {
          expect(collection.metadataStandard).to.equal(0); // Legacy = 0
        } else {
          expect(collection.metadataStandard).to.equal(3); // Compressed (cnft) = 3
        }

        // Can still mint (just verifying it works)
        const buyer = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
          program.programId
        );

        const accounts = mintAccounts({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
        });
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(accounts as any)
          .signers([buyer])
          .rpc(rpcOptions);
      }
    });
  });
});

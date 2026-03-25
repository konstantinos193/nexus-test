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

  describe("Platform Fee", () => {
    it("Initializes with platform fee", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const { collectionPda } = await createCollection({ platformFeeBasisPoints });
      
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.platformFeeBps).to.equal(platformFeeBasisPoints);
    });

    it("Fails to initialize with fee > 100%", async () => {
      try {
        await createCollection({ platformFeeBasisPoints: 10001 });
        assert.fail("Should have failed with fee > 100%");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("InvalidFeePercentage");
      }
    });

    it("Allows 0% platform fee", async () => {
      const { collectionPda } = await createCollection({ platformFeeBasisPoints: 0 });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.platformFeeBps).to.equal(0);
    });

    it("Allows 100% platform fee", async () => {
      const { collectionPda } = await createCollection({ platformFeeBasisPoints: 10000 });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.platformFeeBps).to.equal(10000);
    });

    it("Pays creator directly to wallet on mint (not on claim)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({
        platformFeeBasisPoints: 500,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1,
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );
      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(0);
    });

    it("Distributes payment correctly with 5% fee", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const amount = anchor.web3.LAMPORTS_PER_SOL * 0.1;
      const expectedPlatformFee = amount * 0.05;
      const expectedCreatorAmount = amount * 0.95;

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // Allow for transaction fees (check within 90% of expected)
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
    });

    it("Distributes payment with 0% fee (all to creator)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints: 0,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const amount = anchor.web3.LAMPORTS_PER_SOL * 0.1;
      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // All should go to creator
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(amount * 0.9);
      // Platform should get nothing (or minimal transaction fees)
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(0);
    });

    it("Distributes payment with 100% fee (all to platform)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints: 10000,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const amount = anchor.web3.LAMPORTS_PER_SOL * 0.1;
      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // Platform should get all
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(amount * 0.9);
      // Creator should get nothing
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(0);
    });

    it("Updates platform fee correctly", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({ platformFeeBasisPoints: 500 });
      
      let collection = await program.account.collection.fetch(collectionPda);
      expect(collection.platformFeeBps).to.equal(500);

      await program.methods
        .updatePlatformFee(1000) // 10%
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      collection = await program.account.collection.fetch(collectionPda);
      expect(collection.platformFeeBps).to.equal(1000);
    });

    it("Fails to update platform fee with invalid percentage", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      
      try {
        await program.methods
          .updatePlatformFee(10001)
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers([collectionAuthority])
          .rpc(rpcOptions);
        assert.fail("Should have failed with invalid fee");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("InvalidFeePercentage");
      }
    });

    it("Only authority can update platform fee", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .updatePlatformFee(1000)
          .accountsStrict({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }
    });

    it("Handles multiple mints with fee correctly", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const quantity = 3;
      const totalAmount = anchor.web3.LAMPORTS_PER_SOL * 0.1 * quantity;
      const expectedPlatformFee = totalAmount * 0.05;
      const expectedCreatorAmount = totalAmount * 0.95;

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(quantity), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
    });

    it("Handles rounding in fee calculation", async () => {
      const platformFeeBasisPoints = 333; // 3.33%
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        pricePerNft: 1000000 // 0.001 SOL
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      await airdropAndConfirm(creatorWallet.publicKey, rentExempt);
      await airdropAndConfirm(platformWallet.publicKey, rentExempt);
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // Both should receive something (rounding handled correctly)
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(0);
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(0);
    });

    it("Platform fee with very small amount (1 lamport)", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        pricePerNft: 1 // 1 lamport
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      await airdropAndConfirm(creatorWallet.publicKey, rentExempt);
      await airdropAndConfirm(platformWallet.publicKey, rentExempt);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      // With 1 lamport and 5% fee, rounding may favor one party, but both should get something or total should be correct
      const totalReceived = (creatorBalanceAfter - creatorBalanceBefore) + (platformBalanceAfter - platformBalanceBefore);
      expect(totalReceived).to.be.greaterThan(0);
    });

    it("Updates base URI successfully", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      
      const newBaseUri = "https://example.com/metadata/";
      await program.methods
        .updateBaseUri(newBaseUri)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.baseUri).to.equal(newBaseUri);
    });

    it("Only authority can update base URI", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .updateBaseUri("https://hacked.com/metadata/")
          .accountsStrict({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }
    });

    it("Base URI truncates to 200 characters", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      
      // Create a URI longer than 200 characters
      const longUri = "https://example.com/" + "a".repeat(250) + "/metadata/";
      await program.methods
        .updateBaseUri(longUri)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.baseUri.length).to.be.at.most(200);
    });

    it("Base URI can be updated multiple times", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      
      const firstUri = "https://first.com/metadata/";
      await program.methods
        .updateBaseUri(firstUri)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      let collection = await program.account.collection.fetch(collectionPda);
      expect(collection.baseUri).to.equal(firstUri);

      const secondUri = "https://second.com/metadata/";
      await program.methods
        .updateBaseUri(secondUri)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      collection = await program.account.collection.fetch(collectionPda);
      expect(collection.baseUri).to.equal(secondUri);
    });

    it("Base URI initializes to empty string", async () => {
      const { collectionPda } = await createCollection({});
      
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.baseUri).to.equal("");
    });

    it("Platform fee update affects new mints but not old ones", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints: 500, // 5%
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // Mint with 5% fee
      const amount1 = anchor.web3.LAMPORTS_PER_SOL * 0.1;
      const creatorBalanceBefore1 = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore1 = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter1 = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter1 = await provider.connection.getBalance(platformWallet.publicKey);
      const creatorReceived1 = creatorBalanceAfter1 - creatorBalanceBefore1;
      const platformReceived1 = platformBalanceAfter1 - platformBalanceBefore1;

      // Update fee to 10%
      await program.methods
        .updatePlatformFee(1000)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      // Mint with 10% fee
      const creatorBalanceBefore2 = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore2 = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter2 = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter2 = await provider.connection.getBalance(platformWallet.publicKey);
      const creatorReceived2 = creatorBalanceAfter2 - creatorBalanceBefore2;
      const platformReceived2 = platformBalanceAfter2 - platformBalanceBefore2;

      // Second mint should have higher platform fee (10% vs 5%)
      expect(platformReceived2).to.be.greaterThan(platformReceived1);
      expect(creatorReceived2).to.be.lessThan(creatorReceived1);
    });

    it("Platform fee with max u8 quantity (255)", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        maxSupply: 1000,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.01, // Lower price for large quantity
        mintLimitPerWallet: null // No limit
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const quantity = 255; // Max u8
      const totalAmount = anchor.web3.LAMPORTS_PER_SOL * 0.01 * quantity;
      const expectedPlatformFee = totalAmount * 0.05;
      const expectedCreatorAmount = totalAmount * 0.95;

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(quantity), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
    });

    it("Platform fee calculation with exact remaining supply", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        maxSupply: 10,
        pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1,
        mintLimitPerWallet: 10, // allow one wallet to mint full supply (5 + 5)
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // Mint 5 first
      await program.methods
        .mint(new anchor.BN(5), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      // Mint remaining 5 (exact remaining supply)
      const amount = anchor.web3.LAMPORTS_PER_SOL * 0.1 * 5;
      const expectedPlatformFee = amount * 0.05;
      const expectedCreatorAmount = amount * 0.95;

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(5), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(10);
    });

    it("Platform fee with different percentages (1%, 50%, 99%)", async () => {
      const percentages = [100, 5000, 9900]; // 1%, 50%, 99%
      
      for (const feeBasisPoints of percentages) {
        const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
          platformFeeBasisPoints: feeBasisPoints,
          pricePerNft: anchor.web3.LAMPORTS_PER_SOL * 0.1
        });
        await setStartTimeToNow(collectionPda, collectionAuthority);
        const buyer = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
          program.programId
        );

        const amount = anchor.web3.LAMPORTS_PER_SOL * 0.1;
        const expectedPlatformFee = amount * (feeBasisPoints / 10000);
        const expectedCreatorAmount = amount * (1 - feeBasisPoints / 10000);

        const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
        const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc(rpcOptions);

        const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
        const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

        expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
        expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
      }
    });

    it("Platform fee with very large price", async () => {
      const platformFeeBasisPoints = 500; // 5%
      const largePrice = anchor.web3.LAMPORTS_PER_SOL * 100; // 100 SOL
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        platformFeeBasisPoints,
        pricePerNft: largePrice
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 200 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const expectedPlatformFee = largePrice * 0.05;
      const expectedCreatorAmount = largePrice * 0.95;

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceBefore = await provider.connection.getBalance(platformWallet.publicKey);

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const creatorBalanceAfter = await provider.connection.getBalance(creatorWallet.publicKey);
      const platformBalanceAfter = await provider.connection.getBalance(platformWallet.publicKey);

      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.greaterThan(expectedCreatorAmount * 0.9);
      expect(platformBalanceAfter - platformBalanceBefore).to.be.greaterThan(expectedPlatformFee * 0.9);
    });
  });
});

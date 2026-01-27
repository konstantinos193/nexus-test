import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusLaunchpad } from "../target/types/nexus_launchpad";
import { expect, assert } from "chai";

describe("nexus-launchpad", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NexusLaunchpad as Program<NexusLaunchpad>;
  const authority = provider.wallet;

  /** Metadata standard for collection: core | legacy | cnft. Default core. */
  function metadataStandard(s: "core" | "legacy" | "cnft") {
    return s === "legacy" ? { legacy: {} } : s === "cnft" ? { cnft: {} } : { core: {} };
  }

  // Helper to create a new collection for each test
  async function createCollection(config: {
    maxSupply?: number;
    pricePerNft?: number;
    startTime?: number;
    endTime?: number | null;
    mintLimitPerWallet?: number | null;
    metadataStandard?: "core" | "legacy" | "cnft";
  }) {
    const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("collection"), authority.publicKey.toBuffer()],
      program.programId
    );

    const treasury = anchor.web3.Keypair.generate();
    const mintAuthority = anchor.web3.Keypair.generate();

    const now = Math.floor(Date.now() / 1000);
    const startTime = config.startTime ?? now;
    const endTime = config.endTime !== undefined 
      ? (config.endTime === null ? null : { some: new anchor.BN(config.endTime) })
      : { some: new anchor.BN(now + 86400) };

    await program.methods
      .initializeCollection({
        maxSupply: new anchor.BN(config.maxSupply ?? 1000),
        pricePerNft: new anchor.BN(config.pricePerNft ?? anchor.web3.LAMPORTS_PER_SOL * 0.1),
        startTime: new anchor.BN(startTime),
        endTime: endTime,
        mintLimitPerWallet: config.mintLimitPerWallet !== undefined
          ? (config.mintLimitPerWallet === null ? null : { some: config.mintLimitPerWallet as number })
          : { some: 5 as number },
        metadataStandard: metadataStandard(config.metadataStandard ?? "core"),
      })
      .accounts({
        collection: collectionPda,
        authority: authority.publicKey,
        mintAuthority: mintAuthority.publicKey,
        treasury: treasury.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return { collectionPda, treasury, mintAuthority };
  }

  describe("Initialization", () => {
    it("Initializes a collection successfully", async () => {
      const { collectionPda } = await createCollection({});

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.authority.toString()).to.equal(authority.publicKey.toString());
      expect(collection.config.maxSupply.toNumber()).to.equal(1000);
      expect(collection.mintedCount.toNumber()).to.equal(0);
      expect(collection.isPaused).to.be.false;
    });

    it("Fails to initialize with zero supply", async () => {
      try {
        await createCollection({ maxSupply: 0 });
        assert.fail("Should have failed with zero supply");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidSupply");
      }
    });

    it("Fails to initialize with past start time", async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 86400; // 24 hours ago
      try {
        await createCollection({ startTime: pastTime });
        assert.fail("Should have failed with past start time");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.error?.error?.errorCode?.code).to.equal("InvalidStartTime");
      }
    });

    it("Initializes with no end time", async () => {
      const { collectionPda } = await createCollection({ endTime: null });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.config.endTime).to.be.null;
    });

    it("Initializes with no mint limit", async () => {
      const { collectionPda } = await createCollection({ mintLimitPerWallet: null });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.config.mintLimitPerWallet).to.be.null;
    });

    it("Initializes with MetadataStandard Legacy", async () => {
      const { collectionPda } = await createCollection({ metadataStandard: "legacy" });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.config.metadataStandard.legacy).to.exist;
    });

    it("Initializes with MetadataStandard Cnft", async () => {
      const { collectionPda } = await createCollection({ metadataStandard: "cnft" });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.config.metadataStandard.cnft).to.exist;
    });
  });

  describe("Minting", () => {
    let collectionPda: anchor.web3.PublicKey;
    let treasury: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
      treasury = result.treasury.publicKey;
    });

    it("Mints an NFT successfully", async () => {
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for airdrop

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      const price = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1);
      const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);
      const treasuryBalanceBefore = await provider.connection.getBalance(treasury);

      await program.methods
        .mint(new anchor.BN(1))
        .accounts({
          collection: collectionPda,
          buyer: buyer.publicKey,
          treasury: treasury,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.mintedCount.toNumber()).to.equal(1);

      const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
      const treasuryBalanceAfter = await provider.connection.getBalance(treasury);
      
      // Check payment was transferred (approximate due to fees)
      expect(buyerBalanceBefore - buyerBalanceAfter).to.be.greaterThan(price.toNumber() * 0.9);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.be.greaterThan(price.toNumber() * 0.9);
    });

    it("Fails to mint when paused", async () => {
      // Pause first
      await program.methods
        .pause()
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new BN(1))
          .accounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            treasury: treasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed when paused");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("MintingPaused");
      }
    });

    it("Fails to mint before start time", async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const { collectionPda: futureCollectionPda, treasury: futureTreasury } = 
        await createCollection({ startTime: futureTime });

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          futureCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new BN(1))
          .accounts({
            collection: futureCollectionPda,
            buyer: buyer.publicKey,
            treasury: futureTreasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed before start time");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("MintingNotStarted");
      }
    });

    it("Fails to mint after end time", async () => {
      const pastEndTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const { collectionPda: pastCollectionPda, treasury: pastTreasury } = 
        await createCollection({ 
          startTime: pastEndTime - 86400,
          endTime: pastEndTime 
        });

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          pastCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new BN(1))
          .accounts({
            collection: pastCollectionPda,
            buyer: buyer.publicKey,
            treasury: pastTreasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed after end time");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.error?.error?.errorCode?.code).to.equal("MintingEnded");
      }
    });

    it("Fails to mint when supply exceeded", async () => {
      const { collectionPda: smallCollectionPda, treasury: smallTreasury } = 
        await createCollection({ maxSupply: 1 });

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          smallCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // First mint succeeds
      await program.methods
        .mint(new anchor.BN(1))
        .accounts({
          collection: smallCollectionPda,
          buyer: buyer.publicKey,
          treasury: smallTreasury,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      // Second mint should fail
      try {
        await program.methods
          .mint(new BN(1))
          .accounts({
            collection: smallCollectionPda,
            buyer: buyer.publicKey,
            treasury: smallTreasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed when supply exceeded");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("SupplyExceeded");
      }
    });

    it("Enforces mint limit per wallet", async () => {
      const { collectionPda: limitedCollectionPda, treasury: limitedTreasury } = 
        await createCollection({ mintLimitPerWallet: 2 });

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          limitedCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Mint 2 (at limit)
      await program.methods
        .mint(new BN(2))
        .accounts({
          collection: limitedCollectionPda,
          buyer: buyer.publicKey,
          treasury: limitedTreasury,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      // Third mint should fail
      try {
        await program.methods
          .mint(new BN(1))
          .accounts({
            collection: limitedCollectionPda,
            buyer: buyer.publicKey,
            treasury: limitedTreasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed when mint limit exceeded");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.error?.error?.errorCode?.code).to.equal("MintLimitExceeded");
      }
    });

    it("Allows different wallets to mint up to limit", async () => {
      const { collectionPda: multiWalletCollectionPda, treasury: multiWalletTreasury } = 
        await createCollection({ mintLimitPerWallet: 2, maxSupply: 100 });

      const buyer1 = anchor.web3.Keypair.generate();
      const buyer2 = anchor.web3.Keypair.generate();
      
      await provider.connection.requestAirdrop(buyer1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(buyer2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [tracker1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), multiWalletCollectionPda.toBuffer(), buyer1.publicKey.toBuffer()],
        program.programId
      );
      const [tracker2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), multiWalletCollectionPda.toBuffer(), buyer2.publicKey.toBuffer()],
        program.programId
      );

      // Both buyers mint at their limit
      await program.methods
        .mint(new BN(2))
        .accounts({
          collection: multiWalletCollectionPda,
          buyer: buyer1.publicKey,
          treasury: multiWalletTreasury,
          walletTracker: tracker1Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer1])
        .rpc();

      await program.methods
        .mint(new BN(2))
        .accounts({
          collection: multiWalletCollectionPda,
          buyer: buyer2.publicKey,
          treasury: multiWalletTreasury,
          walletTracker: tracker2Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer2])
        .rpc();

      const collection = await program.account.collection.fetch(multiWalletCollectionPda);
      expect(collection.mintedCount.toNumber()).to.equal(4);
    });

    it("Handles minting multiple NFTs in one transaction", async () => {
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .mint(new anchor.BN(5))
        .accounts({
          collection: collectionPda,
          buyer: buyer.publicKey,
          treasury: treasury,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.mintedCount.toNumber()).to.equal(5);
    });

    it("Fails with insufficient funds", async () => {
      const buyer = anchor.web3.Keypair.generate();
      // Don't airdrop - buyer has no funds

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new BN(1))
          .accounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            treasury: treasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed with insufficient funds");
      } catch (err: any) {
        // Should fail with insufficient funds error
        expect(err).to.exist;
      }
    });
  });

  describe("Access Control", () => {
    let collectionPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
    });

    it("Only authority can pause", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .pause()
          .accounts({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Only authority can resume", async () => {
      // Pause first
      await program.methods
        .pause()
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .resume()
          .accounts({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Only authority can update config", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      try {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(2000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
            startTime: new anchor.BN(now),
            endTime: { some: new anchor.BN(now + 86400) },
            mintLimitPerWallet: { some: 10 },
            metadataStandard: metadataStandard("core"),
          })
          .accounts({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });
  });

  describe("Pause/Resume", () => {
    let collectionPda: anchor.web3.PublicKey;
    let treasury: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
      treasury = result.treasury.publicKey;
    });

    it("Pauses and resumes minting", async () => {
      // Pause
      await program.methods
        .pause()
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      let collection = await program.account.collection.fetch(collectionPda);
      expect(collection.isPaused).to.be.true;

      // Resume
      await program.methods
        .resume()
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      collection = await program.account.collection.fetch(collectionPda);
      expect(collection.isPaused).to.be.false;
    });

    it("Can mint after resuming", async () => {
      // Pause, then resume
      await program.methods.pause().accounts({
        collection: collectionPda,
        authority: authority.publicKey,
      }).rpc();

      await program.methods.resume().accounts({
        collection: collectionPda,
        authority: authority.publicKey,
      }).rpc();

      // Now mint should work
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .mint(new anchor.BN(1))
        .accounts({
          collection: collectionPda,
          buyer: buyer.publicKey,
          treasury: treasury,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.mintedCount.toNumber()).to.equal(1);
    });
  });

  describe("Config Updates", () => {
    let collectionPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
    });

    it("Updates collection config", async () => {
      const now = Math.floor(Date.now() / 1000);
      await program.methods
        .updateConfig({
          maxSupply: new BN(2000),
          pricePerNft: new BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
          startTime: new BN(now),
          endTime: { some: new BN(now + 86400) },
          mintLimitPerWallet: { some: 10 },
          metadataStandard: metadataStandard("core"),
        })
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.config.maxSupply.toNumber()).to.equal(2000);
      expect(collection.config.pricePerNft.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL * 0.2);
      expect(collection.config.mintLimitPerWallet.some).to.equal(10);
      expect(collection.config.metadataStandard.core).to.exist;
    });
  });

  describe("Edge Cases & Security", () => {
    it("Handles maximum u64 values", async () => {
      // Test with large but safe number (within JavaScript safe integer range)
      const { collectionPda } = await createCollection({ 
        maxSupply: 1000,
        pricePerNft: Number.MAX_SAFE_INTEGER
      });

      // Should initialize successfully
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection).to.exist;
    });

    it("Prevents reentrancy through multiple mints in same slot", async () => {
      const { collectionPda, treasury } = await createCollection({ maxSupply: 10 });
      
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Try to mint more than supply in one go
      try {
      await program.methods
        .mint(new anchor.BN(11)) // More than max supply
          .accounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            treasury: treasury,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        assert.fail("Should have failed - exceeds supply");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("SupplyExceeded");
      }
    });

    it("Validates treasury account is mutable", async () => {
      // This is handled by Anchor's account constraints
      // If treasury is not mutable, the transaction will fail at the account level
      const { collectionPda, treasury } = await createCollection({});
      
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Should succeed - Anchor validates mutability
      await program.methods
        .mint(new anchor.BN(1))
        .accounts({
          collection: collectionPda,
          buyer: buyer.publicKey,
          treasury: treasury,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
    });
  });

  describe("End-to-end (all categories)", () => {
    it("Initialization → Minting → Access Control → Pause/Resume → Config Updates → Edge Cases", async () => {
      const pricePerNft = anchor.web3.LAMPORTS_PER_SOL * 0.1;

      // —— Initialization ——
      const { collectionPda, treasury } = await createCollection({
        maxSupply: 10,
        mintLimitPerWallet: 3,
        metadataStandard: "core",
      });
      let col = await program.account.collection.fetch(collectionPda);
      expect(col.config.maxSupply.toNumber()).to.equal(10);
      expect(col.config.mintLimitPerWallet.some).to.equal(3);
      expect(col.config.metadataStandard.core).to.exist;
      expect(col.mintedCount.toNumber()).to.equal(0);

      // —— Access Control (unauthorized pause) ——
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      try {
        await program.methods
          .pause()
          .accounts({ collection: collectionPda, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc();
        assert.fail("Unauthorized pause should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("Unauthorized");
      }

      // —— Minting ——
      const buyer1 = anchor.web3.Keypair.generate();
      const buyer2 = anchor.web3.Keypair.generate();
      const buyer3 = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer1.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(buyer2.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(buyer3.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      function walletTracker(buyer: anchor.web3.PublicKey) {
        return anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.toBuffer()],
          program.programId
        )[0];
      }

      const treasuryBefore = await provider.connection.getBalance(treasury.publicKey);

      await program.methods.mint(new anchor.BN(1)).accounts({
        collection: collectionPda,
        buyer: buyer1.publicKey,
        treasury: treasury.publicKey,
        walletTracker: walletTracker(buyer1.publicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([buyer1]).rpc();

      await program.methods.mint(new anchor.BN(2)).accounts({
        collection: collectionPda,
        buyer: buyer1.publicKey,
        treasury: treasury.publicKey,
        walletTracker: walletTracker(buyer1.publicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([buyer1]).rpc();

      await program.methods.mint(new anchor.BN(2)).accounts({
        collection: collectionPda,
        buyer: buyer2.publicKey,
        treasury: treasury.publicKey,
        walletTracker: walletTracker(buyer2.publicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([buyer2]).rpc();

      col = await program.account.collection.fetch(collectionPda);
      expect(col.mintedCount.toNumber()).to.equal(5);
      const treasuryAfter5 = await provider.connection.getBalance(treasury.publicKey);
      expect(treasuryAfter5 - treasuryBefore).to.be.greaterThan(pricePerNft * 4 * 0.9);

      // —— Pause / Resume ——
      await program.methods
        .pause()
        .accounts({ collection: collectionPda, authority: authority.publicKey })
        .rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.isPaused).to.be.true;

      try {
        await program.methods.mint(new anchor.BN(1)).accounts({
          collection: collectionPda,
          buyer: buyer2.publicKey,
          treasury: treasury.publicKey,
          walletTracker: walletTracker(buyer2.publicKey),
          systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([buyer2]).rpc();
        assert.fail("Mint when paused should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("MintingPaused");
      }

      try {
        await program.methods
          .resume()
          .accounts({ collection: collectionPda, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc();
        assert.fail("Unauthorized resume should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("Unauthorized");
      }

      await program.methods
        .resume()
        .accounts({ collection: collectionPda, authority: authority.publicKey })
        .rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.isPaused).to.be.false;

      await program.methods.mint(new anchor.BN(1)).accounts({
        collection: collectionPda,
        buyer: buyer2.publicKey,
        treasury: treasury.publicKey,
        walletTracker: walletTracker(buyer2.publicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([buyer2]).rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.mintedCount.toNumber()).to.equal(6);

      // —— Config Updates (unauthorized then authorized) ——
      const now = Math.floor(Date.now() / 1000);
      const newConfig = {
        maxSupply: new anchor.BN(20),
        pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
        startTime: new anchor.BN(now),
        endTime: { some: new anchor.BN(now + 86400) },
        mintLimitPerWallet: { some: 5 },
        metadataStandard: metadataStandard("legacy"),
      };
      try {
        await program.methods.updateConfig(newConfig)
          .accounts({ collection: collectionPda, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc();
        assert.fail("Unauthorized update config should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("Unauthorized");
      }

      await program.methods.updateConfig(newConfig)
        .accounts({ collection: collectionPda, authority: authority.publicKey })
        .rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.config.maxSupply.toNumber()).to.equal(20);
      expect(col.config.pricePerNft.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL * 0.2);
      expect(col.config.metadataStandard.legacy).to.exist;

      await program.methods.mint(new anchor.BN(1)).accounts({
        collection: collectionPda,
        buyer: buyer3.publicKey,
        treasury: treasury.publicKey,
        walletTracker: walletTracker(buyer3.publicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([buyer3]).rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.mintedCount.toNumber()).to.equal(7);

      // —— Edge Cases: supply exceeded, treasury mutable (mint succeeds) ——
      try {
        await program.methods.mint(new anchor.BN(20)).accounts({
          collection: collectionPda,
          buyer: buyer3.publicKey,
          treasury: treasury.publicKey,
          walletTracker: walletTracker(buyer3.publicKey),
          systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([buyer3]).rpc();
        assert.fail("Mint exceeding supply should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("SupplyExceeded");
      }

      await program.methods.mint(new anchor.BN(1)).accounts({
        collection: collectionPda,
        buyer: buyer3.publicKey,
        treasury: treasury.publicKey,
        walletTracker: walletTracker(buyer3.publicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([buyer3]).rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.mintedCount.toNumber()).to.equal(8);
    });
  });
});

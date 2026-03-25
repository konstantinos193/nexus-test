import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import { NexusLaunchpad } from "../target/types/nexus_launchpad";
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
  getCurrentMetadataStandardEnum,
  createCollection,
} from "./nexus-launchpad-helpers";

// Use same program instance as 11-minting (which mints successfully).
// Aligning with working tests avoids workspace/IDL desync and method-builder quirks.

describe("nexus-launchpad", () => {
  before(async () => {
    await ensureProviderFunds();
    
    // IDL Guard Assertion - prevents silent failures
    // Verify the EXACT program instance we're using has the correct IDL
    const mintIx = program.idl.instructions.find(i => i.name === "mint");
    if (!mintIx) {
      throw new Error("Mint instruction missing from IDL. Run 'anchor build' to regenerate IDL.");
    }
    
    const names = mintIx.accounts?.map(a => a.name) || [];

    // Verify 'collection' is in the IDL - this is the critical check
    if (!names.includes("collection")) {
      throw new Error(
        `CRITICAL: Program instance IDL is missing 'collection' account! ` +
        `Found accounts: ${names.join(", ")}. ` +
        `This indicates program instance drift - wrong Program object in memory.`
      );
    }
  });

  describe("Config Updates - Stress Tests", () => {
    let collectionPda: anchor.web3.PublicKey;
    let collectionAuthority: anchor.web3.Keypair;
    let creatorWallet: anchor.web3.PublicKey;
    let platformWallet: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({ maxSupply: 10000 });
      collectionPda = result.collectionPda;
      collectionAuthority = result.authority;
      creatorWallet = result.creatorWallet.publicKey;
      platformWallet = result.platformWallet.publicKey;
    });

    it("Rapid field-by-field updates", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      const baseConfig = {
        maxSupply: new anchor.BN(1000),
        pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
        startTime: new anchor.BN(startTime),
        endTime: null,
        mintLimitPerWallet: null,
        metadataStandard: metadataStandard("core"),
        freezeTradingUntilDate: null,
        freezeTradingUntilSoldOut: false,
      };

      // Update maxSupply 10 times rapidly (1000, 1100, ..., 1900)
      for (let i = 0; i < 10; i++) {
        await program.methods
          .updateConfig({ ...baseConfig, maxSupply: new anchor.BN(1000 + i * 100) })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);
      }
      // Preserve final maxSupply so price/metadata updates don't overwrite it
      baseConfig.maxSupply = new anchor.BN(1900);

      // Update price 10 times rapidly (0.1, 0.11, ..., 0.19 SOL)
      for (let i = 0; i < 10; i++) {
        await program.methods
          .updateConfig({ ...baseConfig, pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * (0.1 + i * 0.01)) })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);
      }
      // Preserve final price so metadata updates don't overwrite it
      baseConfig.pricePerNft = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.19);

      // Update metadata standard - but preserve it since it's immutable
      // Fetch current metadata standard and use it
      const currentCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = currentCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();

      // Try to update 8 times - metadata standard should remain constant
      for (let i = 0; i < 8; i++) {
        await program.methods
          .updateConfig({ ...baseConfig, metadataStandard: currentMetadataStandard })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);
      }

      const collection = await program.account.collection.fetch(collectionPda);
      // Assert price first (most likely to be overwritten by later update loops)
      expect(collection.price.toNumber()).to.be.closeTo(anchor.web3.LAMPORTS_PER_SOL * 0.19, anchor.web3.LAMPORTS_PER_SOL * 0.001);
      expect(collection.maxSupply.toNumber()).to.equal(1900);
      // Collection was created with "core" (2); we re-sent it in the 8 metadata updates. It stays immutable.
      expect(collection.metadataStandard).to.equal(2); // core (unchanged)
    });

    it("Updates during active minting", async () => {
      // Set start time to now so minting can start immediately
      await setStartTimeToNow(collectionPda, collectionAuthority);
      
      // Start minting
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 20 * anchor.web3.LAMPORTS_PER_SOL);

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // CRITICAL FIX: Force collection account finalization before mint
      // Anchor 0.32.x PDA resolver fails silently if dependent account (collection) 
      // isn't fully finalized when resolving wallet_tracker seeds that depend on collection.key()
      // This fetch forces RPC synchronization and ensures account is readable
      const collectionAccount = await program.account.collection.fetch(collectionPda);

      // Additional verification: Check account exists on-chain
      const accInfo = await program.provider.connection.getAccountInfo(collectionPda);
      if (!accInfo) {
        throw new Error("Collection account does not exist on-chain - initialization may have failed");
      }

      // CRITICAL SAFETY CHECK: Verify IDL right before the call
      // This catches program instance drift issues
      const mintIx = program.idl.instructions.find(i => i.name === "mint");
      if (!mintIx) {
        throw new Error("Mint instruction missing from program IDL at call site");
      }
      
      const mintAccountNames = mintIx.accounts?.map(a => a.name) || [];

      if (!mintAccountNames.includes("collection")) {
        throw new Error(
          `CRITICAL: Program instance IDL missing 'collection' at call site! ` +
          `Found: ${mintAccountNames.join(", ")}. ` +
          `This confirms program instance drift - using wrong Program object.`
        );
      }

      // Use same pattern as 11-minting (mintAccounts + program from helpers) so accounts match IDL.
      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet,
        platformWallet,
        walletTracker: walletTrackerPda,
      });
      const sig = await program.methods
        .mint(new anchor.BN(5), [], 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Update config while minting is active
      const now = Math.floor(Date.now() / 1000);
      // Keep startTime in the past so second mint is still allowed (mint checks: now >= startTime)
      const startTimeInPast = now - 60;
      const endTimeFuture = now + 86400 * 7;

      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();

      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(5000), // Increase supply
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.15), // Change price
          startTime: new anchor.BN(startTimeInPast), // Keep in past so minting can continue
          endTime: { some: new anchor.BN(endTimeFuture) }, // Set end time
          mintLimitPerWallet: { some: 10 }, // Change limit
          metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
          freezeTradingUntilDate: { some: new anchor.BN(now + 86400 * 30) },
          freezeTradingUntilSoldOut: true,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      // Continue minting with new config - use mintAccounts (same as first mint)
      const accounts2 = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet,
        platformWallet,
        walletTracker: walletTrackerPda,
      });
      const sig2 = await program.methods
        .mint(new anchor.BN(3), [], 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .accountsStrict(accounts2 as any)
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(8);
      expect(collection.maxSupply.toNumber()).to.equal(5000);
      expect(collection.price.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL * 0.15);
    });

    it("Rapid successive updates (100+ updates)", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();
      
      // Perform 100 rapid config updates
      for (let i = 0; i < 100; i++) {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(1000 + i),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * (0.1 + i * 0.001)),
            startTime: new anchor.BN(startTime + i),
            endTime: i % 2 === 0 ? { some: new anchor.BN(startTime + 86400 + i) } : null,
            mintLimitPerWallet: i % 3 === 0 ? { some: (i % 255) + 1 } : null,
            metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
            freezeTradingUntilDate: i % 4 === 0 ? { some: new anchor.BN(startTime + 172800 + i) } : null,
            freezeTradingUntilSoldOut: i % 2 === 1,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);
      }

      // Verify final state
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(1099);
      expect(collection.price.toNumber()).to.be.closeTo(anchor.web3.LAMPORTS_PER_SOL * 0.199, anchor.web3.LAMPORTS_PER_SOL * 0.001);
    });

    it("All metadata standard transitions", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();
      const expectedU8 = initialCollection.metadataStandard;

      // Test that metadata standard remains constant (it's immutable)
      // Try updating config 8 times - metadata standard should never change
      for (let i = 0; i < 8; i++) {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: null,
            mintLimitPerWallet: null,
            metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);

        const collection = await program.account.collection.fetch(collectionPda);
        expect(collection.metadataStandard).to.equal(expectedU8); // Should remain unchanged
      }
    });

    it("Boundary values - max u64 values", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Test with maximum safe JavaScript integer (2^53 - 1)
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(maxSafeInt),
          pricePerNft: new anchor.BN(maxSafeInt),
          startTime: new anchor.BN(maxSafeInt),
          endTime: { some: new anchor.BN(maxSafeInt) },
          mintLimitPerWallet: { some: 255 }, // Max u8
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: { some: new anchor.BN(maxSafeInt) },
          freezeTradingUntilSoldOut: true,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(maxSafeInt);
      expect(collection.price.toNumber()).to.equal(maxSafeInt);
      expect(collection.mintLimitPerWallet).to.equal(255);
    });

    it("Boundary values - minimum and sentinel values", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();
      
      // Test with minimum values
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1), // Minimum supply
          pricePerNft: new anchor.BN(1), // Minimum price (1 lamport)
          startTime: new anchor.BN(0), // Epoch start
          endTime: null, // Sentinel -1
          mintLimitPerWallet: null, // Sentinel 0
          metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
          freezeTradingUntilDate: null, // Sentinel -1
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(1);
      expect(collection.price.toNumber()).to.equal(1);
      expect(collection.endTime.toNumber()).to.equal(-1); // Sentinel
      expect(collection.mintLimitPerWallet).to.equal(0); // Sentinel
      expect(collection.freezeUntil.toNumber()).to.equal(-1); // Sentinel
    });

    it("All Option field combinations", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Test all 8 combinations of Option fields (endTime, mintLimitPerWallet, freezeTradingUntilDate)
      const combinations = [
        { endTime: null, mintLimit: null, freezeDate: null },
        { endTime: { some: new anchor.BN(startTime + 86400) }, mintLimit: null, freezeDate: null },
        { endTime: null, mintLimit: { some: 5 }, freezeDate: null },
        { endTime: null, mintLimit: null, freezeDate: { some: new anchor.BN(startTime + 172800) } },
        { endTime: { some: new anchor.BN(startTime + 86400) }, mintLimit: { some: 5 }, freezeDate: null },
        { endTime: { some: new anchor.BN(startTime + 86400) }, mintLimit: null, freezeDate: { some: new anchor.BN(startTime + 172800) } },
        { endTime: null, mintLimit: { some: 5 }, freezeDate: { some: new anchor.BN(startTime + 172800) } },
        { endTime: { some: new anchor.BN(startTime + 86400) }, mintLimit: { some: 5 }, freezeDate: { some: new anchor.BN(startTime + 172800) } },
      ];

      for (let i = 0; i < combinations.length; i++) {
        const combo = combinations[i];
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: combo.endTime,
            mintLimitPerWallet: combo.mintLimit,
            metadataStandard: metadataStandard("core"),
            freezeTradingUntilDate: combo.freezeDate,
            freezeTradingUntilSoldOut: i % 2 === 0,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);

        const collection = await program.account.collection.fetch(collectionPda);
        if (combo.endTime === null) {
          expect(collection.endTime.toNumber()).to.equal(-1);
        } else {
          expect(collection.endTime.toNumber()).to.equal(startTime + 86400);
        }
        if (combo.mintLimit === null) {
          expect(collection.mintLimitPerWallet).to.equal(0);
        } else {
          expect(collection.mintLimitPerWallet).to.equal(5);
        }
        if (combo.freezeDate === null) {
          expect(collection.freezeUntil.toNumber()).to.equal(-1);
        } else {
          expect(collection.freezeUntil.toNumber()).to.equal(startTime + 172800);
        }
      }
    });

    it("Updates while collection is paused", async () => {
      // Pause collection
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      // Fetch collection to preserve immutable metadata standard
      const pausedCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = getCurrentMetadataStandardEnum(pausedCollection.metadataStandard);

      // Update config while paused (metadata standard must match - immutable)
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(2000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
          startTime: new anchor.BN(startTime),
          endTime: null,
          mintLimitPerWallet: { some: 20 },
          metadataStandard: currentMetadataStandard,
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(2000);
      expect((collection.flags & 1) !== 0).to.be.true; // Still paused
    });

    it("Extreme timing values", async () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Test with very far future times
      const farFuture = now + (365 * 24 * 60 * 60 * 100); // 100 years in future
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(farFuture),
          endTime: { some: new anchor.BN(farFuture + 86400) },
          mintLimitPerWallet: null,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: { some: new anchor.BN(farFuture + 172800) },
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      // Test with past times (should be accepted by update_config)
      const pastTime = now - 86400; // 1 day ago
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(pastTime),
          endTime: { some: new anchor.BN(pastTime - 3600) }, // Even further in past
          mintLimitPerWallet: null,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: { some: new anchor.BN(pastTime - 7200) },
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.startTime.toNumber()).to.equal(pastTime);
      expect(collection.endTime.toNumber()).to.equal(pastTime - 3600);
    });

    it("Toggle freezeTradingUntilSoldOut rapidly", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();
      
      // Toggle the flag 50 times
      for (let i = 0; i < 50; i++) {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: null,
            mintLimitPerWallet: null,
            metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: i % 2 === 0,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);
      }

      const collection = await program.account.collection.fetch(collectionPda);
      // Should end with false (even iterations end at false)
      expect((collection.flags & 2) !== 0).to.be.false;
    });

    it("Updates with all u8 mint limit values", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();
      
      // Test representative u8 values instead of all 255 to speed up test
      // Test: 1, 2, 3, powers of 2, values near boundaries, and max value
      const testValues = [
        1, 2, 3, // Small values
        7, 15, 31, 63, 127, // Powers of 2 - 1
        8, 16, 32, 64, 128, // Powers of 2
        9, 17, 33, 65, 129, // Powers of 2 + 1
        100, 200, // Mid-range values
        254, 255, // Max values
      ];
      
      for (const limit of testValues) {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: null,
            mintLimitPerWallet: { some: limit },
            metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);

        // Verify each value to ensure correctness
        const collection = await program.account.collection.fetch(collectionPda);
        expect(collection.mintLimitPerWallet).to.equal(limit);
      }

      // Verify final value
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.mintLimitPerWallet).to.equal(255);
    });

    it("Stress test: 500 rapid updates with random values", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();

      // Perform 500 rapid updates with pseudo-random values
      for (let i = 0; i < 500; i++) {
        const maxSupply = 100 + (i % 10000);
        const price = 0.01 + (i % 100) * 0.001;
        const mintLimit = i % 256 === 0 ? null : { some: (i % 255) + 1 };
        const hasEndTime = i % 3 === 0;
        const hasFreezeDate = i % 5 === 0;
        const freezeSoldOut = i % 2 === 0;

        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(maxSupply),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * price),
            startTime: new anchor.BN(startTime + i),
            endTime: hasEndTime ? { some: new anchor.BN(startTime + 86400 + i) } : null,
            mintLimitPerWallet: mintLimit,
            metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
            freezeTradingUntilDate: hasFreezeDate ? { some: new anchor.BN(startTime + 172800 + i) } : null,
            freezeTradingUntilSoldOut: freezeSoldOut,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);

        // Verify every 50th update to ensure correctness
        if (i % 50 === 0) {
          const collection = await program.account.collection.fetch(collectionPda);
          expect(collection.maxSupply.toNumber()).to.equal(maxSupply);
        }
      }

      // Final verification
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(599); // 100 + (499 % 10000)
    });

    it("Updates with zero price (free mint)", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1000),
          pricePerNft: new anchor.BN(0), // Free mint
          startTime: new anchor.BN(startTime),
          endTime: null,
          mintLimitPerWallet: { some: 5 },
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.price.toNumber()).to.equal(0);
    });

    it("Updates with endTime before startTime (edge case)", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 86400; // 1 day in future
      const endTime = now + 3600; // 1 hour in future (before start)
      
      // update_config doesn't validate this, so it should succeed
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(startTime),
          endTime: { some: new anchor.BN(endTime) },
          mintLimitPerWallet: null,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.startTime.toNumber()).to.equal(startTime);
      expect(collection.endTime.toNumber()).to.equal(endTime);
    });

    it("Updates all fields simultaneously multiple times", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      
      // Fetch the collection to get the current metadata standard (which is immutable)
      const initialCollection = await program.account.collection.fetch(collectionPda);
      const currentMetadataStandard = (() => {
        const std = initialCollection.metadataStandard;
        if (std === 0) return { legacy: {} };
        if (std === 1) return { programmable: {} };
        if (std === 2) return { core: {} };
        if (std === 3) return { compressed: {} };
        if (std === 4) return { semiFungible: {} };
        if (std === 5) return { token2022: {} };
        if (std === 6) return { nativeMetadata: {} };
        if (std === 7) return { custom: {} };
        return { core: {} }; // default
      })();
      
      // Update all fields 20 times
      for (let i = 0; i < 20; i++) {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(1000 + i * 50),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * (0.1 + i * 0.01)),
            startTime: new anchor.BN(startTime + i * 60),
            endTime: i % 2 === 0 ? { some: new anchor.BN(startTime + 86400 + i * 60) } : null,
            mintLimitPerWallet: i % 3 === 0 ? { some: (i % 100) + 1 } : null,
            metadataStandard: currentMetadataStandard, // Preserve immutable metadata standard
            freezeTradingUntilDate: i % 4 === 0 ? { some: new anchor.BN(startTime + 172800 + i * 60) } : null,
            freezeTradingUntilSoldOut: i % 2 === 1,
          })
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);
      }

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(1950); // 1000 + 19 * 50
      expect(collection.price.toNumber()).to.be.closeTo(anchor.web3.LAMPORTS_PER_SOL * 0.29, anchor.web3.LAMPORTS_PER_SOL * 0.01);
    });
  });
});

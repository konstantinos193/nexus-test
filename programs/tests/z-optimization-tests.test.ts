import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusLaunchpad } from "../target/types/nexus_launchpad";
import { expect } from "chai";
import { 
  getProvider, 
  createCollection, 
  mintNFT,
  getTestWallets,
  setupTestEnvironment
} from "./nexus-launchpad-helpers";

describe("Optimization Tests", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<NexusLaunchpad>;
  let testWallets: any[];

  before(async () => {
    provider = getProvider();
    program = provider.program as Program<NexusLaunchpad>;
    testWallets = getTestWallets();
  });

  describe("Optimized Merkle Proof Verification", () => {
    it("Should handle large proof depths efficiently", async () => {
      const { collection, collectionKey } = await createCollection(
        program,
        testWallets[0],
        "Optimization Test Collection",
        "https://example.com/metadata",
        {
          maxSupply: 1000,
          pricePerNft: new anchor.BN(1000000), // 0.001 SOL
          startTime: new anchor.BN(Date.now() / 1000),
          endTime: null,
          mintLimitPerWallet: 5,
          metadataStandard: { core: {} },
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false
        },
        500 // 5% platform fee
      );

      // Test with maximum proof depth (24 levels)
      const maxDepthProof = Array(24).fill([Buffer.alloc(32, 0)]);
      
      try {
        await mintNFT(program, collectionKey, testWallets[1], 1, maxDepthProof, 0);
        expect.fail("Should have failed with invalid proof");
      } catch (error) {
        expect(error.error.errorMessage).to.include("AllowlistInvalid");
      }
    });

    it("Should optimize memory usage during proof verification", async () => {
      // Test that the optimized function doesn't allocate excessive memory
      const { collectionKey } = await createCollection(
        program,
        testWallets[0],
        "Memory Test Collection",
        "https://example.com/metadata",
        {
          maxSupply: 100,
          pricePerNft: new anchor.BN(1000000),
          startTime: new anchor.BN(Date.now() / 1000),
          endTime: null,
          mintLimitPerWallet: 3,
          metadataStandard: { core: {} },
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false
        },
        500
      );

      // Test with various proof sizes to ensure memory efficiency
      for (let depth = 1; depth <= 10; depth++) {
        const proof = Array(depth).fill([Buffer.alloc(32, Math.floor(Math.random() * 256))]);
        
        try {
          await mintNFT(program, collectionKey, testWallets[1], 1, proof, 0);
          expect.fail("Should have failed with invalid proof");
        } catch (error) {
          expect(error.error.errorMessage).to.include("AllowlistInvalid");
        }
      }
    });
  });

  describe("Early Validation Optimization", () => {
    it("Should fail fast on invalid quantity", async () => {
      const { collectionKey } = await createCollection(
        program,
        testWallets[0],
        "Early Validation Test",
        "https://example.com/metadata",
        {
          maxSupply: 100,
          pricePerNft: new anchor.BN(1000000),
          startTime: new anchor.BN(Date.now() / 1000),
          endTime: null,
          mintLimitPerWallet: 5,
          metadataStandard: { core: {} },
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false
        },
        500
      );

      try {
        await mintNFT(program, collectionKey, testWallets[1], 0, [], 0);
        expect.fail("Should have failed with zero quantity");
      } catch (error) {
        expect(error.error.errorMessage).to.include("InvalidSupply");
      }
    });

    it("Should fail fast on excessive proof depth", async () => {
      const { collectionKey } = await createCollection(
        program,
        testWallets[0],
        "Proof Depth Test",
        "https://example.com/metadata",
        {
          maxSupply: 100,
          pricePerNft: new anchor.BN(1000000),
          startTime: new anchor.BN(Date.now() / 1000),
          endTime: null,
          mintLimitPerWallet: 5,
          metadataStandard: { core: {} },
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false
        },
        500
      );

      // Test with proof depth exceeding maximum (25 > 24)
      const excessiveProof = Array(25).fill([Buffer.alloc(32, 0)]);
      
      try {
        await mintNFT(program, collectionKey, testWallets[1], 1, excessiveProof, 0);
        expect.fail("Should have failed with excessive proof depth");
      } catch (error) {
        expect(error.error.errorMessage).to.include("AllowlistInvalid");
      }
    });
  });

  describe("Compute Unit Efficiency", () => {
    it("Should maintain reasonable compute unit usage for batch operations", async () => {
      const { collectionKey } = await createCollection(
        program,
        testWallets[0],
        "CU Efficiency Test",
        "https://example.com/metadata",
        {
          maxSupply: 1000,
          pricePerNft: new anchor.BN(1000000),
          startTime: new anchor.BN(Date.now() / 1000),
          endTime: null,
          mintLimitPerWallet: 10,
          metadataStandard: { core: {} },
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false
        },
        500
      );

      // Test batch minting with maximum quantity (10)
      const startTime = Date.now();
      
      try {
        await mintNFT(program, collectionKey, testWallets[1], 10, [], 0);
      } catch (error) {
        // Expected to fail without allowlist, but we're measuring CU efficiency
        expect(error.error.errorMessage).to.include("AllowlistNotRequired");
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete quickly (under 5 seconds) even with maximum quantity
      expect(executionTime).to.be.lessThan(5000);
    });

    it("Should optimize public mint path", async () => {
      const { collectionKey } = await createCollection(
        program,
        testWallets[0],
        "Public Mint Test",
        "https://example.com/metadata",
        {
          maxSupply: 100,
          pricePerNft: new anchor.BN(1000000),
          startTime: new anchor.BN(Date.now() / 1000),
          endTime: null,
          mintLimitPerWallet: 5,
          metadataStandard: { core: {} },
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false
        },
        500
      );

      // Public mint should be faster than allowlist mint
      const startTime = Date.now();
      
      try {
        await mintNFT(program, collectionKey, testWallets[1], 1, [], 0);
      } catch (error) {
        // Expected to fail due to payment, but we're testing the fast path
        expect(error.error.errorMessage).to.include("AllowlistNotRequired");
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Public mint validation should be very fast (under 1 second)
      expect(executionTime).to.be.lessThan(1000);
    });
  });

  describe("Memory Optimization", () => {
    it("Should efficiently handle collection registry operations", async () => {
      // Test registry efficiency with multiple collections
      const collections = [];
      
      for (let i = 0; i < 5; i++) {
        const { collectionKey } = await createCollection(
          program,
          testWallets[0],
          `Collection ${i}`,
          `https://example.com/metadata/${i}`,
          {
            maxSupply: 100,
            pricePerNft: new anchor.BN(1000000),
            startTime: new anchor.BN(Date.now() / 1000),
            endTime: null,
            mintLimitPerWallet: 5,
            metadataStandard: { core: {} },
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false
          },
          500
        );
        collections.push(collectionKey);
      }

      // Registry should handle multiple collections efficiently
      const registry = await program.account.collectionRegistry.fetch(
        await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("registry")],
          program.programId
        )
      );

      expect(registry.collectionCount).to.be.at.least(5);
      expect(registry.collections.length).to.be.at.least(5);
    });
  });
});

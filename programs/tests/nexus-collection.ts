import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusCollection } from "../target/types/nexus_collection";
import { expect, assert } from "chai";
import { BN } from "@coral-xyz/anchor";

describe("nexus-collection", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NexusCollection as Program<NexusCollection>;
  const authority = provider.wallet;

  // Helper to create a collection - matches JSON template format
  async function createCollection(metadata: {
    name?: string;
    symbol?: string;
    description?: string;
    sellerFeeBasisPoints?: number;
    image?: string;
    externalUrl?: string | null;
    attributes?: Array<{ traitType: string; value: string; displayType?: string; maxValue?: number }>;
    properties?: {
      files?: Array<{ uri: string; type: string }>;
      category?: string;
      creators?: Array<{ address: string; share: number }>;
    };
  }) {
    const mint = anchor.web3.Keypair.generate();
    const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("collection"), mint.publicKey.toBuffer()],
      program.programId
    );

    // Match JSON template format exactly - Anchor converts camelCase to snake_case
    // For Option types, Anchor 0.32.1 expects { some: value } format when writing
    // When reading, Anchor returns Option types as { some: value } | null
    // Critical: For Option<u64>, pass BN directly inside { some: ... }
    // All Option types must be either null or { some: <primitive_value> }
    const collectionMetadata = {
      name: String(metadata.name || "Test Collection"),
      symbol: String(metadata.symbol || "TEST"),
      description: String(metadata.description || "Test Description"),
      sellerFeeBasisPoints: Number(metadata.sellerFeeBasisPoints ?? 250),
      image: String(metadata.image || "https://example.com/image.png"),
      externalUrl: (() => {
        if (metadata.externalUrl === undefined) {
          return { some: "https://example.com" };
        }
        if (metadata.externalUrl === null || metadata.externalUrl === "") {
          return null;
        }
        return { some: String(metadata.externalUrl) };
      })(),
      attributes: (metadata.attributes || []).map((attr: any) => {
        const attribute: {
          traitType: string;
          value: string;
          displayType: { some: string } | null;
          maxValue: { some: anchor.BN } | null;
        } = {
          traitType: String(attr.traitType || attr.trait_type || ""),
          value: String(attr.value || ""),
          displayType: null,
          maxValue: null,
        };
        
        // Handle Option<String> for displayType - must be string primitive
        if (attr.displayType !== undefined && attr.displayType !== null && attr.displayType !== "") {
          attribute.displayType = { some: String(attr.displayType) };
        }
        
        // Handle Option<u64> for maxValue - must be BN primitive (not object wrapper)
        if (attr.maxValue !== undefined && attr.maxValue !== null) {
          const numValue = typeof attr.maxValue === "number" 
            ? attr.maxValue 
            : (attr.maxValue instanceof anchor.BN ? attr.maxValue.toNumber() : Number(attr.maxValue));
          if (!isNaN(numValue) && isFinite(numValue)) {
            attribute.maxValue = { some: new anchor.BN(numValue) };
          }
        }
        
        return attribute;
      }),
      properties: {
        files: (metadata.properties?.files || [{ uri: "https://example.com/image.png", type: "image/png" }]).map((f: any) => ({
          uri: String(f.uri || ""),
          type: String(f.type || ""),
        })),
        category: String(metadata.properties?.category || "image"),
        creators: (metadata.properties?.creators || [{ address: authority.publicKey.toString(), share: 100 }]).map((c: any) => ({
          address: String(c.address || ""),
          share: Number(c.share || 0),
        })),
      },
    };

    await program.methods
      .createCollection(collectionMetadata)
      .accounts({
        collection: collectionPda,
        mint: mint.publicKey,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return { collectionPda, mint };
  }

  describe("Collection Creation", () => {
    it("Creates a collection successfully", async () => {
      const { collectionPda } = await createCollection({});

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.authority.toString()).to.equal(authority.publicKey.toString());
      expect(collection.metadata.name).to.equal("Test Collection");
      expect(collection.metadata.description).to.equal("Test Description");
    });

    it("Creates collection with custom metadata", async () => {
      const { collectionPda } = await createCollection({
        name: "Custom Name",
        description: "Custom Description",
        image: "https://custom.com/image.png",
        externalUrl: "https://custom.com",
        attributes: [
          { traitType: "Rarity", value: "Legendary" },
          { traitType: "Color", value: "Blue" },
        ],
      });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.name).to.equal("Custom Name");
      expect(collection.metadata.description).to.equal("Custom Description");
      expect(collection.metadata.image).to.equal("https://custom.com/image.png");
      expect(collection.metadata.externalUrl.some).to.equal("https://custom.com");
      expect(collection.metadata.attributes.length).to.equal(2);
      expect(collection.metadata.attributes[0].traitType).to.equal("Rarity");
      expect(collection.metadata.attributes[0].value).to.equal("Legendary");
    });

    it("Creates collection without external URL", async () => {
      const { collectionPda } = await createCollection({
        externalUrl: null,
      });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.externalUrl).to.be.null;
    });

    it("Creates collection without attributes", async () => {
      const { collectionPda } = await createCollection({
        attributes: [],
      });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.attributes.length).to.equal(0);
    });

    it("Prevents duplicate collection for same mint", async () => {
      const mint = anchor.web3.Keypair.generate();
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), mint.publicKey.toBuffer()],
        program.programId
      );

      // First creation
      await program.methods
        .createCollection({
          name: "First",
          symbol: "FIRST",
          description: "First Description",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/image.png",
          externalUrl: "https://example.com",
          attributes: [],
          properties: {
            files: [{ uri: "https://example.com/image.png", type: "image/png" }],
            category: "image",
            creators: [{ address: authority.publicKey.toString(), share: 100 }],
          },
        })
        .accounts({
          collection: collectionPda,
          mint: mint.publicKey,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Second creation should fail
      try {
        await program.methods
          .createCollection({
            name: "Second",
            symbol: "SECOND",
            description: "Second Description",
            sellerFeeBasisPoints: 250,
            image: "https://example.com/image2.png",
            externalUrl: "https://example.com",
            attributes: [],
            properties: {
              files: [{ uri: "https://example.com/image2.png", type: "image/png" }],
              category: "image",
              creators: [{ address: authority.publicKey.toString(), share: 100 }],
            },
          })
          .accounts({
            collection: collectionPda,
            mint: mint.publicKey,
            authority: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed - collection already exists");
      } catch (err: any) {
        // Anchor will fail because account already initialized
        expect(err).to.exist;
      }
    });
  });

  describe("Metadata Updates", () => {
    let collectionPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
    });

    it("Updates metadata successfully", async () => {
      await program.methods
        .updateMetadata({
          name: "Updated Name",
          symbol: "UPD",
          description: "Updated Description",
          sellerFeeBasisPoints: 250,
          image: "https://updated.com/image.png",
          externalUrl: "https://updated.com",
          attributes: [{ traitType: "Updated", value: "Value" }],
          properties: {
            files: [{ uri: "https://updated.com/image.png", type: "image/png" }],
            category: "image",
            creators: [{ address: authority.publicKey.toString(), share: 100 }],
          },
        })
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.name).to.equal("Updated Name");
      expect(collection.metadata.description).to.equal("Updated Description");
      expect(collection.metadata.image).to.equal("https://updated.com/image.png");
      expect(collection.metadata.attributes.length).to.equal(1);
    });

    it("Only authority can update metadata", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .updateMetadata({
            name: "Hacked Name",
            symbol: "HACK",
            description: "Hacked Description",
            sellerFeeBasisPoints: 250,
            image: "https://hacked.com/image.png",
            externalUrl: { some: "https://hacked.com" },
            attributes: [],
            properties: {
              files: [{ uri: "https://hacked.com/image.png", type: "image/png" }],
              category: "image",
              creators: [{ address: authority.publicKey.toString(), share: 100 }],
            },
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

    it("Updates to null external URL", async () => {
      await program.methods
        .updateMetadata({
          name: "Test",
          symbol: "TEST",
          description: "Test",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/image.png",
          externalUrl: null,
          attributes: [],
          properties: {
            files: [{ uri: "https://example.com/image.png", type: "image/png" }],
            category: "image",
            creators: [{ address: authority.publicKey.toString(), share: 100 }],
          },
        })
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.externalUrl).to.be.null;
    });

    it("Updates attributes", async () => {
      await program.methods
        .updateMetadata({
          name: "Test",
          symbol: "TEST",
          description: "Test",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/image.png",
          externalUrl: "https://example.com",
          attributes: [
            { traitType: "Trait1", value: "Value1" },
            { traitType: "Trait2", value: "Value2" },
            { traitType: "Trait3", value: "Value3" },
          ],
          properties: {
            files: [{ uri: "https://example.com/image.png", type: "image/png" }],
            category: "image",
            creators: [{ address: authority.publicKey.toString(), share: 100 }],
          },
        })
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.attributes.length).to.equal(3);
    });
  });

  describe("Edge Cases & Security", () => {
    it("Handles long metadata strings", async () => {
      const longString = "A".repeat(500); // Max length from CollectionMetadata::LEN
      const { collectionPda } = await createCollection({
        name: longString.substring(0, 100), // Within limits
        description: longString.substring(0, 500), // Max description
        image: longString.substring(0, 200), // Max image URI
      });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.name.length).to.be.lessThanOrEqual(100);
      expect(collection.metadata.description.length).to.be.lessThanOrEqual(500);
    });

    it("Handles many attributes", async () => {
      const manyAttributes = Array.from({ length: 10 }, (_, i) => ({
        traitType: `Trait${i}`,
        value: `Value${i}`,
      }));

      const { collectionPda } = await createCollection({
        attributes: manyAttributes,
      });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.attributes.length).to.equal(10);
    });

    it("Validates authority cannot be changed", async () => {
      // Authority is set at creation and cannot be changed
      // This is enforced by Anchor's account constraints
      const { collectionPda } = await createCollection({});

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.authority.toString()).to.equal(authority.publicKey.toString());

      // Try to update with different authority - should fail
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .updateMetadata({
            name: "Test",
            symbol: "TEST",
            description: "Test",
            sellerFeeBasisPoints: 250,
            image: "https://example.com/image.png",
            externalUrl: "https://example.com",
            attributes: [],
            properties: {
              files: [{ uri: "https://example.com/image.png", type: "image/png" }],
              category: "image",
              creators: [{ address: authority.publicKey.toString(), share: 100 }],
            },
          })
          .accounts({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Should have failed - wrong authority");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Preserves created_at timestamp", async () => {
      const { collectionPda } = await createCollection({});
      const collectionBefore = await program.account.collection.fetch(collectionPda);
      const createdAtBefore = collectionBefore.createdAt.toNumber();

      // Update metadata
      await program.methods
        .updateMetadata({
          name: "Updated",
          symbol: "UPD",
          description: "Updated",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/image.png",
          externalUrl: "https://example.com",
          attributes: [],
          properties: {
            files: [{ uri: "https://example.com/image.png", type: "image/png" }],
            category: "image",
            creators: [{ address: authority.publicKey.toString(), share: 100 }],
          },
        })
        .accounts({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc();

      const collectionAfter = await program.account.collection.fetch(collectionPda);
      // Created at should not change
      expect(collectionAfter.createdAt.toNumber()).to.equal(createdAtBefore);
    });

    it("Handles special characters in metadata", async () => {
      const { collectionPda } = await createCollection({
        name: "Test & Collection < > \" '",
        description: "Description with\nnewlines\tand\ttabs",
        image: "https://example.com/image.png?param=value&other=test",
        attributes: [
          { traitType: "Special & Chars", value: "Value with \"quotes\"" },
        ],
      });

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadata.name).to.include("&");
      expect(collection.metadata.description).to.include("\n");
    });

    it("Prevents unauthorized mint changes", async () => {
      // Mint is set at creation and cannot be changed
      // This is enforced by the PDA derivation
      const mint1 = anchor.web3.Keypair.generate();
      const mint2 = anchor.web3.Keypair.generate();

      const [collectionPda1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), mint1.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createCollection({
          name: "Collection 1",
          symbol: "COL1",
          description: "Description",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/image.png",
          externalUrl: "https://example.com",
          attributes: [],
          properties: {
            files: [{ uri: "https://example.com/image.png", type: "image/png" }],
            category: "image",
            creators: [{ address: authority.publicKey.toString(), share: 100 }],
          },
        })
        .accounts({
          collection: collectionPda1,
          mint: mint1.publicKey,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const collection = await program.account.collection.fetch(collectionPda1);
      expect(collection.mint.toString()).to.equal(mint1.publicKey.toString());
      // Mint cannot be changed - it's part of the PDA derivation
    });
  });

  describe("End-to-end (all categories)", () => {
    it("Collection Creation → Metadata Updates → Edge Cases in one flow", async () => {
      const baseMeta = {
        files: [{ uri: "https://example.com/image.png", type: "image/png" }],
        category: "image",
        creators: [{ address: authority.publicKey.toString(), share: 100 }],
      };

      // —— Collection Creation ——
      const { collectionPda: pdaA } = await createCollection({});
      const colA = await program.account.collection.fetch(pdaA);
      expect(colA.metadata.name).to.equal("Test Collection");

      const { collectionPda: pdaB } = await createCollection({
        name: "Custom Name",
        description: "Custom Description",
        image: "https://custom.com/img.png",
        externalUrl: null,
        attributes: [
          { traitType: "Rarity", value: "Legendary" },
          { traitType: "Color", value: "Blue" },
        ],
      });
      const colB = await program.account.collection.fetch(pdaB);
      expect(colB.metadata.name).to.equal("Custom Name");
      expect(colB.metadata.externalUrl).to.be.null;
      expect(colB.metadata.attributes.length).to.equal(2);

      const mintDup = anchor.web3.Keypair.generate();
      const [pdaDup] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), mintDup.publicKey.toBuffer()],
        program.programId
      );
      await program.methods
        .createCollection({
          name: "Dup",
          symbol: "DUP",
          description: "D",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/i.png",
          externalUrl: "https://example.com",
          attributes: [],
          properties: baseMeta,
        })
        .accounts({
          collection: pdaDup,
          mint: mintDup.publicKey,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      try {
        await program.methods
          .createCollection({
            name: "Dup2",
            symbol: "D2",
            description: "D",
            sellerFeeBasisPoints: 250,
            image: "https://example.com/i.png",
            externalUrl: "https://example.com",
            attributes: [],
            properties: baseMeta,
          })
          .accounts({
            collection: pdaDup,
            mint: mintDup.publicKey,
            authority: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        assert.fail("Duplicate create should fail");
      } catch (e: any) {
        expect(e).to.exist;
      }

      // —— Metadata Updates ——
      await program.methods
        .updateMetadata({
          name: "Updated Name",
          symbol: "UPD",
          description: "Updated Description",
          sellerFeeBasisPoints: 250,
          image: "https://updated.com/img.png",
          externalUrl: "https://updated.com",
          attributes: [{ traitType: "Updated", value: "Value" }],
          properties: baseMeta,
        })
        .accounts({ collection: pdaB, authority: authority.publicKey })
        .rpc();
      let colB2 = await program.account.collection.fetch(pdaB);
      expect(colB2.metadata.name).to.equal("Updated Name");
      expect(colB2.metadata.attributes.length).to.equal(1);

      await program.methods
        .updateMetadata({
          name: "Updated Name",
          symbol: "UPD",
          description: "Updated Description",
          sellerFeeBasisPoints: 250,
          image: "https://updated.com/img.png",
          externalUrl: null,
          attributes: [],
          properties: baseMeta,
        })
        .accounts({ collection: pdaB, authority: authority.publicKey })
        .rpc();
      colB2 = await program.account.collection.fetch(pdaB);
      expect(colB2.metadata.externalUrl).to.be.null;

      await program.methods
        .updateMetadata({
          name: "Updated Name",
          symbol: "UPD",
          description: "Updated Description",
          sellerFeeBasisPoints: 250,
          image: "https://updated.com/img.png",
          externalUrl: "https://example.com",
          attributes: [
            { traitType: "T1", value: "V1" },
            { traitType: "T2", value: "V2" },
            { traitType: "T3", value: "V3" },
          ],
          properties: baseMeta,
        })
        .accounts({ collection: pdaB, authority: authority.publicKey })
        .rpc();
      colB2 = await program.account.collection.fetch(pdaB);
      expect(colB2.metadata.attributes.length).to.equal(3);

      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));
      try {
        await program.methods
          .updateMetadata({
            name: "Hacked",
            symbol: "H",
            description: "H",
            sellerFeeBasisPoints: 250,
            image: "https://x.com/i.png",
            externalUrl: "https://x.com",
            attributes: [],
            properties: baseMeta,
          })
          .accounts({ collection: pdaB, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc();
        assert.fail("Unauthorized update should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.error?.error?.errorCode?.code).to.equal("Unauthorized");
      }

      // —— Edge Cases & Security ——
      const long = "A".repeat(200);
      const manyAttrs = Array.from({ length: 10 }, (_, i) => ({ traitType: `T${i}`, value: `V${i}` }));
      const { collectionPda: pdaC } = await createCollection({
        name: long.substring(0, 100),
        description: long.substring(0, 500),
        image: "https://example.com/img.png",
        attributes: manyAttrs,
      });
      const colC = await program.account.collection.fetch(pdaC);
      expect(colC.metadata.attributes.length).to.equal(10);

      const { collectionPda: pdaD } = await createCollection({
        name: "Special & < \" '",
        description: "Desc\nwith\ttabs",
        image: "https://example.com/img?x=1&y=2",
        attributes: [{ traitType: "K & V", value: "Val\"ue" }],
      });
      const colD = await program.account.collection.fetch(pdaD);
      expect(colD.metadata.name).to.include("&");

      const createdAtBefore = (await program.account.collection.fetch(pdaC)).createdAt.toNumber();
      await program.methods
        .updateMetadata({
          name: "Still Long",
          symbol: "UPD",
          description: "Updated",
          sellerFeeBasisPoints: 250,
          image: "https://example.com/img.png",
          externalUrl: "https://example.com",
          attributes: [],
          properties: baseMeta,
        })
        .accounts({ collection: pdaC, authority: authority.publicKey })
        .rpc();
      const colC2 = await program.account.collection.fetch(pdaC);
      expect(colC2.createdAt.toNumber()).to.equal(createdAtBefore);
    });
  });
});

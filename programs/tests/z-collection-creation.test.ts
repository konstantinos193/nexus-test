import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  authority,
  rpcOptions,
  waitAfterAirdrop,
  ensureProviderFunds,
  createFileProperty,
  toSnakeCaseMetadata,
  registryContains,
  createCollection,
} from "./nexus-collection-helpers";

describe("nexus-collection", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("Collection Creation", () => {
    it("Creates a collection successfully", async () => {
      const metadataUri = "https://example.com/metadata.json";
      const { collectionPda } = await createCollection({}, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.authority.toString()).to.equal(authority.publicKey.toString());
      expect(collection.metadataUri).to.equal(metadataUri);
      // New fields: status defaults to 0 (draft), featured defaults to false
      expect(collection.status).to.equal(0);
      expect(collection.featured).to.equal(false);
      // Metadata is now off-chain, so we can't check it on-chain
      // In production, you'd fetch it from the URI
    });

    it("Creates collection with custom metadata", async () => {
      const metadataUri = "https://custom.com/metadata.json";
      const { collectionPda } = await createCollection({
        name: "Custom Name",
        description: "Custom Description",
        image: "https://custom.com/image.png",
        externalUrl: "https://custom.com",
        attributes: [
          { traitType: "Rarity", value: "Legendary" },
          { traitType: "Color", value: "Blue" },
        ],
      }, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(metadataUri);
      // Metadata is now off-chain, so we can't check it on-chain
      // In production, you'd fetch it from the URI to verify the content
    });

    it("Creates collection without external URL", async () => {
      const metadataUri = "https://example.com/metadata.json";
      const { collectionPda } = await createCollection({
        externalUrl: null,
      }, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(metadataUri);
      // External URL is now in off-chain metadata, not on-chain
    });

    it("Creates collection without attributes", async () => {
      const metadataUri = "https://example.com/metadata.json";
      const { collectionPda } = await createCollection({
        attributes: [],
      }, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(metadataUri);
      // Attributes are now in off-chain metadata, not on-chain
    });

    it("Prevents duplicate collection for same mint", async () => {
      const mint = anchor.web3.Keypair.generate();
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), mint.publicKey.toBuffer()],
        program.programId
      );
      const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      );

      // First creation
      await program.methods
        .createCollection("https://example.com/first-metadata.json")
        .accountsStrict({
          collection: collectionPda,
          mint: mint.publicKey,
          registry: registryPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(rpcOptions);

      // Second creation should fail
      try {
        await program.methods
          .createCollection("https://example.com/second-metadata.json")
        .accountsStrict({
          collection: collectionPda,
          mint: mint.publicKey,
          registry: registryPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(rpcOptions);
        assert.fail("Should have failed - collection already exists");
      } catch (err: any) {
        // Anchor will fail because account already initialized
        expect(err).to.exist;
      }
    });

    it("Registers collection in registry on creation", async () => {
      const metadataUri = "https://example.com/metadata.json";
      const { collectionPda, registryPda } = await createCollection({}, metadataUri);

      // Fetch registry to verify collection was registered
      const registry = await program.account.collectionRegistry.fetch(registryPda);
      
      // Debug: Print the keys for comparison
      console.log("collectionPda:", collectionPda.toBase58());
      console.log("registry collections:", registry.collections.map((c: anchor.web3.PublicKey) => c.toBase58()));
      
      // Use helper function for PublicKey comparison (uses .equals() not ===)
      expect(registryContains(registry, collectionPda)).to.equal(true);
      
      expect(registry.collections.length).to.be.greaterThan(0);
    });
  });
});

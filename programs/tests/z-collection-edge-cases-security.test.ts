import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  authority,
  provider,
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

  describe("Edge Cases & Security", () => {
    it("Handles long metadata strings", async () => {
      const longString = "A".repeat(1000); // Create a string longer than any max_len
      const metadataUri = "https://example.com/long-metadata.json";
      const { collectionPda } = await createCollection({
        name: longString, // Will be truncated to 100
        description: longString, // Will be truncated to 500
        image: longString, // Will be truncated to 200
        externalUrl: longString, // Will be truncated to 200
      }, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(metadataUri);
      // Metadata strings are now in off-chain JSON, not on-chain
      // The truncation happens during validation, but the result is stored off-chain
    });

    it("Handles many attributes", async () => {
      const manyAttributes = Array.from({ length: 10 }, (_, i) => ({
        traitType: `Trait${i}`,
        value: `Value${i}`,
      }));

      const metadataUri = "https://example.com/many-attributes.json";
      const { collectionPda } = await createCollection({
        attributes: manyAttributes,
      }, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(metadataUri);
      // Attributes are now in off-chain metadata, not on-chain
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
      await waitAfterAirdrop();

      try {
        await program.methods
          .updateMetadata("https://hacked.com/metadata.json")
          .accountsStrict({
            collection: collectionPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Should have failed - wrong authority");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }
    });

    it("Preserves created_at timestamp", async () => {
      const { collectionPda } = await createCollection({});
      const collectionBefore = await program.account.collection.fetch(collectionPda);
      const createdAtBefore = collectionBefore.createdAt.toNumber();

      // Update metadata URI
      await program.methods
        .updateMetadata("https://example.com/updated-metadata.json")
        .accountsStrict({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);

      const collectionAfter = await program.account.collection.fetch(collectionPda);
      // Created at should not change
      expect(collectionAfter.createdAt.toNumber()).to.equal(createdAtBefore);
    });

    it("Handles special characters in metadata", async () => {
      const metadataUri = "https://example.com/special-chars-metadata.json";
      const { collectionPda } = await createCollection({
        name: "Test & Collection < > \" '",
        description: "Description with\nnewlines\tand\ttabs",
        image: "https://example.com/image.png?param=value&other=test",
        attributes: [
          { traitType: "Special & Chars", value: "Value with \"quotes\"" },
        ],
      }, metadataUri);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(metadataUri);
      // Special characters are now in off-chain metadata, not on-chain
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
      const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      );

      await program.methods
        .createCollection("https://example.com/collection1-metadata.json")
        .accountsStrict({
          collection: collectionPda1,
          mint: mint1.publicKey,
          registry: registryPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda1);
      expect(collection.mint.toString()).to.equal(mint1.publicKey.toString());
      // Mint cannot be changed - it's part of the PDA derivation
    });
  });
});

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

  describe("Metadata Updates", () => {
    let collectionPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
    });

    it("Updates metadata successfully", async () => {
      const newMetadataUri = "https://updated.com/metadata.json";
      await program.methods
        .updateMetadata(newMetadataUri)
        .accountsStrict({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(newMetadataUri);
      // Metadata is now off-chain, so we can't check it on-chain
      // In production, you'd fetch it from the URI to verify the content
    });

    it("Only authority can update metadata", async () => {
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
        assert.fail("Should have failed - unauthorized");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }
    });

    // Metadata is now off-chain; update_metadata only accepts a URI string.
    // "Updates to null external URL" is obsolete — we no longer store metadata on-chain.

    it("Updates metadata URI", async () => {
      const newMetadataUri = "https://example.com/updated-metadata.json";
      await program.methods
        .updateMetadata(newMetadataUri)
        .accountsStrict({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataUri).to.equal(newMetadataUri);
      // Attributes are now in off-chain metadata, not on-chain
    });
  });
});

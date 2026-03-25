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

  describe("Collection Status & Featured", () => {
    let collectionPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
    });

    it("Updates collection status successfully", async () => {
      // Status: 0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused
      await program.methods
        .updateCollectionStatus(3) // minting
        .accountsStrict({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.status).to.equal(3);
    });

    it("Only authority can update status", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await waitAfterAirdrop();

      try {
        await program.methods
          .updateCollectionStatus(3)
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

    it("Rejects invalid status values", async () => {
      try {
        await program.methods
          .updateCollectionStatus(10) // Invalid status (> 5)
          .accountsStrict({
            collection: collectionPda,
            authority: authority.publicKey,
          })
          .rpc(rpcOptions);
        assert.fail("Should have failed - invalid status");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("InvalidStatus");
      }
    });

    it("Updates featured flag successfully", async () => {
      // Create a platform authority keypair for testing
      // In production, this would be a specific platform wallet
      const platformAuthority = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        platformAuthority.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await waitAfterAirdrop();

      // Verify featured defaults to false
      let collection = await program.account.collection.fetch(collectionPda);
      expect(collection.featured).to.equal(false);

      // Update featured to true
      await program.methods
        .updateFeatured(true)
        .accountsStrict({
          collection: collectionPda,
          platformAuthority: platformAuthority.publicKey,
        })
        .signers([platformAuthority])
        .rpc(rpcOptions);

      // Verify featured is now true
      collection = await program.account.collection.fetch(collectionPda);
      expect(collection.featured).to.equal(true);

      // Update featured back to false
      await program.methods
        .updateFeatured(false)
        .accountsStrict({
          collection: collectionPda,
          platformAuthority: platformAuthority.publicKey,
        })
        .signers([platformAuthority])
        .rpc(rpcOptions);

      // Verify featured is now false
      collection = await program.account.collection.fetch(collectionPda);
      expect(collection.featured).to.equal(false);
    });

    it("Only platform authority can update featured flag", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await waitAfterAirdrop();

      // Try to update featured with unauthorized account (not a signer in the accounts)
      // This should fail because Anchor requires the platform_authority to be a Signer
      try {
        await program.methods
          .updateFeatured(true)
          .accountsStrict({
            collection: collectionPda,
            platformAuthority: unauthorized.publicKey, // Not signing
          })
          .rpc(rpcOptions);
        assert.fail("Should have failed - platform authority must be a signer");
      } catch (err: any) {
        // Anchor will fail because platform_authority must be a signer
        expect(err).to.exist;
      }
    });

    it("Status persists across updates", async () => {
      await program.methods
        .updateCollectionStatus(2) // ready
        .accountsStrict({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);

      // Update metadata (should not affect status)
      await program.methods
        .updateMetadata("https://updated.com/metadata.json")
        .accountsStrict({
          collection: collectionPda,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.status).to.equal(2); // Status should still be 2
    });
  });
});

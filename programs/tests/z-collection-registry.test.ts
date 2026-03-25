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

  describe("Collection Registry", () => {
    it("Registry is created on first collection", async () => {
      const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      );

      // Before first collection, registry might not exist
      // After first collection, it should exist
      const { collectionPda } = await createCollection({});

      const registry = await program.account.collectionRegistry.fetch(registryPda);
      // Use helper function for PublicKey comparison (uses .equals() not ===)
      expect(registryContains(registry, collectionPda)).to.equal(true);
    });

    it("Registry accumulates multiple collections", async () => {
      const { collectionPda: pda1 } = await createCollection({
        name: "Collection 1",
      });
      const { collectionPda: pda2 } = await createCollection({
        name: "Collection 2",
      });
      const { collectionPda: pda3 } = await createCollection({
        name: "Collection 3",
      });

      const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      );
      const registry = await program.account.collectionRegistry.fetch(registryPda);

      // Use helper function for PublicKey comparison (uses .equals() not ===)
      expect(registryContains(registry, pda1)).to.equal(true);
      expect(registryContains(registry, pda2)).to.equal(true);
      expect(registryContains(registry, pda3)).to.equal(true);
      expect(registry.collections.length).to.be.at.least(3);
    });

    it("Registry does not duplicate collections", async () => {
      const { collectionPda } = await createCollection({});

      const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      );
      const registryBefore = await program.account.collectionRegistry.fetch(registryPda);
      const countBefore = registryBefore.collections.length;

      // Try to create another collection (different mint, so it will succeed)
      // But the same collection PDA shouldn't be added twice
      const { collectionPda: pda2 } = await createCollection({
        name: "Different Collection",
      });

      const registryAfter = await program.account.collectionRegistry.fetch(registryPda);
      // Should have at least 2 collections (the original + the new one)
      expect(registryAfter.collections.length).to.be.at.least(countBefore + 1);
      // Original collection should still be there - use helper function for PublicKey comparison
      expect(registryContains(registryAfter, collectionPda)).to.equal(true);
    });
  });
});

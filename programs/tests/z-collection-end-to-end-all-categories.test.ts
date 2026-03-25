import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
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

  describe("End-to-end (all categories)", () => {
    it("Collection Creation → Metadata Updates → Edge Cases in one flow", async () => {
      const baseMeta = {
        files: [createFileProperty("https://example.com/image.png", "image/png")],
        category: "image",
        creators: [{ address: authority.publicKey.toString(), share: 100 }],
      };

      // —— Collection Creation ——
      const { collectionPda: pdaA } = await createCollection({}, "https://example.com/collection-a.json");
      const colA = await program.account.collection.fetch(pdaA);
      expect(colA.metadataUri).to.equal("https://example.com/collection-a.json");
      // Verify new fields exist
      expect(colA.status).to.equal(0); // Default status
      expect(colA.featured).to.equal(false); // Default featured

      const { collectionPda: pdaB } = await createCollection({
        name: "Custom Name",
        description: "Custom Description",
        image: "https://custom.com/img.png",
        externalUrl: null,
        attributes: [
          { traitType: "Rarity", value: "Legendary" },
          { traitType: "Color", value: "Blue" },
        ],
      }, "https://example.com/collection-b.json");
      const colB = await program.account.collection.fetch(pdaB);
      expect(colB.metadataUri).to.equal("https://example.com/collection-b.json");

      const mintDup = anchor.web3.Keypair.generate();
      const [pdaDup] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), mintDup.publicKey.toBuffer()],
        program.programId
      );
      const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      );
      await program.methods
        .createCollection("https://example.com/dup-metadata.json")
        .accountsStrict({
          collection: pdaDup,
          mint: mintDup.publicKey,
          registry: registryPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(rpcOptions);
      try {
        await program.methods
          .createCollection("https://example.com/dup2-metadata.json")
          .accountsStrict({
            collection: pdaDup,
            mint: mintDup.publicKey,
            registry: registryPda,
            authority: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc(rpcOptions);
        assert.fail("Duplicate create should fail");
      } catch (e: any) {
        expect(e).to.exist;
      }

      // —— Metadata Updates ——
      await program.methods
        .updateMetadata("https://example.com/updated-b.json")
        .accountsStrict({
          collection: pdaB,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);
      const colBUpdated = await program.account.collection.fetch(pdaB);
      expect(colBUpdated.metadataUri).to.equal("https://example.com/updated-b.json");

      // —— Status Updates ——
      await program.methods
        .updateCollectionStatus(3) // minting
        .accountsStrict({
          collection: pdaB,
          authority: authority.publicKey,
        })
        .rpc(rpcOptions);
      const colBWithStatus = await program.account.collection.fetch(pdaB);
      expect(colBWithStatus.status).to.equal(3);

      // —— Verify Registry Contains All Collections ——
      const registry = await program.account.collectionRegistry.fetch(registryPda);
      // Use helper function for PublicKey comparison (uses .equals() not ===)
      expect(registryContains(registry, pdaA)).to.equal(true);
      expect(registryContains(registry, pdaB)).to.equal(true);
      expect(registryContains(registry, pdaDup)).to.equal(true);

      // Old metadata update test (commented out - metadata is now off-chain)
      /*
      await program.methods
        .updateMetadata(toSnakeCaseMetadata({
          name: "Updated Name",
          symbol: "UPD",
          description: "Updated Description",
          sellerFeeBasisPoints: 250,
          image: "https://updated.com/img.png",
          externalUrl: "https://updated.com",
          attributes: [{ traitType: "Updated", value: "Value" }],
          properties: baseMeta,
        }))
        .accountsStrict({ collection: pdaB, authority: authority.publicKey })
        .rpc(rpcOptions);
      let colB2 = await program.account.collection.fetch(pdaB);
      expect(colB2.metadata.name).to.equal("Updated Name");
      expect(colB2.metadata.attributes.length).to.equal(1);

      await program.methods
        .updateMetadata(toSnakeCaseMetadata({
          name: "Updated Name",
          symbol: "UPD",
          description: "Updated Description",
          sellerFeeBasisPoints: 250,
          image: "https://updated.com/img.png",
          externalUrl: null,
          attributes: [],
          properties: baseMeta,
        }))
        .accountsStrict({ collection: pdaB, authority: authority.publicKey })
        .rpc(rpcOptions);
      colB2 = await program.account.collection.fetch(pdaB);
      expect(colB2.metadata.externalUrl).to.be.null;

      await program.methods
        .updateMetadata(toSnakeCaseMetadata({
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
        }))
        .accountsStrict({ collection: pdaB, authority: authority.publicKey })
        .rpc(rpcOptions);
      colB2 = await program.account.collection.fetch(pdaB);
      expect(colB2.metadata.attributes.length).to.equal(3);

      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();
      try {
        await program.methods
          .updateMetadata("https://hacked.com/metadata.json")
          .accountsStrict({ collection: pdaB, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Unauthorized update should fail");
      } catch (e: any) {
        const errorCode = getProgramErrorCode(e, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }
      */

      // —— Edge Cases & Security ——
      const long = "A".repeat(200);
      const manyAttrs = Array.from({ length: 10 }, (_, i) => ({ traitType: `T${i}`, value: `V${i}` }));
      const { collectionPda: pdaC } = await createCollection({
        name: long.substring(0, 100),
        description: long.substring(0, 500),
        image: "https://example.com/img.png",
        attributes: manyAttrs,
      }, "https://example.com/edge-case-c.json");
      const colC = await program.account.collection.fetch(pdaC);
      expect(colC.metadataUri).to.equal("https://example.com/edge-case-c.json");

      const { collectionPda: pdaD } = await createCollection({
        name: "Special & < \" '",
        description: "Desc\nwith\ttabs",
        image: "https://example.com/img?x=1&y=2",
        attributes: [{ traitType: "K & V", value: "Val\"ue" }],
      }, "https://example.com/edge-case-d.json");
      const colD = await program.account.collection.fetch(pdaD);
      expect(colD.metadataUri).to.equal("https://example.com/edge-case-d.json");

      const createdAtBefore = (await program.account.collection.fetch(pdaC)).createdAt.toNumber();
      await program.methods
        .updateMetadata("https://example.com/updated-edge-case.json")
        .accountsStrict({ collection: pdaC, authority: authority.publicKey })
        .rpc(rpcOptions);
      const colC2 = await program.account.collection.fetch(pdaC);
      expect(colC2.createdAt.toNumber()).to.equal(createdAtBefore);
      expect(colC2.metadataUri).to.equal("https://example.com/updated-edge-case.json");

      // —— Final Registry Check ——
      const finalRegistry = await program.account.collectionRegistry.fetch(registryPda);
      // Use helper function for PublicKey comparison (uses .equals() not ===)
      expect(registryContains(finalRegistry, pdaA)).to.equal(true);
      expect(registryContains(finalRegistry, pdaB)).to.equal(true);
      expect(registryContains(finalRegistry, pdaDup)).to.equal(true);
      expect(registryContains(finalRegistry, pdaC)).to.equal(true);
      expect(registryContains(finalRegistry, pdaD)).to.equal(true);
    });
  });
});

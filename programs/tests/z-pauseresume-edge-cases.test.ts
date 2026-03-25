import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
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
  createCollection,
} from "./nexus-launchpad-helpers";

describe("nexus-launchpad", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("Pause/Resume - Edge Cases", () => {
    let collectionPda: anchor.web3.PublicKey;
    let creatorWallet: anchor.web3.PublicKey;
    let platformWallet: anchor.web3.PublicKey;
    let collectionAuthority: anchor.web3.Keypair;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
      creatorWallet = result.creatorWallet.publicKey;
      platformWallet = result.platformWallet.publicKey;
      collectionAuthority = result.authority;
    });

    it("Pause when already paused (idempotent)", async () => {
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      // Pause again (should be idempotent)
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(isPaused(collection.flags)).to.be.true;
    });

    it("Resume when not paused (idempotent)", async () => {
      // Resume without pausing first
      await program.methods
        .resume()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(isPaused(collection.flags)).to.be.false;
    });

    it("Pause and resume multiple times", async () => {
      for (let i = 0; i < 3; i++) {
        await program.methods
          .pause()
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);

        let collection = await program.account.collection.fetch(collectionPda);
        expect(isPaused(collection.flags)).to.be.true;

        await program.methods
          .resume()
          .accountsStrict({
            collection: collectionPda,
            authority: collectionAuthority.publicKey,
          })
          .signers(collectionAuthority === authority ? [] : [collectionAuthority])
          .rpc(rpcOptions);

        collection = await program.account.collection.fetch(collectionPda);
        expect(isPaused(collection.flags)).to.be.false;
      }
    });
  });
});

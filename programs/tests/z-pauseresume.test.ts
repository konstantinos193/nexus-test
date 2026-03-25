import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import { buildAccountsFromIdl } from "../utils/idl-sync";
import {
  program,
  provider,
  authority,
  rpcOptions,
  airdropAndConfirm,
  waitAfterAirdrop,
  ensureProviderFunds,
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

  describe("Pause/Resume", () => {
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

    it("Pauses and resumes minting", async () => {
      // Pause
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

      // Resume
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
    });

    it("Can mint after resuming", async () => {
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Pause, then resume
      await program.methods.pause().accountsStrict({
        collection: collectionPda,
        authority: collectionAuthority.publicKey,
      }).signers(collectionAuthority === authority ? [] : [collectionAuthority]).rpc(rpcOptions);

      await program.methods.resume().accountsStrict({
        collection: collectionPda,
        authority: collectionAuthority.publicKey,
      }).signers(collectionAuthority === authority ? [] : [collectionAuthority]).rpc(rpcOptions);

      // Now mint should work (use mintAccounts + 3-arg mint for IDL/resolver compatibility)
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      const mintAccs = buildAccountsFromIdl(program, "mint", {
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet,
        platformWallet,
        walletTracker: walletTrackerPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      });
      await program.methods
        .mint(1, [], 0)
        .accountsStrict(mintAccs)
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(1);
    });
  });
});

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

  describe("Config Updates", () => {
    let collectionPda: anchor.web3.PublicKey;
    let collectionAuthority: anchor.web3.Keypair;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
      collectionAuthority = result.authority;
    });

    it("Updates collection config", async () => {
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(2000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
          startTime: new anchor.BN(startTime),
          endTime: { some: new anchor.BN(now + 86400) },
          mintLimitPerWallet: { some: 10 },
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(2000);
      expect(collection.price.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL * 0.2);
      expect(collection.mintLimitPerWallet).to.equal(10);
      expect(collection.metadataStandard).to.equal(2); // 2 = Core
    });
  });
});

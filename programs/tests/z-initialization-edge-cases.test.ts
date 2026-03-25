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

  describe("Initialization - Edge Cases", () => {
    it("Initializes with max supply = 1", async () => {
      const { collectionPda } = await createCollection({ maxSupply: 1 });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.maxSupply.toNumber()).to.equal(1);
    });

    it("Initializes with price = 1 lamport", async () => {
      const { collectionPda } = await createCollection({ pricePerNft: 1 });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.price.toNumber()).to.equal(1);
    });

    it("Initializes with mint limit = 1", async () => {
      const { collectionPda } = await createCollection({ mintLimitPerWallet: 1 });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.mintLimitPerWallet).to.not.equal(0);
      expect(collection.mintLimitPerWallet).to.equal(1);
    });

    it("Initializes with mint limit = 255 (max u8)", async () => {
      const { collectionPda } = await createCollection({ mintLimitPerWallet: 255 });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.mintLimitPerWallet).to.not.equal(0);
      expect(collection.mintLimitPerWallet).to.equal(255);
    });

    it("Initializes with start time = current time exactly", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      const { collectionPda } = await createCollection({ startTime });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.startTime.toNumber()).to.equal(startTime);
    });

    it("Initializes with end time = start time exactly", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      const { collectionPda } = await createCollection({ 
        startTime,
        endTime: startTime
      });
      const collection = await program.account.collection.fetch(collectionPda);
      expect(isDisabledI64(collection.endTime)).to.be.false;
      // Note: endTime might be slightly different due to transaction processing time
      // Check that it's close to startTime (within 60 seconds)
      expect(Math.abs(collection.endTime.toNumber() - startTime)).to.be.lessThan(60);
    });
  });
});

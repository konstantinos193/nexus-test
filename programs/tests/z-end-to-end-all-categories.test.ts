import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
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

  describe("End-to-end (all categories)", () => {
    it("Initialization → Minting → Access Control → Pause/Resume → Config Updates → Edge Cases", async () => {
      const pricePerNft = anchor.web3.LAMPORTS_PER_SOL * 0.1;

      // —— Initialization ——
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({
        maxSupply: 10,
        mintLimitPerWallet: 3,
        metadataStandard: "core",
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);
      let col = await program.account.collection.fetch(collectionPda);
      expect(col.maxSupply.toNumber()).to.equal(10);
      expect(col.mintLimitPerWallet).to.equal(3);
      expect(col.metadataStandard).to.equal(2); // Core = 2 (0=Legacy, 1=Programmable, 2=Core)
      expect(col.minted.toNumber()).to.equal(0);

      // —— Access Control (unauthorized pause) ——
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();
      try {
        await program.methods
          .pause()
          .accountsStrict({ collection: collectionPda, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Unauthorized pause should fail");
      } catch (e: any) {
        const errorCode = getProgramErrorCode(e, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }

      // —— Minting ——
      const buyer1 = anchor.web3.Keypair.generate();
      const buyer2 = anchor.web3.Keypair.generate();
      const buyer3 = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer1.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await airdropAndConfirm(buyer2.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await airdropAndConfirm(buyer3.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      // Wait until buyers have balance (localnet airdrops can be delayed)
      const minBalance = pricePerNft + 1e6; // mint cost + rent
      for (const buyer of [buyer1, buyer2, buyer3]) {
        for (let i = 0; i < 30; i++) {
          const bal = await provider.connection.getBalance(buyer.publicKey, "processed");
          if (bal >= minBalance) break;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      function walletTracker(buyer: anchor.web3.PublicKey) {
        return anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.toBuffer()],
          program.programId
        )[0];
      }

      const creatorBalanceBefore = await provider.connection.getBalance(creatorWallet.publicKey);

      const mintAcc = (buyer: anchor.web3.PublicKey) =>
        mintAccounts({
          collection: collectionPda,
          buyer,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTracker(buyer),
        });

      await program.methods.mint(1, [], 0).accountsStrict(mintAcc(buyer1.publicKey)).signers([buyer1]).rpc();

      await program.methods.mint(2, [], 0).accountsStrict(mintAcc(buyer1.publicKey)).signers([buyer1]).rpc();

      await program.methods.mint(2, [], 0).accountsStrict(mintAcc(buyer2.publicKey)).signers([buyer2]).rpc();

      col = await program.account.collection.fetch(collectionPda);
      expect(col.minted.toNumber()).to.equal(5);
      const creatorBalanceAfter5 = await provider.connection.getBalance(creatorWallet.publicKey);
      expect(creatorBalanceAfter5 - creatorBalanceBefore).to.be.greaterThan(pricePerNft * 4 * 0.9);

      // —— Pause / Resume ——
      await program.methods
        .pause()
        .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
        .signers([collectionAuthority])
        .rpc(rpcOptions);
      col = await program.account.collection.fetch(collectionPda);
      expect(isPaused(col.flags)).to.be.true;

      try {
        await program.methods.mint(1, [], 0).accountsStrict(mintAcc(buyer2.publicKey)).signers([buyer2]).rpc();
        assert.fail("Mint when paused should fail");
      } catch (e: any) {
        const errorCode = getProgramErrorCode(e, program.idl);
        expect(errorCode).to.equal("MintingPaused");
      }

      try {
        await program.methods
          .resume()
          .accountsStrict({ collection: collectionPda, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Unauthorized resume should fail");
      } catch (e: any) {
        const errorCode = getProgramErrorCode(e, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }

      await program.methods
        .resume()
        .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
        .signers([collectionAuthority])
        .rpc(rpcOptions);
      col = await program.account.collection.fetch(collectionPda);
      expect(isPaused(col.flags)).to.be.false;

      await program.methods.mint(1, [], 0).accountsStrict(mintAcc(buyer2.publicKey)).signers([buyer2]).rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.minted.toNumber()).to.equal(6);

      // —— Config Updates (unauthorized then authorized) ——
      const now = Math.floor(Date.now() / 1000);
      const newConfig = {
        maxSupply: new anchor.BN(20),
        pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
        startTime: new anchor.BN(now - 60), // keep in past so minting stays open
        endTime: new anchor.BN(now + 86400),
        mintLimitPerWallet: 5,
        metadataStandard: metadataStandard("core"), // immutable: must match collection
        freezeTradingUntilDate: null,
        freezeTradingUntilSoldOut: false,
      };
      try {
        await program.methods.updateConfig(newConfig)
          .accountsStrict({ collection: collectionPda, authority: unauthorized.publicKey })
          .signers([unauthorized])
          .rpc(rpcOptions);
        assert.fail("Unauthorized update config should fail");
      } catch (e: any) {
        const errorCode = getProgramErrorCode(e, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }

      await program.methods.updateConfig(newConfig)
        .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
        .signers([collectionAuthority])
        .rpc(rpcOptions);
      col = await program.account.collection.fetch(collectionPda);
      expect(col.maxSupply.toNumber()).to.equal(20);
      expect(col.price.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL * 0.2);
      expect(col.metadataStandard).to.equal(2); // core (immutable)

      await program.methods.mint(1, [], 0).accountsStrict(mintAcc(buyer3.publicKey)).signers([buyer3]).rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.minted.toNumber()).to.equal(7);

      // —— Edge Cases: supply exceeded, creator wallet mutable (mint succeeds) ——
      try {
        await program.methods.mint(20, [], 0).accountsStrict(mintAcc(buyer3.publicKey)).signers([buyer3]).rpc();
        assert.fail("Mint exceeding supply should fail");
      } catch (e: any) {
        const errorCode = getProgramErrorCode(e, program.idl);
        expect(errorCode).to.equal("SupplyExceeded");
      }

      await program.methods.mint(1, [], 0).accountsStrict(mintAcc(buyer3.publicKey)).signers([buyer3]).rpc();
      col = await program.account.collection.fetch(collectionPda);
      expect(col.minted.toNumber()).to.equal(8);
    });
  });
});

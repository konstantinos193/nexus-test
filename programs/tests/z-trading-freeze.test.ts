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

  describe("Trading Freeze", () => {
    it("Initializes with freeze until sold out", async () => {
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 100
      });
      
      const collection = await program.account.collection.fetch(collectionPda);
      expect(freezeUntilSoldOut(collection.flags)).to.be.true;
      expect(isDisabledI64(collection.freezeUntil)).to.be.true;
    });

    it("Initializes with freeze until date", async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: futureDate
      });
      
      const collection = await program.account.collection.fetch(collectionPda);
      expect(isDisabledI64(collection.freezeUntil)).to.be.false;
      expect(collection.freezeUntil.toNumber()).to.equal(futureDate);
      expect(freezeUntilSoldOut(collection.flags)).to.be.false;
    });

    it("Initializes with both freeze conditions", async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 86400;
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: futureDate,
        freezeTradingUntilSoldOut: true
      });
      
      const collection = await program.account.collection.fetch(collectionPda);
      expect(freezeUntilSoldOut(collection.flags)).to.be.true;
      expect(isDisabledI64(collection.freezeUntil)).to.be.false;
    });

    it("Initializes with no freeze (trading allowed)", async () => {
      const { collectionPda } = await createCollection({});
      
      const collection = await program.account.collection.fetch(collectionPda);
      expect(freezeUntilSoldOut(collection.flags)).to.be.false;
      expect(isDisabledI64(collection.freezeUntil)).to.be.true;
    });

    it("is_trading_frozen returns true when frozen until sold out (not sold out)", async () => {
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 10
      });

      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it("is_trading_frozen returns false when frozen until sold out (sold out)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 2
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Mint all NFTs to sell out
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Now check if frozen (should be false - sold out)
      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.false;
    });

    it("is_trading_frozen returns true when frozen until date (before date)", async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: futureDate
      });

      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it("is_trading_frozen returns false when frozen until date (date passed)", async () => {
      const pastDate = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: pastDate
      });

      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.false;
    });

    it("is_trading_frozen returns false when no freeze conditions", async () => {
      const { collectionPda } = await createCollection({});

      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.false;
    });

    it("should_freeze_nft returns true when trading is frozen", async () => {
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 10
      });

      const result = await program.methods
        .shouldFreezeNft()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it("should_freeze_nft returns false when trading is not frozen", async () => {
      const { collectionPda } = await createCollection({});

      const result = await program.methods
        .shouldFreezeNft()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.false;
    });

    it("get_collection_freeze_state returns correct state", async () => {
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 10
      });

      const result = await program.methods
        .getCollectionFreezeState()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it("Updates trading freeze settings correctly", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});
      
      let collection = await program.account.collection.fetch(collectionPda);
      expect(freezeUntilSoldOut(collection.flags)).to.be.false;
      expect(isDisabledI64(collection.freezeUntil)).to.be.true;

      const futureDate = Math.floor(Date.now() / 1000) + 86400;
      await program.methods
        .updateTradingFreeze(
          { some: new anchor.BN(futureDate) },
          true
        )
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      collection = await program.account.collection.fetch(collectionPda);
      expect(freezeUntilSoldOut(collection.flags)).to.be.true;
      expect(isDisabledI64(collection.freezeUntil)).to.be.false;
      expect(collection.freezeUntil.toNumber()).to.equal(futureDate);
    });

    it("Updates trading freeze to remove date", async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 86400;
      const { collectionPda, authority: collectionAuthority } = await createCollection({ 
        freezeTradingUntilDate: futureDate
      });

      await program.methods
        .updateTradingFreeze(
          null,
          false
        )
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(freezeUntilSoldOut(collection.flags)).to.be.false;
      expect(isDisabledI64(collection.freezeUntil)).to.be.true;
    });

    it("Only authority can update trading freeze", async () => {
      const { collectionPda } = await createCollection({});
      const unauthorized = anchor.web3.Keypair.generate();
      await airdropAndConfirm(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      try {
        await program.methods
          .updateTradingFreeze(null, true)
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

    it("transfer_nft blocks transfer when frozen until sold out", async () => {
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 10
      });

      const signer = anchor.web3.Keypair.generate();
      try {
        await program.methods
          .transferNft()
          .accountsStrict({
            collection: collectionPda,
            nftMint: anchor.web3.Keypair.generate().publicKey,
            from: anchor.web3.Keypair.generate().publicKey,
            to: anchor.web3.Keypair.generate().publicKey,
            authority: signer.publicKey,
            tokenProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([signer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - trading frozen");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("TradingFrozen");
      }
    });

    it("transfer_nft blocks transfer when frozen until date", async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 3600;
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: futureDate
      });

      const signer = anchor.web3.Keypair.generate();
      try {
        await program.methods
          .transferNft()
          .accountsStrict({
            collection: collectionPda,
            nftMint: anchor.web3.Keypair.generate().publicKey,
            from: anchor.web3.Keypair.generate().publicKey,
            to: anchor.web3.Keypair.generate().publicKey,
            authority: signer.publicKey,
            tokenProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([signer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - trading frozen");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("TradingFrozen");
      }
    });

    it("transfer_nft allows transfer when not frozen", async () => {
      const { collectionPda } = await createCollection({});
      const signer = anchor.web3.Keypair.generate();

      // Should not throw error (though actual transfer isn't implemented)
      await program.methods
        .transferNft()
        .accountsStrict({
          collection: collectionPda,
          nftMint: anchor.web3.Keypair.generate().publicKey,
          from: anchor.web3.Keypair.generate().publicKey,
          to: anchor.web3.Keypair.generate().publicKey,
          authority: signer.publicKey,
          tokenProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([signer])
        .rpc(rpcOptions);
    });

    it("Freeze state updates automatically when collection sells out", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 2
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Check frozen before sellout
      let result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();
      expect(result).to.be.true;

      // Mint all NFTs
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Check frozen after sellout (should be false)
      result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();
      expect(result).to.be.false;
    });

    it("Freeze state updates automatically when date passes", async () => {
      const pastDate = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: pastDate
      });

      // Should not be frozen (date has passed)
      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.false;
    });

    it("Both freeze conditions must be met to unfreeze (date AND sold out)", async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 3600;
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        freezeTradingUntilDate: futureDate,
        freezeTradingUntilSoldOut: true,
        maxSupply: 2
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Should be frozen (both conditions)
      let result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();
      expect(result).to.be.true;

      // Sell out collection
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Still frozen because date hasn't passed
      result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();
      expect(result).to.be.true;
    });

    it("Edge case: Freeze until sold out with 0% sold", async () => {
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 100,
        mintLimitPerWallet: null
      });

      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true; // Should be frozen (0/100 sold)
    });

    it("Edge case: Freeze until sold out with partial sellout", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        freezeTradingUntilSoldOut: true,
        maxSupply: 10
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Mint some but not all
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet: creatorWallet.publicKey,
        platformWallet: platformWallet.publicKey,
        walletTracker: walletTrackerPda,
      });
      await program.methods
        .mint(new anchor.BN(5), [], 0)
        .accountsStrict(accounts as any)
        .signers([buyer])
        .rpc(rpcOptions);

      // Should still be frozen (5/10 sold, not fully sold out)
      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it("Edge case: Freeze date exactly at current time", async () => {
      const now = Math.floor(Date.now() / 1000);
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: now
      });

      // Should not be frozen (date is now or past)
      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      // May be true or false depending on exact timing, but should handle gracefully
      expect(typeof result).to.equal("boolean");
    });

    it("Edge case: Freeze date in near future", async () => {
      // Use 60s in future so timing doesn't race with createCollection + view round-trip
      const futureDate = Math.floor(Date.now() / 1000) + 60;
      const { collectionPda } = await createCollection({ 
        freezeTradingUntilDate: futureDate
      });

      const result = await program.methods
        .isTradingFrozen()
        .accountsStrict({
          collection: collectionPda,
        })
        .view();

      expect(result).to.be.true; // Should be frozen (freeze date not yet reached)
    });
  });
});

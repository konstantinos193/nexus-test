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

  describe("Minting - Edge Cases", () => {
    it("Fails to mint with quantity = 0", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({});
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .mint(new anchor.BN(0), [], 0)
          .accountsStrict({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed with quantity = 0");
      } catch (err: any) {
        // Should fail - quantity must be > 0
        expect(err).to.exist;
      }
    });

    it("Mints exactly remaining supply", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ maxSupply: 5 });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

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

      // Public mint: pass (quantity, [], 0) so Anchor's splitArgsAndCtx pops the context correctly (mint has 3 IDL args)
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(accounts)
        .signers([buyer])
        .rpc(rpcOptions);

      await program.methods
        .mint(new anchor.BN(3), [], 0)
        .accountsStrict(accounts)
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(5);

      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(accounts)
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - supply exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("SupplyExceeded");
      }
    });

    it("Mint when wallet tracker is exactly at limit", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        mintLimitPerWallet: 5
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // Mint exactly 5 (at limit)
      await program.methods
        .mint(new anchor.BN(5), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      // Try to mint 1 more (should fail)
      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - limit exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintLimitExceeded");
      }
    });

    it("Multiple sequential mints from same wallet", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        mintLimitPerWallet: 10
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // Mint 3 times sequentially
      for (let i = 0; i < 3; i++) {
        await program.methods
          .mint(new anchor.BN(2), [], 0)
          .accountsStrict({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer])
          .rpc(rpcOptions);
      }

      const tracker = await program.account.walletMintTracker.fetch(walletTrackerPda);
      expect(tracker.minted).to.equal(6);
    });

    it("Mint with very small price (1 lamport)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ 
        pricePerNft: 1 // 1 lamport
      });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Creator/platform wallets are new keypairs with no account. A transfer of 1 lamport would
      // "create" the account; Solana requires new accounts to receive at least rent-exempt minimum.
      // Pre-fund them so they exist; then the 1 lamport payment is just a top-up.
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      await airdropAndConfirm(creatorWallet.publicKey, rentExempt);
      await airdropAndConfirm(platformWallet.publicKey, rentExempt);

      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(1);
    });
  });
});

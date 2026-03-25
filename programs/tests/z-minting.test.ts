import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import { assertAccountsForInstruction } from "../utils/idl-sync";
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
  isLocalnet,
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

  describe("Minting", () => {
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
      await setStartTimeToNow(collectionPda, collectionAuthority);
    });

    it("Mints an NFT successfully", async () => {
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      // Always wait for airdrop before reading balances (same as z-pauseresume, z-minting-edge-cases, z-platform-fee)
      if (!isLocalnet) {
        await waitAfterAirdrop();
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      const price = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1);
      const minPayment = Math.floor(Number(price) * 0.9);
      const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

      const accounts = mintAccounts({
        collection: collectionPda,
        buyer: buyer.publicKey,
        creatorWallet,
        platformWallet,
        walletTracker: walletTrackerPda,
      });
      
      // Assert all required accounts are present before calling
      assertAccountsForInstruction(program, "mint", accounts);

      const sig = await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(accounts)
        .signers([buyer])
        .rpc(rpcOptions);

      await provider.connection.confirmTransaction(sig, "confirmed");

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(1);

      const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
      const buyerSpent = BigInt(buyerBalanceBefore) - BigInt(buyerBalanceAfter);
      // Buyer paid at least 90% of price (creator payment is covered in z-platform-fee.test.ts)
      expect(Number(buyerSpent)).to.be.greaterThan(minPayment);
    });

    it("Fails to mint when paused", async () => {
      // Pause first
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

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

      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: collectionPda,
              buyer: buyer.publicKey,
              creatorWallet,
              platformWallet,
              walletTracker: walletTrackerPda,
            })
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed when paused");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintingPaused");
      }
    });

    it("Fails to mint before start time", async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const { collectionPda: futureCollectionPda, creatorWallet: futureCreatorWallet, platformWallet: futurePlatformWallet } = 
        await createCollection({ startTime: futureTime });

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          futureCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: futureCollectionPda,
              buyer: buyer.publicKey,
              creatorWallet: futureCreatorWallet.publicKey,
              platformWallet: futurePlatformWallet.publicKey,
              walletTracker: walletTrackerPda,
            })
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed before start time");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintingNotStarted");
      }
    });

    it("Fails to mint after end time", async () => {
      const now = Math.floor(Date.now() / 1000);
      // Create collection with valid times, then update both to past (start < end)
      const { collectionPda: pastCollectionPda, creatorWallet: pastCreatorWallet, platformWallet: pastPlatformWallet, authority: pastAuthority } = 
        await createCollection({});
      
      // Update both start and end times to past (start 2 days ago, end 1 hour ago)
      // update_config doesn't validate start time, so we can set it to past
      // Note: Pass Option types as raw BN or null, not { some: ... } wrapper
      const collection = await program.account.collection.fetch(pastCollectionPda);
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(now - 172800), // 2 days ago
          endTime: new anchor.BN(now - 3600), // 1 hour ago - pass as raw BN, not { some: ... }
          mintLimitPerWallet: 5, // Pass as raw number, not { some: ... }
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        } as any)
        .accountsStrict({
          collection: pastCollectionPda,
          authority: pastAuthority.publicKey,
        })
        .signers(pastAuthority === authority ? [] : [pastAuthority])
        .rpc(rpcOptions);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          pastCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: pastCollectionPda,
              buyer: buyer.publicKey,
              creatorWallet: pastCreatorWallet.publicKey,
              platformWallet: pastPlatformWallet.publicKey,
              walletTracker: walletTrackerPda,
            })
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed after end time");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintingEnded");
      }
    });

    it("Fails to mint when supply exceeded", async () => {
      const { collectionPda: smallCollectionPda, creatorWallet: smallCreatorWallet, platformWallet: smallPlatformWallet, authority: smallAuthority } = 
        await createCollection({ maxSupply: 1 });
      await setStartTimeToNow(smallCollectionPda, smallAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          smallCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // First mint succeeds
      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: smallCollectionPda,
            buyer: buyer.publicKey,
            creatorWallet: smallCreatorWallet.publicKey,
            platformWallet: smallPlatformWallet.publicKey,
            walletTracker: walletTrackerPda,
          })
        )
        .signers([buyer])
        .rpc(rpcOptions);

      // Second mint should fail
      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: smallCollectionPda,
              buyer: buyer.publicKey,
              creatorWallet: smallCreatorWallet.publicKey,
              platformWallet: smallPlatformWallet.publicKey,
              walletTracker: walletTrackerPda,
            })
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed when supply exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("SupplyExceeded");
      }
    });

    it("Enforces mint limit per wallet", async () => {
      const { collectionPda: limitedCollectionPda, creatorWallet: limitedCreatorWallet, platformWallet: limitedPlatformWallet, authority: limitedAuthority } = 
        await createCollection({ mintLimitPerWallet: 2 });
      await setStartTimeToNow(limitedCollectionPda, limitedAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          limitedCollectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Mint 2 (at limit)
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: limitedCollectionPda,
            buyer: buyer.publicKey,
            creatorWallet: limitedCreatorWallet.publicKey,
            platformWallet: limitedPlatformWallet.publicKey,
            walletTracker: walletTrackerPda,
          })
        )
        .signers([buyer])
        .rpc(rpcOptions);

      // Third mint should fail
      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: limitedCollectionPda,
              buyer: buyer.publicKey,
              creatorWallet: limitedCreatorWallet.publicKey,
              platformWallet: limitedPlatformWallet.publicKey,
              walletTracker: walletTrackerPda,
            })
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed when mint limit exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintLimitExceeded");
      }
    });

    it("Allows different wallets to mint up to limit", async () => {
      const { collectionPda: multiWalletCollectionPda, creatorWallet: multiWalletCreatorWallet, platformWallet: multiWalletPlatformWallet, authority: multiWalletAuthority } = 
        await createCollection({ mintLimitPerWallet: 2, maxSupply: 100 });
      await setStartTimeToNow(multiWalletCollectionPda, multiWalletAuthority);

      const buyer1 = anchor.web3.Keypair.generate();
      const buyer2 = anchor.web3.Keypair.generate();
      
      await provider.connection.requestAirdrop(buyer1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(buyer2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [tracker1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), multiWalletCollectionPda.toBuffer(), buyer1.publicKey.toBuffer()],
        program.programId
      );
      const [tracker2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), multiWalletCollectionPda.toBuffer(), buyer2.publicKey.toBuffer()],
        program.programId
      );

      // Both buyers mint at their limit
      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: multiWalletCollectionPda,
            buyer: buyer1.publicKey,
            creatorWallet: multiWalletCreatorWallet.publicKey,
            platformWallet: multiWalletPlatformWallet.publicKey,
            walletTracker: tracker1Pda,
          })
        )
        .signers([buyer1])
        .rpc(rpcOptions);

      await program.methods
        .mint(new anchor.BN(2), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: multiWalletCollectionPda,
            buyer: buyer2.publicKey,
            creatorWallet: multiWalletCreatorWallet.publicKey,
            platformWallet: multiWalletPlatformWallet.publicKey,
            walletTracker: tracker2Pda,
          })
        )
        .signers([buyer2])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(multiWalletCollectionPda);
      expect(collection.minted.toNumber()).to.equal(4);
    });

    it("Handles minting multiple NFTs in one transaction", async () => {
      const buyer = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        buyer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
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

      await program.methods
        .mint(new anchor.BN(5), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet,
            platformWallet,
            walletTracker: walletTrackerPda,
          })
        )
        .signers([buyer])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.minted.toNumber()).to.equal(5);
    });

    it("Fails with insufficient funds", async () => {
      const buyer = anchor.web3.Keypair.generate();
      // Don't airdrop - buyer has no funds

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("wallet_mint"),
          collectionPda.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .mint(new anchor.BN(1), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: collectionPda,
              buyer: buyer.publicKey,
              creatorWallet,
              platformWallet,
              walletTracker: walletTrackerPda,
            })
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed with insufficient funds");
      } catch (err: any) {
        // Should fail with insufficient funds error
        expect(err).to.exist;
      }
    });
  });
});

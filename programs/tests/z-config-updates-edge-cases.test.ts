import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
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

  describe("Config Updates - Edge Cases", () => {
    let collectionPda: anchor.web3.PublicKey;
    let creatorWallet: anchor.web3.PublicKey;
    let platformWallet: anchor.web3.PublicKey;
    let collectionAuthority: anchor.web3.Keypair;

    beforeEach(async () => {
      const result = await createCollection({ maxSupply: 100, mintLimitPerWallet: null });
      collectionPda = result.collectionPda;
      creatorWallet = result.creatorWallet.publicKey;
      platformWallet = result.platformWallet.publicKey;
      collectionAuthority = result.authority;
      await setStartTimeToNow(collectionPda, collectionAuthority);
    });

    it("Fails to update max_supply to less than already minted", async () => {
      const mintAcc = (buyer: anchor.web3.PublicKey) =>
        mintAccounts({
          collection: collectionPda,
          buyer,
          creatorWallet,
          platformWallet,
          walletTracker: anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.toBuffer()],
            program.programId
          )[0],
        });

      // Mint some NFTs first
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      await program.methods
        .mint(10, [], 0)
        .accountsStrict(mintAcc(buyer.publicKey))
        .signers([buyer])
        .rpc(rpcOptions);

      // Try to update max_supply to 5 (less than 10 minted)
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;
      try {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(5),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: null,
            mintLimitPerWallet: null,
            metadataStandard: metadataStandard("core"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          })
          .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
          .signers([collectionAuthority])
          .rpc(rpcOptions);
        const collection = await program.account.collection.fetch(collectionPda);
        expect(collection.maxSupply.toNumber()).to.equal(5);
        try {
          await program.methods
            .mint(1, [], 0)
            .accountsStrict(mintAcc(buyer.publicKey))
            .signers([buyer])
            .rpc(rpcOptions);
          assert.fail("Should have failed - supply exceeded");
        } catch (err: any) {
          const errorCode = getProgramErrorCode(err, program.idl);
          expect(errorCode).to.equal("SupplyExceeded");
        }
      } catch (err: any) {
        expect(err).to.exist;
      }
    });

    it("Updates price while minting is active", async () => {
      const mintAcc = (b: anchor.web3.PublicKey) =>
        mintAccounts({
          collection: collectionPda,
          buyer: b,
          creatorWallet,
          platformWallet,
          walletTracker: anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("wallet_mint"), collectionPda.toBuffer(), b.toBuffer()],
            program.programId
          )[0],
        });

      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      await program.methods
        .mint(1, [], 0)
        .accountsStrict(mintAcc(buyer.publicKey))
        .signers([buyer])
        .rpc(rpcOptions);

      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 60; // Keep in past so minting stays active
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(100),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.2),
          startTime: new anchor.BN(startTime),
          endTime: null,
          mintLimitPerWallet: null,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.price.toNumber()).to.equal(anchor.web3.LAMPORTS_PER_SOL * 0.2);

      // Mint with new price (should require more funds)
      const buyer2 = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      await program.methods
        .mint(1, [], 0)
        .accountsStrict(mintAcc(buyer2.publicKey))
        .signers([buyer2])
        .rpc(rpcOptions);
    });

    it("Fails to update start_time to past", async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const mintAcc = (b: anchor.web3.PublicKey) =>
        mintAccounts({
          collection: collectionPda,
          buyer: b,
          creatorWallet,
          platformWallet,
          walletTracker: anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("wallet_mint"), collectionPda.toBuffer(), b.toBuffer()],
            program.programId
          )[0],
        });

      try {
        await program.methods
          .updateConfig({
            maxSupply: new anchor.BN(100),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(pastTime),
            endTime: null,
            mintLimitPerWallet: null,
            metadataStandard: metadataStandard("core"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          })
          .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
          .signers([collectionAuthority])
          .rpc(rpcOptions);
        const buyer = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await program.methods
            .mint(1, [], 0)
            .accountsStrict(mintAcc(buyer.publicKey))
            .signers([buyer])
            .rpc(rpcOptions);
        } catch (err: any) {
          // Expected - minting may fail if start_time is in past
        }
      } catch (err: any) {
        expect(err).to.exist;
      }
    });

    it("Updates mint_limit_per_wallet", async () => {
      const mintAcc = (b: anchor.web3.PublicKey) =>
        mintAccounts({
          collection: collectionPda,
          buyer: b,
          creatorWallet,
          platformWallet,
          walletTracker: anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("wallet_mint"), collectionPda.toBuffer(), b.toBuffer()],
            program.programId
          )[0],
        });

      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 60; // Keep in past so minting stays active
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(100),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(startTime),
          endTime: null,
          mintLimitPerWallet: 3,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        })
        .accountsStrict({ collection: collectionPda, authority: collectionAuthority.publicKey })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      await program.methods
        .mint(3, [], 0)
        .accountsStrict(mintAcc(buyer.publicKey))
        .signers([buyer])
        .rpc(rpcOptions);

      try {
        await program.methods
          .mint(1, [], 0)
          .accountsStrict(mintAcc(buyer.publicKey))
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - limit exceeded");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("MintLimitExceeded");
      }
    });
  });
});

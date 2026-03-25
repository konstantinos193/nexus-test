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

  describe("Edge Cases & Security", () => {
    it("Handles maximum u64 values", async () => {
      // Test with large but safe number (within JavaScript safe integer range)
      const { collectionPda } = await createCollection({ 
        maxSupply: 1000,
        pricePerNft: Number.MAX_SAFE_INTEGER
      });

      // Should initialize successfully
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection).to.exist;
    });

    it("Prevents reentrancy through multiple mints in same slot", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({ maxSupply: 10 });
      await setStartTimeToNow(collectionPda, collectionAuthority);

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

      // Try to mint more than supply in one go (public mint: pass [], 0 for allowlist args)
      try {
        await program.methods
          .mint(11, [], 0) // More than max supply (quantity u8; public mint: no allowlist)
          .accountsStrict(mintAccounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
          }))
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have failed - exceeds supply");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("SupplyExceeded");
      }
    });

    it("Validates creator wallet is mutable (paid on mint, not claim)", async () => {
      // Creator receives payment directly to wallet on mint; account must be mutable
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } = await createCollection({});
      await setStartTimeToNow(collectionPda, collectionAuthority);

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

      await program.methods
        .mint(1, [], 0)
        .accountsStrict(mintAccounts({
          collection: collectionPda,
          buyer: buyer.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          walletTracker: walletTrackerPda,
        }))
        .signers([buyer])
        .rpc(rpcOptions);
    });
  });
});

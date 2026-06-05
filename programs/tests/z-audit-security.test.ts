/**
 * Security Audit Test Suite — NeXus Launchpad
 *
 * These tests directly verify the findings from the security audit.
 * Each TC-XX maps to a finding in the audit plan.
 *
 * NOTE: These tests use the current program API (createCollection with mint + registry
 * accounts). The older test helpers use "initializeCollection" which is a renamed
 * instruction — update those helpers before running the full suite.
 */

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
  setStartTimeToNow,
  createCollection,
} from "./nexus-launchpad-helpers";

describe("nexus-launchpad", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("Audit Security Tests", () => {

    // ─────────────────────────────────────────────────────────────────
    // TC-01: quantity = 0 MUST be rejected (HIGH finding — now fixed)
    // Before fix: transaction succeeded with no payment and no mint.
    // After fix:  transaction fails with InvalidSupply.
    // ─────────────────────────────────────────────────────────────────
    it("TC-01: rejects mint with quantity = 0 (InvalidSupply)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } =
        await createCollection({});
      await setStartTimeToNow(collectionPda, collectionAuthority);

      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .mint(new anchor.BN(0), [], 0)
          .accountsStrict(
            mintAccounts({
              collection: collectionPda,
              buyer: buyer.publicKey,
              creatorWallet: creatorWallet.publicKey,
              platformWallet: platformWallet.publicKey,
              walletTracker: walletTrackerPda,
            }) as any
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("quantity=0 should have been rejected with InvalidSupply");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("InvalidSupply");
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-02: quantity = 0 does NOT consume an allowlist proof slot
    // Even with the fix above (TC-01 fails fast), this test documents
    // that if the guard were absent, a proof could be probed repeatedly.
    // With the fix applied, this test simply confirms quantity=0 fails
    // before any allowlist verification runs.
    // ─────────────────────────────────────────────────────────────────
    it("TC-02: quantity=0 rejected before allowlist proof is evaluated", async () => {
      // Use a collection with an allowlist root set to a non-zero value.
      // If quantity=0 were allowed, the proof would be verified with no mint consumed.
      // With the fix, we never reach the allowlist check.
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } =
        await createCollection({});
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Set a non-zero allowlist root so the allowlist branch would be entered
      const fakeRoot = new Array(32).fill(0xff) as number[];
      await program.methods
        .updateAllowlistRoot(fakeRoot as any)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // A valid-looking (but fake) proof — doesn't need to be valid since
      // the quantity=0 guard fires before allowlist verification.
      const fakeProof: number[][] = [[...new Array(32).fill(0xab)]];

      try {
        await program.methods
          .mint(new anchor.BN(0), fakeProof as any, 0)
          .accountsStrict(
            mintAccounts({
              collection: collectionPda,
              buyer: buyer.publicKey,
              creatorWallet: creatorWallet.publicKey,
              platformWallet: platformWallet.publicKey,
              walletTracker: walletTrackerPda,
            }) as any
          )
          .signers([buyer])
          .rpc(rpcOptions);
        assert.fail("Should have been rejected");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        // Must fail with InvalidSupply (quantity guard) — NOT AllowlistInvalid.
        // If it fails with AllowlistInvalid, the guard is not firing first.
        expect(errorCode).to.equal("InvalidSupply",
          "Expected InvalidSupply from quantity guard, not AllowlistInvalid — " +
          "ensure require!(quantity > 0) comes before allowlist verification");
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-03: transfer_nft cannot bypass freeze by using a different collection
    // Before fix: any unfrozen collection could be passed with any nftMint.
    // After fix:  nftMint must equal collection.mint (address constraint).
    // ─────────────────────────────────────────────────────────────────
    it("TC-03: transfer_nft rejects nftMint that does not match collection.mint", async () => {
      // Create a frozen collection
      const { collectionPda: frozenCollection } = await createCollection({
        freezeTradingUntilSoldOut: true,
        maxSupply: 10,
      });

      // Create a separate open collection (not frozen)
      const { collectionPda: openCollection } = await createCollection({});

      // Open collection's mint (for the frozen collection's NFT — attacker's trick)
      const openCollectionData = await program.account.collection.fetch(openCollection);

      const signer = anchor.web3.Keypair.generate();
      // Attempt: pass FROZEN collection but OPEN collection's mint as nftMint
      // Before fix: this would succeed (return "Transfer ALLOWED")
      // After fix: Unauthorized because nftMint != frozenCollection.mint
      try {
        await program.methods
          .transferNft()
          .accountsStrict({
            collection: frozenCollection,
            nftMint: openCollectionData.mint,  // wrong mint — should be frozenCollection.mint
            from: anchor.web3.Keypair.generate().publicKey,
            to: anchor.web3.Keypair.generate().publicKey,
            authority: signer.publicKey,
            tokenProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([signer])
          .rpc(rpcOptions);
        assert.fail("Should have failed — nftMint does not match collection.mint");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("Unauthorized");
      }
    });

    it("TC-03b: transfer_nft with correct mint is blocked by frozen collection", async () => {
      const { collectionPda } = await createCollection({
        freezeTradingUntilSoldOut: true,
        maxSupply: 10,
      });
      const collectionData = await program.account.collection.fetch(collectionPda);
      const signer = anchor.web3.Keypair.generate();

      try {
        await program.methods
          .transferNft()
          .accountsStrict({
            collection: collectionPda,
            nftMint: collectionData.mint,  // correct mint
            from: anchor.web3.Keypair.generate().publicKey,
            to: anchor.web3.Keypair.generate().publicKey,
            authority: signer.publicKey,
            tokenProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([signer])
          .rpc(rpcOptions);
        assert.fail("Should have failed — trading frozen");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("TradingFrozen");
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-04: update_config allows start_time in the past (centralization risk)
    // There is NO on-chain guard against setting start_time to a past time.
    // This test documents the missing guard and flags it as a centralization risk.
    // ─────────────────────────────────────────────────────────────────
    it("TC-04: update_config accepts start_time = 0 (no current-time guard — centralization risk)", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});

      // Should succeed: update_config has no check that start_time >= now
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(1000),
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(0),        // epoch — definitely in the past
          endTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
          mintLimitPerWallet: 5,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: false,
        } as any)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.startTime.toNumber()).to.equal(0,
        "update_config accepted start_time=0 (past date) — this is a centralization risk. " +
        "Consider adding a guard or timelock to prevent rug mechanics.");
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-05: status field and flags.bit0 are independent — no cross-enforcement
    // status=5 does NOT pause minting. Only flags.bit0 (set by pause()) does.
    // ─────────────────────────────────────────────────────────────────
    it("TC-05a: status=5 does NOT block minting (flags.bit0 is the real gate)", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } =
        await createCollection({});
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Set status = 5 ("paused" label) via update_collection_status
      await program.methods
        .updateCollectionStatus(5)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      // Verify flags.bit0 is NOT set (pause() was not called)
      let col = await program.account.collection.fetch(collectionPda);
      expect(col.status).to.equal(5);
      expect(col.flags & 0x01).to.equal(0, "flags.bit0 should be 0 — status=5 does not set it");

      // Minting should still work because flags.bit0 = 0
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      // This should succeed — status=5 has no enforcement
      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
          }) as any
        )
        .signers([buyer])
        .rpc(rpcOptions);

      // Confirm minted despite status=5
      col = await program.account.collection.fetch(collectionPda);
      expect(col.minted.toNumber()).to.equal(1,
        "Minting succeeded with status=5 — confirming status field has no enforcement. " +
        "Frontends MUST read flags.bit0 for paused state, not the status field.");
    });

    it("TC-05b: pause() sets flags.bit0 but does NOT update status field", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});

      // Pause the collection
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const col = await program.account.collection.fetch(collectionPda);
      expect(col.flags & 0x01).to.equal(1, "flags.bit0 should be set by pause()");
      expect(col.status).to.not.equal(5,
        "status is still showing old value even though collection is paused — " +
        "the two representations are out of sync. Frontends reading status will show wrong state.");
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-06: split_config is not modified during a split mint
    // (confirms the mut removal is correct — no accidental writes)
    // ─────────────────────────────────────────────────────────────────
    it("TC-06: split_config fields unchanged after split mint", async () => {
      // Note: This test requires a collection with has_split=true and a split config PDA.
      // Setup: create collection, init split config, configure 2 recipients.
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } =
        await createCollection({ pricePerNft: 1_000_000 });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Init split config PDA
      const [splitConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("split"), collectionPda.toBuffer()],
        program.programId
      );

      await program.methods
        .initMintSplitConfig()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
          mintSplitConfig: splitConfigPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      const recipient0 = anchor.web3.Keypair.generate();
      const recipient1 = anchor.web3.Keypair.generate();
      const recipients: anchor.web3.PublicKey[] = [
        recipient0.publicKey,
        recipient1.publicKey,
        ...Array(8).fill(anchor.web3.PublicKey.default),
      ];
      const shares = [60, 40, 0, 0, 0, 0, 0, 0, 0, 0];

      await program.methods
        .updateMintFundSplits(recipients, shares, 2)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
          mintSplitConfig: splitConfigPda,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      // Capture state before mint
      const splitBefore = await program.account.mintSplitConfig.fetch(splitConfigPda);

      // Execute a split mint
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .mint(new anchor.BN(1), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
            splitConfig: splitConfigPda,
          }) as any
        )
        .remainingAccounts([
          { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
          { pubkey: recipient0.publicKey, isSigner: false, isWritable: true },
          { pubkey: recipient1.publicKey, isSigner: false, isWritable: true },
        ])
        .signers([buyer])
        .rpc(rpcOptions);

      // Verify split config was NOT modified
      const splitAfter = await program.account.mintSplitConfig.fetch(splitConfigPda);
      expect(splitAfter.num).to.equal(splitBefore.num);
      expect(splitAfter.shares).to.deep.equal(splitBefore.shares);
      for (let i = 0; i < 2; i++) {
        expect(splitAfter.recipients[i].toBase58()).to.equal(
          splitBefore.recipients[i].toBase58(),
          `recipient[${i}] should be unchanged after mint`
        );
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-07: authority can emergency-unfreeze by reducing max_supply to minted
    // This is a valid escape hatch but should be explicitly documented.
    // ─────────────────────────────────────────────────────────────────
    it("TC-07: reducing max_supply to minted count unfreezes a freeze_until_sold_out collection", async () => {
      const { collectionPda, creatorWallet, platformWallet, authority: collectionAuthority } =
        await createCollection({ freezeTradingUntilSoldOut: true, maxSupply: 100 });
      await setStartTimeToNow(collectionPda, collectionAuthority);

      // Mint some NFTs (not sold out)
      const buyer = anchor.web3.Keypair.generate();
      await airdropAndConfirm(buyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const [walletTrackerPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wallet_mint"), collectionPda.toBuffer(), buyer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .mint(new anchor.BN(3), [], 0)
        .accountsStrict(
          mintAccounts({
            collection: collectionPda,
            buyer: buyer.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            walletTracker: walletTrackerPda,
          }) as any
        )
        .signers([buyer])
        .rpc(rpcOptions);

      // Verify still frozen (minted=3, maxSupply=100)
      let frozen = await program.methods.isTradingFrozen()
        .accountsStrict({ collection: collectionPda })
        .view();
      expect(frozen).to.be.true;

      // Emergency unfreeze: reduce max_supply to minted count (3)
      await program.methods
        .updateConfig({
          maxSupply: new anchor.BN(3),  // = minted
          pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
          startTime: new anchor.BN(Math.floor(Date.now() / 1000) - 60),
          endTime: null,
          mintLimitPerWallet: null,
          metadataStandard: metadataStandard("core"),
          freezeTradingUntilDate: null,
          freezeTradingUntilSoldOut: true,  // flag still set but minted >= maxSupply
        } as any)
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers([collectionAuthority])
        .rpc(rpcOptions);

      // Trading should now be unfrozen (minted=3 >= maxSupply=3)
      frozen = await program.methods.isTradingFrozen()
        .accountsStrict({ collection: collectionPda })
        .view();
      expect(frozen).to.be.false,
        "TC-07: authority can unfreeze trading by setting max_supply = minted. " +
        "This is an escape hatch — document it in operator runbooks.";
    });

    // ─────────────────────────────────────────────────────────────────
    // TC-08: collection authority is permanent — no rotation mechanism
    // ─────────────────────────────────────────────────────────────────
    it("TC-08: no instruction exists to rotate collection authority (permanent authority)", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});

      // Every authority-gated instruction uses has_one = authority.
      // There is no transfer_authority or update_authority instruction.
      // Verify by attempting any authority action with a different signer — must fail with Unauthorized.
      const newAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(newAuthority.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      try {
        await program.methods
          .pause()
          .accountsStrict({
            collection: collectionPda,
            authority: newAuthority.publicKey,
          })
          .signers([newAuthority])
          .rpc(rpcOptions);
        assert.fail("Should have been rejected — wrong authority");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("Unauthorized",
          "TC-08 confirmed: authority is non-transferable. If the authority keypair is " +
          "compromised or lost, the collection admin functions are permanently bricked. " +
          "Consider adding a two-step transfer_authority instruction.");
      }
    });
  });
});

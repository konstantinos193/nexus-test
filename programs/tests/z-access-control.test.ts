import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  authority,
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

  describe("Access Control", () => {
    let collectionPda: anchor.web3.PublicKey;
    let collectionAuthority: anchor.web3.Keypair;

    beforeEach(async () => {
      const result = await createCollection({});
      collectionPda = result.collectionPda;
      collectionAuthority = result.authority;
    });

    it("Only authority can pause", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .pause()
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

    it("Only authority can resume", async () => {
      // Pause first using the correct authority
      await program.methods
        .pause()
        .accountsStrict({
          collection: collectionPda,
          authority: collectionAuthority.publicKey,
        })
        .signers(collectionAuthority === authority ? [] : [collectionAuthority])
        .rpc(rpcOptions);

      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .resume()
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

    it("Only authority can update config", async () => {
      const unauthorized = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorized.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      try {
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
  });
});

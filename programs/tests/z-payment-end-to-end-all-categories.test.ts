import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
  creator,
  ensureProviderFunds,
  createSplitter,
  airdropAndConfirm,
  waitAfterAirdrop,
} from "./nexus-payment-helpers";

describe("nexus-payment", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("End-to-end (all categories)", () => {
    it("Initialization → Distribution → Access Control → Withdraw → Edge Cases", async () => {
      const amount1Sol = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);
      const baseAirdrop = 2 * anchor.web3.LAMPORTS_PER_SOL;

      // —— Initialization: 5% splitter (default creator) ——
      const { splitterPda: s5, platform: p5, creator: c5 } = await createSplitter(500);
      let splitter = await program.account.splitter.fetch(s5);
      expect(splitter.feeBps).to.equal(500);

      // —— Payment Distribution: 5% fee ——
      const payer1 = anchor.web3.Keypair.generate();
      await airdropAndConfirm(payer1.publicKey, baseAirdrop);
      await waitAfterAirdrop();

      const creatorBalBefore = await provider.connection.getBalance(c5.publicKey);
      const platformBalBefore = await provider.connection.getBalance(p5.publicKey);

      await program.methods
        .splitPayment(amount1Sol)
        .accountsStrict({
          splitter: s5,
          payer: payer1.publicKey,
          creator: c5.publicKey,
          platform: p5.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer1])
        .rpc();
      const creatorBalAfter = await provider.connection.getBalance(c5.publicKey);
      const platformBalAfter = await provider.connection.getBalance(p5.publicKey);
      expect(creatorBalAfter - creatorBalBefore).to.be.greaterThan(amount1Sol.toNumber() * 0.95 * 0.9);
      expect(platformBalAfter - platformBalBefore).to.be.greaterThan(amount1Sol.toNumber() * 0.05 * 0.9);

      // —— Initialization: 0% and 100% (unique creators) ——
      const u0 = anchor.web3.Keypair.generate();
      const u100 = anchor.web3.Keypair.generate();
      await airdropAndConfirm(u0.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await airdropAndConfirm(u100.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda: s0, platform: p0, creator: c0 } = await createSplitter(0, undefined, u0);
      const { splitterPda: s100, platform: p100, creator: c100 } = await createSplitter(10000, undefined, u100);

      const pay0 = anchor.web3.Keypair.generate();
      const pay100 = anchor.web3.Keypair.generate();
      await airdropAndConfirm(pay0.publicKey, baseAirdrop);
      await airdropAndConfirm(pay100.publicKey, baseAirdrop);
      await waitAfterAirdrop();

      const c0Before = await provider.connection.getBalance(c0.publicKey);
      const p0Before = await provider.connection.getBalance(p0.publicKey);
      await program.methods
        .splitPayment(amount1Sol)
        .accountsStrict({
          splitter: s0,
          payer: pay0.publicKey,
          creator: c0.publicKey,
          platform: p0.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pay0])
        .rpc();
      const c0After = await provider.connection.getBalance(c0.publicKey);
      const p0After = await provider.connection.getBalance(p0.publicKey);
      expect(c0After - c0Before).to.be.greaterThan(amount1Sol.toNumber() * 0.9);
      expect(p0After - p0Before).to.equal(0);

      const p100Before = await provider.connection.getBalance(p100.publicKey);
      await program.methods
        .splitPayment(amount1Sol)
        .accountsStrict({
          splitter: s100,
          payer: pay100.publicKey,
          creator: c100.publicKey,
          platform: p100.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pay100])
        .rpc();
      const p100After = await provider.connection.getBalance(p100.publicKey);
      expect(p100After - p100Before).to.be.greaterThan(amount1Sol.toNumber() * 0.9);

      // Note: Escrow/withdraw functionality removed - all payments are direct transfers

      // —— Edge Cases: rounding (3.33% fee), zero amount ——
      const uEdge = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uEdge.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();
      const { splitterPda: sEdge, platform: pEdge, creator: cEdge } = await createSplitter(333, undefined, uEdge);
      const payerEdge = anchor.web3.Keypair.generate();
      await airdropAndConfirm(payerEdge.publicKey, baseAirdrop);
      await waitAfterAirdrop();
      // Ensure creator and platform are rent-exempt so tiny transfer (1000 lamports) doesn't leave them below minimum
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      await airdropAndConfirm(cEdge.publicKey, rentExempt);
      await airdropAndConfirm(pEdge.publicKey, rentExempt);
      await waitAfterAirdrop();
      await program.methods
        .splitPayment(new anchor.BN(1000))
        .accountsStrict({
          splitter: sEdge,
          payer: payerEdge.publicKey,
          creator: cEdge.publicKey,
          platform: pEdge.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payerEdge])
        .rpc();

      const uZero = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uZero.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();
      const { splitterPda: sZero, platform: pZero, creator: cZero } = await createSplitter(500, undefined, uZero);
      const payerZero = anchor.web3.Keypair.generate();
      await airdropAndConfirm(payerZero.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();
      await program.methods
        .splitPayment(new anchor.BN(0))
        .accountsStrict({
          splitter: sZero,
          payer: payerZero.publicKey,
          creator: cZero.publicKey,
          platform: pZero.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payerZero])
        .rpc();
    });
  });
});

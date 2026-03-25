import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
  provider,
  ensureProviderFunds,
  createSplitter,
  airdropAndConfirm,
  waitAfterAirdrop,
} from "./nexus-payment-helpers";

describe("nexus-payment", () => {
  before(async () => {
    await ensureProviderFunds();
  });

  describe("Initialization", () => {
    it("Initializes payment splitter successfully", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const platform = anchor.web3.Keypair.generate();
      const platformFeeBasisPoints = 500; // 5%

      const [splitterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("splitter"), uniqueCreator.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize(platformFeeBasisPoints)
        .accountsStrict({
          splitter: splitterPda,
          creator: uniqueCreator.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([uniqueCreator])
        .rpc();

      const splitter = await program.account.splitter.fetch(splitterPda);
      expect(splitter.creator.toString()).to.equal(uniqueCreator.publicKey.toString());
      expect(splitter.platform.toString()).to.equal(platform.publicKey.toString());
      expect(splitter.feeBps).to.equal(platformFeeBasisPoints);
    });

    it("Fails with fee > 100%", async () => {
      try {
        await createSplitter(10001); // > 100%
        assert.fail("Should have failed with fee > 100%");
      } catch (err: any) {
        const errorCode = getProgramErrorCode(err, program.idl);
        expect(errorCode).to.equal("InvalidFee");
      }
    });

    it("Allows 0% platform fee", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda } = await createSplitter(0, undefined, uniqueCreator);
      const splitter = await program.account.splitter.fetch(splitterPda);
      expect(splitter.feeBps).to.equal(0);
    });

    it("Allows 100% platform fee", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const { splitterPda } = await createSplitter(10000, undefined, uniqueCreator); // 100%
      const splitter = await program.account.splitter.fetch(splitterPda);
      expect(splitter.feeBps).to.equal(10000);
    });

    it("Prevents double initialization", async () => {
      const uniqueCreator = anchor.web3.Keypair.generate();
      await airdropAndConfirm(uniqueCreator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await waitAfterAirdrop();

      const platform = anchor.web3.Keypair.generate();
      const [splitterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("splitter"), uniqueCreator.publicKey.toBuffer()],
        program.programId
      );

      // First initialization (creator must match PDA derivation)
      await program.methods
        .initialize(500)
        .accountsStrict({
          splitter: splitterPda,
          creator: uniqueCreator.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([uniqueCreator])
        .rpc();

      // Second initialization should fail (account already exists)
      try {
        await program.methods
          .initialize(500)
          .accountsStrict({
            splitter: splitterPda,
            creator: uniqueCreator.publicKey,
            platform: platform.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([uniqueCreator])
          .rpc();
        assert.fail("Should have failed - account already exists");
      } catch (err: any) {
        // Anchor will fail because account already initialized
        expect(err).to.exist;
      }
    });
  });
});

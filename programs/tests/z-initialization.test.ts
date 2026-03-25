import * as anchor from "@coral-xyz/anchor";
import { expect, assert } from "chai";
import { getProgramErrorCode } from "../utils/anchor-buffer-patch";
import {
  program,
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

  describe("Initialization", () => {
    it("Initializes a collection successfully", async () => {
      const { collectionPda, authority: collectionAuthority } = await createCollection({});

      const collection = await program.account.collection.fetch(collectionPda);
      // Check against the actual authority used (may be provider wallet or generated if conflict)
      expect(collection.authority.toString()).to.equal(collectionAuthority.publicKey.toString());
      expect(collection.maxSupply.toNumber()).to.equal(1000);
      expect(collection.minted.toNumber()).to.equal(0);
      expect(isPaused(collection.flags)).to.be.false;
    });

    it("Fails to initialize with zero supply", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      try {
        const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
          program.programId
        );
        const creatorWallet = anchor.web3.Keypair.generate();
        const mintAuthority = anchor.web3.Keypair.generate();
        const platformWallet = anchor.web3.Keypair.generate();
        const now = Math.floor(Date.now() / 1000);
        // Add 60 second buffer to account for transaction processing time
        const startTime = now + 60;
        
        await program.methods
          .initializeCollection(
            {
              maxSupply: new anchor.BN(0),
              pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
              startTime: new anchor.BN(startTime),
              endTime: new anchor.BN(now + 86400),
              mintLimitPerWallet: 5,
              metadataStandard: metadataStandard("core"),
              freezeTradingUntilDate: null,
              freezeTradingUntilSoldOut: false,
            } as any,
            500
          )
          .accountsStrict({
            collection: collectionPda,
            authority: testAuthority.publicKey,
            mintAuthority: mintAuthority.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testAuthority])
          .rpc(rpcOptions);
        assert.fail("Should have failed with zero supply");
      } catch (err: any) {
        // Use comprehensive error extraction helper
        const errorCode = getProgramErrorCode(err, program.idl);
        if (!errorCode) {
          // Debug: log the error structure if extraction fails
          console.error("Error extraction failed. Error structure:", JSON.stringify(err, null, 2));
          console.error("Error message:", err?.message);
          console.error("Error logs:", err?.logs);
        }
        expect(errorCode).to.equal("InvalidSupply");
      }
    });

    it("Fails to initialize with past start time", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const pastTime = Math.floor(Date.now() / 1000) - 86400; // 24 hours ago
      try {
        const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
          program.programId
        );
        const creatorWallet = anchor.web3.Keypair.generate();
        const mintAuthority = anchor.web3.Keypair.generate();
        const platformWallet = anchor.web3.Keypair.generate();
        
        await program.methods
          .initializeCollection(
            {
              maxSupply: new anchor.BN(1000),
              pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
              startTime: new anchor.BN(pastTime),
              endTime: new anchor.BN(pastTime + 86400),
              mintLimitPerWallet: 5,
              metadataStandard: metadataStandard("core"),
              freezeTradingUntilDate: null,
              freezeTradingUntilSoldOut: false,
            } as any,
            500
          )
          .accountsStrict({
            collection: collectionPda,
            authority: testAuthority.publicKey,
            mintAuthority: mintAuthority.publicKey,
            creatorWallet: creatorWallet.publicKey,
            platformWallet: platformWallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testAuthority])
          .rpc(rpcOptions);
        assert.fail("Should have failed with past start time");
      } catch (err: any) {
        // Use comprehensive error extraction helper
        const errorCode = getProgramErrorCode(err, program.idl);
        if (!errorCode) {
          // Debug: log the error structure if extraction fails
          console.error("Error extraction failed. Error structure:", JSON.stringify(err, null, 2));
          console.error("Error message:", err?.message);
          console.error("Error logs:", err?.logs);
        }
        expect(errorCode).to.equal("InvalidStartTime");
      }
    });

    it("Initializes with no end time", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: null,
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("core"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(isDisabledI64(collection.endTime)).to.be.true;
    });

    it("Initializes with no mint limit", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: null,
            metadataStandard: metadataStandard("core"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(isDisabledU8(collection.mintLimitPerWallet)).to.be.true;
    });

    it("Initializes with MetadataStandard Legacy", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("legacy"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(0); // Legacy = 0
    });

    it("Initializes with MetadataStandard Cnft", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("cnft"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(3); // Compressed = 3
    });

    it("Initializes with MetadataStandard Programmable", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("programmable"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(1); // Programmable = 1
    });

    it("Initializes with MetadataStandard Core", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("core"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(2); // Core = 2
    });

    it("Initializes with MetadataStandard SemiFungible", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("semifungible"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(4); // SemiFungible = 4
    });

    it("Initializes with MetadataStandard Token2022", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("token2022"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(5); // Token2022 = 5
    });

    it("Initializes with MetadataStandard NativeMetadata", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("nativemetadata"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(6); // NativeMetadata = 6
    });

    it("Initializes with MetadataStandard Custom", async () => {
      // Use unique authority to avoid PDA conflicts
      const testAuthority = anchor.web3.Keypair.generate();
      await airdropAndConfirm(testAuthority.publicKey);
      
      const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), testAuthority.publicKey.toBuffer()],
        program.programId
      );
      const creatorWallet = anchor.web3.Keypair.generate();
      const mintAuthority = anchor.web3.Keypair.generate();
      const platformWallet = anchor.web3.Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      // Add 60 second buffer to account for transaction processing time
      const startTime = now + 60;
      
      await program.methods
        .initializeCollection(
          {
            maxSupply: new anchor.BN(1000),
            pricePerNft: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1),
            startTime: new anchor.BN(startTime),
            endTime: new anchor.BN(now + 86400),
            mintLimitPerWallet: 5,
            metadataStandard: metadataStandard("custom"),
            freezeTradingUntilDate: null,
            freezeTradingUntilSoldOut: false,
          } as any,
          500
        )
        .accountsStrict({
          collection: collectionPda,
          authority: testAuthority.publicKey,
          mintAuthority: mintAuthority.publicKey,
          creatorWallet: creatorWallet.publicKey,
          platformWallet: platformWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc(rpcOptions);
        
      const collection = await program.account.collection.fetch(collectionPda);
      expect(collection.metadataStandard).to.equal(7); // Custom = 7
    });
  });
});

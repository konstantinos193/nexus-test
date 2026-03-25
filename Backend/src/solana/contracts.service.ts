/**
 * Smart Contracts Service
 * Provides utilities for interacting with deployed NeXus smart contracts
 */

import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { SolanaService } from './solana.service';
import { getCurrentNetwork } from './solana.config';
import { PROGRAM_IDS, PDA_SEEDS } from './constants';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private solana: SolanaService) {}

  /**
   * Get minting program ID (nexus_launchpad)
   */
  getMintingProgramId(): PublicKey {
    return new PublicKey(PROGRAM_IDS.MINTING_PROGRAM);
  }

  /**
   * Get payment program ID (nexus_payment)
   */
  getPaymentProgramId(): PublicKey {
    return new PublicKey(PROGRAM_IDS.PAYMENT_PROGRAM);
  }

  /**
   * Get collection program ID (nexus_collection)
   */
  getCollectionProgramId(): PublicKey {
    return new PublicKey(PROGRAM_IDS.COLLECTION_PROGRAM);
  }

  /**
   * Find collection PDA
   */
  async findCollectionPDA(authority: string): Promise<PublicKey | null> {
    const programId = this.getCollectionProgramId();

    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PDA_SEEDS.COLLECTION), new PublicKey(authority).toBuffer()],
        programId
      );
      return pda;
    } catch (error) {
      this.logger.error('Error finding collection PDA:', error);
      return null;
    }
  }

  /**
   * Find payment splitter PDA
   */
  async findPaymentSplitterPDA(creator: string): Promise<PublicKey | null> {
    const programId = this.getPaymentProgramId();

    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PDA_SEEDS.SPLITTER), new PublicKey(creator).toBuffer()],
        programId
      );
      return pda;
    } catch (error) {
      this.logger.error('Error finding payment splitter PDA:', error);
      return null;
    }
  }

  /**
   * Get collection account data
   */
  async getCollectionData(collectionPDA: string) {
    const connection = this.solana.getConnection();
    const pubkey = new PublicKey(collectionPDA);

    try {
      const accountInfo = await connection.getAccountInfo(pubkey);
      if (!accountInfo) {
        return null;
      }

      // TODO: Deserialize account data using Anchor IDL
      // This requires the Anchor IDL to be loaded
      return {
        address: collectionPDA,
        exists: true,
        data: accountInfo.data,
      };
    } catch (error) {
      this.logger.error('Error fetching collection data:', error);
      return null;
    }
  }

  /**
   * Verify contract deployment
   */
  async verifyContractDeployment(programName: 'minting' | 'payment' | 'collection'): Promise<boolean> {
    let programId: PublicKey;

    switch (programName) {
      case 'minting':
        programId = this.getMintingProgramId();
        break;
      case 'payment':
        programId = this.getPaymentProgramId();
        break;
      case 'collection':
        programId = this.getCollectionProgramId();
        break;
      default:
        return false;
    }

    try {
      const connection = this.solana.getConnection();
      const accountInfo = await connection.getAccountInfo(programId);
      return accountInfo !== null && accountInfo.executable;
    } catch (error) {
      this.logger.error(`Error verifying ${programName} contract:`, error);
      return false;
    }
  }

  /**
   * Get all contract deployment statuses
   */
  async getContractStatuses() {
    const network = getCurrentNetwork();

    return {
      network,
      contracts: {
        minting: {
          programId: this.getMintingProgramId().toString(),
          deployed: await this.verifyContractDeployment('minting'),
        },
        payment: {
          programId: this.getPaymentProgramId().toString(),
          deployed: await this.verifyContractDeployment('payment'),
        },
        collection: {
          programId: this.getCollectionProgramId().toString(),
          deployed: await this.verifyContractDeployment('collection'),
        },
      },
    };
  }
}

/**
 * Smart Contracts Service
 * Provides utilities for interacting with deployed NeXus smart contracts
 */

import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { SolanaService } from './solana.service';
import { getCurrentNetwork } from './solana.config';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private solana: SolanaService) {}

  /**
   * Get program ID from environment
   */
  getProgramId(programName: 'minting' | 'payment' | 'collection'): PublicKey | null {
    const envKey = `${programName.toUpperCase()}_PROGRAM_ID`;
    const programId = process.env[envKey];

    if (!programId) {
      this.logger.warn(`${envKey} not configured`);
      return null;
    }

    try {
      return new PublicKey(programId);
    } catch (error) {
      this.logger.error(`Invalid program ID for ${programName}:`, error);
      return null;
    }
  }

  /**
   * Get minting program ID
   */
  getMintingProgramId(): PublicKey | null {
    return this.getProgramId('minting');
  }

  /**
   * Get payment program ID
   */
  getPaymentProgramId(): PublicKey | null {
    return this.getProgramId('payment');
  }

  /**
   * Get collection program ID
   */
  getCollectionProgramId(): PublicKey | null {
    return this.getProgramId('collection');
  }

  /**
   * Find collection PDA
   */
  async findCollectionPDA(authority: string): Promise<PublicKey | null> {
    const programId = this.getMintingProgramId();
    if (!programId) return null;

    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection'), new PublicKey(authority).toBuffer()],
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
    if (!programId) return null;

    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('splitter'), new PublicKey(creator).toBuffer()],
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
    const programId = this.getProgramId(programName);
    if (!programId) return false;

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
          programId: this.getMintingProgramId()?.toString() || 'Not configured',
          deployed: await this.verifyContractDeployment('minting'),
        },
        payment: {
          programId: this.getPaymentProgramId()?.toString() || 'Not configured',
          deployed: await this.verifyContractDeployment('payment'),
        },
        collection: {
          programId: this.getCollectionProgramId()?.toString() || 'Not configured',
          deployed: await this.verifyContractDeployment('collection'),
        },
      },
    };
  }
}

/**
 * Solana Service
 * Provides Solana blockchain interaction functionality
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import { createSolanaConnection, getSolanaConfig, isDevnet } from './solana.config';

@Injectable()
export class SolanaService implements OnModuleInit {
  private readonly logger = new Logger(SolanaService.name);
  private connection: Connection;
  private config = getSolanaConfig();

  onModuleInit() {
    this.connection = createSolanaConnection();
    this.logger.log(`Solana service initialized on ${this.config.network}`);
    this.logger.log(`RPC URL: ${this.config.rpcUrl}`);
  }

  /**
   * Get the Solana connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get current network configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Check if address is valid
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get account balance in SOL
   */
  async getAccountBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      this.logger.error(`Error getting balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get recent blockhash
   */
  async getRecentBlockhash(commitment?: Commitment) {
    try {
      return await this.connection.getLatestBlockhash(
        commitment || this.config.commitment
      );
    } catch (error) {
      this.logger.error('Error getting recent blockhash:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string) {
    try {
      return await this.connection.getSignatureStatus(signature);
    } catch (error) {
      this.logger.error(`Error getting transaction status for ${signature}:`, error);
      throw error;
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo() {
    try {
      const version = await this.connection.getVersion();
      const slot = await this.connection.getSlot();
      const blockHeight = await this.connection.getBlockHeight();
      
      return {
        network: this.config.network,
        rpcUrl: this.config.rpcUrl,
        version: version['solana-core'],
        slot,
        blockHeight,
        isDevnet: isDevnet(),
      };
    } catch (error) {
      this.logger.error('Error fetching network info:', error);
      throw error;
    }
  }

  /**
   * Verify transaction signature
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const status = await this.getTransactionStatus(signature);
      return status?.value?.err === null;
    } catch {
      return false;
    }
  }
}

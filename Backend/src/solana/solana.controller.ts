/**
 * Solana Controller
 * Provides API endpoints for Solana network information and utilities
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SolanaService } from './solana.service';
import { ContractsService } from './contracts.service';

@ApiTags('solana')
@Controller('api/solana')
export class SolanaController {
  constructor(
    private readonly solanaService: SolanaService,
    private readonly contractsService: ContractsService,
  ) {}

  @Get('network')
  @ApiOperation({ summary: 'Get Solana network information' })
  async getNetworkInfo() {
    return {
      success: true,
      data: await this.solanaService.getNetworkInfo(),
    };
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiParam({ name: 'address', description: 'Solana wallet address' })
  async getBalance(@Param('address') address: string) {
    if (!this.solanaService.isValidAddress(address)) {
      return {
        success: false,
        error: 'Invalid Solana address',
      };
    }

    try {
      const balance = await this.solanaService.getAccountBalance(address);
      return {
        success: true,
        data: {
          address,
          balance,
          balanceLamports: balance * 1e9,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get balance',
      };
    }
  }

  @Get('verify-transaction/:signature')
  @ApiOperation({ summary: 'Verify transaction signature' })
  @ApiParam({ name: 'signature', description: 'Transaction signature' })
  async verifyTransaction(@Param('signature') signature: string) {
    try {
      const isValid = await this.solanaService.verifyTransaction(signature);
      return {
        success: true,
        data: {
          signature,
          verified: isValid,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to verify transaction',
      };
    }
  }

  @Get('validate-address/:address')
  @ApiOperation({ summary: 'Validate Solana address' })
  @ApiParam({ name: 'address', description: 'Address to validate' })
  async validateAddress(@Param('address') address: string) {
    const isValid = this.solanaService.isValidAddress(address);
    return {
      success: true,
      data: {
        address,
        valid: isValid,
      },
    };
  }

  @Get('contracts/status')
  @ApiOperation({ summary: 'Get smart contract deployment status' })
  async getContractStatus() {
    return {
      success: true,
      data: await this.contractsService.getContractStatuses(),
    };
  }
}

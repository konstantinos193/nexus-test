/**
 * IPFS Controller
 * 
 * REST API endpoints for IPFS operations
 * 
 * Security Model:
 * - POST endpoints (upload, pin, unpin) are SECURED with API key authentication
 *   Only your platform can upload content to IPFS
 * 
 * - GET endpoints (retrieve, metadata, view, check, info, health) are PUBLIC
 *   Public marketplaces and anyone can access IPFS content using:
 *   1. Direct IPFS gateway URLs: https://ipfs.io/ipfs/{hash}
 *   2. Your backend GET endpoints: GET /api/ipfs/metadata/{hash}
 * 
 * Once content is uploaded to IPFS, it's publicly accessible via the hash.
 * The security only prevents unauthorized uploads, not access to existing content.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpException,
  HttpStatus,
  Logger,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { IpfsService } from './ipfs.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import {
  UploadMetadataDto,
  IpfsUploadResponseDto,
  IpfsPinResponseDto,
} from './dto/ipfs.dto';

@ApiTags('IPFS')
@Controller('api/ipfs')
export class IpfsController {
  private readonly logger = new Logger(IpfsController.name);

  constructor(private readonly ipfsService: IpfsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check IPFS service health' })
  @ApiResponse({ status: 200, description: 'IPFS service is ready' })
  @ApiResponse({ status: 503, description: 'IPFS service is not available' })
  async health() {
    const isReady = this.ipfsService.isReady();
    if (!isReady) {
      throw new HttpException(
        'IPFS service is not initialized. Check your IPFS node is running.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const nodeInfo = await this.ipfsService.getNodeInfo();
      return {
        success: true,
        data: {
          ready: true,
          nodeId: nodeInfo.id,
          agentVersion: nodeInfo.agentVersion,
        },
      };
    } catch (error) {
      throw new HttpException(
        `IPFS service error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('upload/metadata')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload JSON metadata to IPFS' })
  @ApiResponse({
    status: 201,
    description: 'Metadata uploaded successfully',
    type: IpfsUploadResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required',
  })
  async uploadMetadata(@Body() dto: UploadMetadataDto) {
    try {
      const result = await this.ipfsService.uploadMetadata(
        dto.metadata,
        dto.pin,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to upload metadata: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload metadata: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload/file')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload a file to IPFS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        pin: {
          type: 'boolean',
          default: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: IpfsUploadResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('pin') pin?: string,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      const shouldPin = pin === 'true' || pin === undefined;
      const result = await this.ipfsService.uploadFile(file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        pin: shouldPin,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload/files')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(FilesInterceptor('files', 500))
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload multiple files to IPFS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        pin: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized: API key required' })
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('pin') pin?: string,
  ) {
    if (!files?.length) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }

    const shouldPin = pin === 'true' || pin === undefined;
    const results: { filename: string; hash: string; path: string; gatewayUrl: string; size: number; pinned: boolean; error?: string }[] = [];

    for (const file of files) {
      try {
        const result = await this.ipfsService.uploadFile(file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
          pin: shouldPin,
        });
        results.push({
          filename: file.originalname,
          hash: result.hash,
          path: result.path,
          gatewayUrl: result.gatewayUrl,
          size: result.size,
          pinned: result.pinned,
        });
      } catch (error) {
        this.logger.warn(`Failed to upload ${file.originalname}: ${error.message}`);
        results.push({
          filename: file.originalname,
          hash: '',
          path: '',
          gatewayUrl: '',
          size: 0,
          pinned: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      data: { results },
    };
  }

  @Post('upload/directory')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload multiple files as one IPFS directory (for base_uri)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      description: 'Form field names = path (e.g. 0.json, 1.png). Each field = one file.',
      additionalProperties: { type: 'string', format: 'binary' },
    },
  })
  @ApiResponse({ status: 201, description: 'Directory uploaded; returns base_uri for contract' })
  @ApiResponse({ status: 401, description: 'Unauthorized: API key required' })
  async uploadDirectory(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('pin') pin?: string,
  ) {
    if (!files?.length) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }
    const shouldPin = pin === 'true' || pin === undefined;
    const entries = files.map((file) => ({
      path: file.fieldname || file.originalname || 'file',
      content: file.buffer,
    }));
    try {
      const result = await this.ipfsService.uploadDirectory(entries, shouldPin);
      return {
        success: true,
        data: {
          hash: result.hash,
          baseUri: result.baseUri,
          gatewayUrl: result.gatewayUrl,
          pinned: result.pinned,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to upload directory: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload directory: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('pin/:hash')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Pin a file by its IPFS hash' })
  @ApiResponse({
    status: 200,
    description: 'File pinned successfully',
    type: IpfsPinResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required',
  })
  async pin(@Param('hash') hash: string) {
    try {
      const success = await this.ipfsService.pin(hash);
      return {
        success: true,
        data: {
          hash,
          success,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to pin file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to pin file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('unpin/:hash')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Unpin a file by its IPFS hash' })
  @ApiResponse({
    status: 200,
    description: 'File unpinned successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required',
  })
  async unpin(@Param('hash') hash: string) {
    try {
      const success = await this.ipfsService.unpin(hash);
      return {
        success: true,
        data: {
          hash,
          success,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to unpin file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to unpin file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pins')
  @ApiOperation({ summary: 'List all pinned files (CIDs) on the IPFS node' })
  @ApiResponse({
    status: 200,
    description: 'List of pinned CIDs with gateway URLs for browser viewing',
  })
  async listPins() {
    try {
      const pins = await this.ipfsService.listPins();
      const data = pins.map((p) => ({
        cid: p.cid,
        type: p.type,
        gatewayUrl: this.ipfsService.getGatewayUrl(p.cid),
      }));
      return {
        success: true,
        data: { pins: data },
      };
    } catch (error) {
      this.logger.error(`Failed to list pins: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to list pins: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('check/:hash')
  @ApiOperation({ summary: 'Check if a file is pinned' })
  @ApiResponse({
    status: 200,
    description: 'Pin status retrieved',
  })
  async checkPin(@Param('hash') hash: string) {
    try {
      const isPinned = await this.ipfsService.isPinned(hash);
      return {
        success: true,
        data: {
          hash,
          pinned: isPinned,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check pin status: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to check pin status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('retrieve/:hash')
  @ApiOperation({ summary: 'Retrieve file content from IPFS' })
  @ApiResponse({
    status: 200,
    description: 'File content retrieved',
  })
  async retrieve(@Param('hash') hash: string) {
    try {
      const content = await this.ipfsService.getFile(hash);
      return {
        success: true,
        data: {
          hash,
          content: content.toString('base64'),
          size: content.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metadata/:hash')
  @ApiOperation({ summary: 'Retrieve JSON metadata from IPFS' })
  @ApiResponse({
    status: 200,
    description: 'Metadata retrieved',
  })
  async getMetadata(@Param('hash') hash: string) {
    try {
      const metadata = await this.ipfsService.getMetadata(hash);
      return {
        success: true,
        data: {
          hash,
          metadata,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve metadata: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve metadata: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('view/:hash')
  @Redirect()
  @ApiOperation({ summary: 'Redirect to IPFS gateway URL for viewing in browser' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to IPFS gateway',
  })
  async viewInBrowser(@Param('hash') hash: string) {
    // This endpoint redirects to the IPFS gateway for easy browser viewing
    const gatewayUrl = this.ipfsService.getGatewayUrl(hash);
    return { url: gatewayUrl, statusCode: 302 };
  }

  @Get('info')
  @ApiOperation({ summary: 'Get IPFS node information' })
  @ApiResponse({
    status: 200,
    description: 'Node information retrieved',
  })
  async getNodeInfo() {
    try {
      const nodeInfo = await this.ipfsService.getNodeInfo();
      return {
        success: true,
        data: nodeInfo,
      };
    } catch (error) {
      this.logger.error(`Failed to get node info: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get node info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

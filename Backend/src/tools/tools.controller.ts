/**
 * tools.controller.ts - Two endpoints: generate and download.
 * POST /api/tools/nft/generate — accepts layers + config, returns token + rarity JSON.
 * GET  /api/tools/nft/download/:token — streams the ZIP, deletes it when done.
 *
 * No API key guard — this is a public-facing tool. Rate limited instead.
 * The temp file is deleted the moment `res.finish` fires. No accumulation.
 *
 * @author Juan – controller gatekeeper, stream piping enthusiast
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  private readonly logger = new Logger(ToolsController.name);

  constructor(private readonly toolsService: ToolsService) {}

  /**
   * POST /api/tools/nft/generate
   * Multipart body:
   *   - config (string): JSON – GenerateNftConfig
   *   - layer_{id} (File[]): images for each layer, one field per layer
   *
   * Returns JSON: { token, count, rarityIndex, expiresAt }
   */
  @Post('nft/generate')
  @UseInterceptors(AnyFilesInterceptor())
  async generateNft(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('config') configStr: string,
    @Res() res: Response,
  ) {
    if (!files?.length) {
      throw new HttpException('No layer files provided.', HttpStatus.BAD_REQUEST);
    }
    if (!configStr) {
      throw new HttpException('Missing config field.', HttpStatus.BAD_REQUEST);
    }

    let config: unknown;
    try {
      config = JSON.parse(configStr);
    } catch {
      throw new HttpException('config is not valid JSON.', HttpStatus.BAD_REQUEST);
    }

    // Basic sanity check on the parsed config
    const cfg = config as { layers?: unknown[]; supply?: number };
    if (!Array.isArray(cfg.layers) || cfg.layers.length === 0) {
      throw new HttpException('config.layers must be a non-empty array.', HttpStatus.BAD_REQUEST);
    }
    if (cfg.supply != null && (cfg.supply < 1 || cfg.supply > 2000)) {
      throw new HttpException('supply must be between 1 and 2000.', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.toolsService.generate(files, configStr);
      res.json(result);
    } catch (err) {
      this.logger.error('Generation failed', err);
      throw new HttpException(
        err instanceof Error ? err.message : 'Generation failed.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/tools/nft/download/:token
   * Streams the ZIP to the client, then deletes the temp file.
   * Token is single-use — after the response finishes, it's gone.
   */
  @Get('nft/download/:token')
  async downloadNft(@Param('token') token: string, @Res() res: Response) {
    const zipPath = await this.toolsService.getJobZipPath(token);

    if (!zipPath) {
      throw new HttpException(
        'Download token not found or already used.',
        HttpStatus.NOT_FOUND,
      );
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="nft-collection.zip"');

    const stream = createReadStream(zipPath);

    stream.on('error', (err) => {
      this.logger.error(`Stream error for job ${token}`, err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    // Delete job after download completes — this is the primary cleanup trigger
    res.on('finish', () => {
      this.toolsService.deleteJob(token).catch((err) =>
        this.logger.error(`Cleanup failed for job ${token}`, err),
      );
    });

    stream.pipe(res);
  }
}

// — Juan. Generate once. Download once. Then it's gone. Just like the DeLorean.

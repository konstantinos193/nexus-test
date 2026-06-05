/**
 * IPFS Controller
 *
 * REST API endpoints for hurling bytes into the decentralized ether and
 * occasionally retrieving them. Think of IPFS as the internet's attic —
 * once something is up there, it's permanent, peer-to-peer, and mildly
 * terrifying to think about. (Blockchain's attic. No take-backs.)
 *
 * Security Model (because anarchy is not a launch strategy):
 * - POST endpoints (upload, pin, unpin) are SECURED with API key authentication.
 *   Only your platform can upload content to IPFS. Not Carol from accounting.
 *   Not that one guy who "knows about crypto." Nobody but you.
 *
 * - GET endpoints (retrieve, metadata, view, check, info, health) are PUBLIC.
 *   Public marketplaces and anyone with a hash can access IPFS content via:
 *   1. Direct IPFS gateway URLs: https://ipfs.io/ipfs/{hash}  (the classic)
 *   2. Your backend GET endpoints: GET /api/ipfs/metadata/{hash}  (the fancy)
 *
 * Once content is uploaded to IPFS, it's publicly accessible via the hash.
 * There is no "undo". There is no "delete". There is only the void, staring back.
 * The security only prevents unauthorized uploads, not access to existing content.
 * Sleep well.
 */

// Multer types: because someone needs to know what a file looks like when it arrives.
/// <reference types="multer" />

// NestJS core toolkit — the survival kit for every controller that ever dared to exist.
import {
  Controller,   // Tells NestJS "this thing handles HTTP requests, not your existential crises"
  Post,         // For creating things, uploading things, pinning things to the void
  Get,          // For fetching things back from the void (results may vary)
  Body,         // Extracts the request body, where all the important stuff lives
  Param,        // URL params — the breadcrumbs we leave in route paths
  UseInterceptors, // Attaches interceptors; responses go through here like customs
  UploadedFile, // A single file, bravely traveling through HTTP
  UploadedFiles, // Many files, bravely traveling together through HTTP (safety in numbers)
  HttpException,  // For when things go wrong in a structured, dignified way
  HttpStatus,     // HTTP status codes — the universal language of disappointment and success
  HttpCode,       // Sets the response status code, because 200 isn't always right
  Logger,         // The diary nobody reads until something explodes
  Redirect,       // Sends the user elsewhere (the HTTP equivalent of "not my problem")
  UseGuards,      // Attaches the bouncer. No key, no entry. Final answer.
} from '@nestjs/common';

// File upload interceptors — because multipart/form-data is a beast and someone has to tame it.
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';

// Swagger decorators — the only documentation Juan will ever write willingly.
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiSecurity } from '@nestjs/swagger';

// The service that actually does the work while this controller takes all the credit.
import { IpfsService } from './ipfs.service';

// The guardian of the upload gate. The velvet rope between civilization and chaos.
import { ApiKeyGuard } from './guards/api-key.guard';

// DTOs: the formal paperwork that must be filed before anything gets uploaded to eternity.
import {
  UploadMetadataDto,       // Validated wrapper for JSON metadata destined for the blockchain attic
  IpfsUploadResponseDto,   // What comes back after a successful upload (hash, url, existential relief)
  IpfsPinResponseDto,      // What comes back after pinning (confirmation that the void is holding onto your data)
} from './dto/ipfs.dto';

/** Swagger tag: groups all IPFS endpoints under one roof in the API docs */
@ApiTags('IPFS')

/** Base route: all IPFS madness lives under /api/ipfs */
@Controller('api/ipfs')
export class IpfsController {
  /** The private diary. Only consulted when things go sideways. */
  private readonly logger = new Logger(IpfsController.name);

  /**
   * Dependency injection: NestJS hands us the IpfsService and we promise to use it responsibly.
   * (We will use it irresponsibly. But that's between us and the void.)
   */
  constructor(private readonly ipfsService: IpfsService) {}

  /**
   * GET /api/ipfs/health
   *
   * Is the IPFS node alive? Conscious? Spiritually present?
   * This endpoint answers that question with either comforting JSON or a 503 that
   * suggests you go find another hobby. (Like knitting. Knitting doesn't have uptime SLAs.)
   *
   * @returns Node info if alive; throws 503 if the void is unresponsive
   */
  @Get('health')
  @ApiOperation({ summary: 'Check IPFS service health' })
  @ApiResponse({ status: 200, description: 'IPFS service is ready and accepting your screams' })
  @ApiResponse({ status: 503, description: 'IPFS service is not available — go get coffee' })
  async health() {
    // First, check if the service even bothered to initialize. Sometimes it doesn't. Like a Monday.
    const isReady = this.ipfsService.isReady();
    if (!isReady) {
      throw new HttpException(
        'IPFS service is not initialized. Check your IPFS node is running.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      // Ask the node for its ID — basically the IPFS version of "are you there, God? It's me, NestJS."
      const nodeInfo = await this.ipfsService.getNodeInfo();
      return {
        success: true,
        data: {
          ready: true,
          nodeId: nodeInfo.id,              // The node's unique identity in the decentralized cosmos
          agentVersion: nodeInfo.agentVersion, // What version of Kubo is having an existential crisis today
        },
      };
    } catch (error) {
      // The node responded but in a language we don't understand. Classic IPFS behavior.
      throw new HttpException(
        `IPFS service error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * POST /api/ipfs/upload/metadata
   *
   * Serializes your precious JSON metadata object and hurls it into IPFS permanently.
   * NFT name, description, image pointer, traits — all of it preserved forever in the
   * decentralized attic, because the blockchain does not believe in the delete button.
   *
   * Protected by ApiKeyGuard. If you don't have the key, the void is not accepting visitors.
   *
   * @param dto - UploadMetadataDto carrying the metadata object and optional pin preference
   * @returns IPFS hash, gateway URL, size, and the pinned status of your eternal data
   */
  @Post('upload/metadata')
  @UseGuards(ApiKeyGuard)           // Bouncer engaged. No wristband, no entry.
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload JSON metadata to IPFS — permanently. No take-backs.' })
  @ApiResponse({
    status: 201,
    description: 'Metadata has been committed to eternity. The blockchain attic has received your data.',
    type: IpfsUploadResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required. The velvet rope is down.',
  })
  async uploadMetadata(@Body() dto: UploadMetadataDto) {
    try {
      // Hand the metadata to the service. From here, it's between the JSON and the void.
      const result = await this.ipfsService.uploadMetadata(
        dto.metadata,
        dto.pin,
      );

      // Survived. The data lives in IPFS now. Light a candle.
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Something went wrong between here and the decentralized ether. Log it and mourn.
      this.logger.error(`Failed to upload metadata: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload metadata: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/ipfs/upload/file
   *
   * Accepts a single file (image, JSON, video of your cat — IPFS does not judge)
   * and uploads it to the decentralized network. Pin by default because
   * unpinned content is just vibes that eventually disappear, and NFT art
   * deserves better than vibes.
   *
   * Protected by ApiKeyGuard. This is not a democracy.
   *
   * @param file   - The Multer file object, bravely carrying its bytes across HTTP
   * @param pin    - Optional string ('true'/'false'). Defaults to true because yolo is not a pinning strategy.
   * @returns IPFS hash, path, gateway URL, byte size, and pinned status
   */
  @Post('upload/file')
  @UseGuards(ApiKeyGuard)                         // Bouncer is watching. Intensely.
  @UseInterceptors(FileInterceptor('file'))        // Intercept the multipart file before it gets confused
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload a single file to IPFS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',  // Binary: the language of computers, the enemy of readability
        },
        pin: {
          type: 'boolean',
          default: true,  // Default true because forgetting to pin is how NFTs become ghost data
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded. It now lives on the decentralized web forever. Congratulations.',
    type: IpfsUploadResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required. The void has a dress code.',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('pin') pin?: string,
  ) {
    // If no file arrived, the multipart form lied to us. Classic.
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      // Pin defaults to true if unspecified — because "maybe pin it" is not acceptable
      // for permanent NFT asset storage. We pin. We always pin.
      const shouldPin = pin === 'true' || pin === undefined;
      const result = await this.ipfsService.uploadFile(file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        pin: shouldPin,
      });

      // The file has ascended. Return proof of its existence.
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // The file did not ascend. It fell. Log the crash. Mourn briefly. Move on.
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/ipfs/upload/files
   *
   * Bulk upload. For when one file simply isn't enough and you need to commit
   * an entire batch of assets to the blockchain attic in a single HTTP request.
   * Processes each file individually and collects results + errors like trophies
   * and participation ribbons respectively.
   *
   * Protected by ApiKeyGuard. Still a bouncer. Still watching.
   *
   * @param files - Array of Multer files. Up to 500. (Five hundred. The audacity.)
   * @param pin   - Optional pin preference, string form, defaults to true
   * @returns Array of results per file, including error entries for the fallen
   */
  @Post('upload/files')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(FilesInterceptor('files', 500))  // 500 files. Because apparently we needed a limit.
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload multiple files to IPFS in one glorious, chaotic batch' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },  // Many files. Much binary. Very data.
        },
        pin: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded. Some succeeded; some may have perished.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: API key required. Bulk entry not a thing.' })
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('pin') pin?: string,
  ) {
    // No files? No deal. Someone sent an empty form and we will not stand for it.
    if (!files?.length) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }

    // Pin default: true. Because "probably pin it" is not a storage strategy.
    const shouldPin = pin === 'true' || pin === undefined;

    // The results bucket — trophies and participation ribbons both welcome here.
    const results: { filename: string; hash: string; path: string; gatewayUrl: string; size: number; pinned: boolean; error?: string }[] = [];

    // Process each file one at a time. Sequential. Predictable. Boring, but reliable.
    // Unlike some people. (Not naming names.)
    for (const file of files) {
      try {
        // Attempt to hurl this particular file into the decentralized void.
        const result = await this.ipfsService.uploadFile(file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
          pin: shouldPin,
        });

        // Victory. This file made it. Record its achievement.
        results.push({
          filename: file.originalname,
          hash: result.hash,
          path: result.path,
          gatewayUrl: result.gatewayUrl,
          size: result.size,
          pinned: result.pinned,
        });
      } catch (error) {
        // This file did not make it. Add it to the "at least we tried" pile.
        this.logger.warn(`Failed to upload ${file.originalname}: ${error.message}`);
        results.push({
          filename: file.originalname,
          hash: '',        // The hash that never was
          path: '',        // The path not taken
          gatewayUrl: '',  // The gateway URL of broken dreams
          size: 0,
          pinned: false,
          error: error.message,
        });
      }
    }

    // Return the full scorecard: survivors and casualties alike.
    return {
      success: true,
      data: { results },
    };
  }

  /**
   * POST /api/ipfs/upload/directory
   *
   * The big one. Uploads an entire directory of files as a single IPFS DAG
   * wrapped in a directory node. Returns a base_uri suitable for passing
   * directly to your on-chain contract. This is how NFT collections get their
   * content address — one hash to rule them all.
   *
   * Form field names become the file paths in the directory.
   * Name them well. The blockchain does not offer a rename function.
   *
   * @param files - All files, collected by AnyFilesInterceptor because we accept everything
   * @param pin   - Whether to pin the entire directory. Defaults to true because we're not monsters.
   * @returns base_uri in ipfs:// format, gateway URL, hash, and pinned status
   */
  @Post('upload/directory')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(AnyFilesInterceptor())  // AnyFiles: the most permissive interceptor. A generous soul.
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Upload multiple files as one IPFS directory (returns base_uri for contract)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      description: 'Form field names = file path (e.g. 0.json, 1.png). Each field = one file. Name them carefully.',
      additionalProperties: { type: 'string', format: 'binary' },
    },
  })
  @ApiResponse({ status: 201, description: 'Directory uploaded. One hash. All your files. The blockchain attic has a new shelf.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: API key required. Directory services are exclusive.' })
  async uploadDirectory(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('pin') pin?: string,
  ) {
    // If they sent an empty directory, we must gently but firmly say no.
    if (!files?.length) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }

    // Pin the directory. The whole thing. Because a partially pinned collection
    // is just a horror story waiting to happen on mint day.
    const shouldPin = pin === 'true' || pin === undefined;

    // Map each file to { path, content } — the format the IPFS service expects.
    // fieldname becomes the path. If they didn't set fieldname, we fall back gracefully.
    const entries = files.map((file) => ({
      path: file.fieldname || file.originalname || 'file',
      content: file.buffer,
    }));

    try {
      // Hand the whole directory to the service and pray to whatever gods oversee DAG construction.
      const result = await this.ipfsService.uploadDirectory(entries, shouldPin);
      return {
        success: true,
        data: {
          hash: result.hash,           // The root CID — the single hash that represents all your files
          baseUri: result.baseUri,     // ipfs://{hash}/ — paste this into your contract constructor
          gatewayUrl: result.gatewayUrl,
          pinned: result.pinned,
        },
      };
    } catch (error) {
      // The directory upload failed. The DAG did not form. Weep, then retry.
      this.logger.error(`Failed to upload directory: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload directory: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/ipfs/pin/:hash
   *
   * Explicitly pins a CID that already exists in IPFS, ordering the node
   * to keep it in local storage indefinitely. Pinned = it won't be garbage-collected.
   * Unpinned = it's vibes with an expiry date.
   *
   * @param hash - The IPFS CID to pin (permanent preserve order, issued by you)
   * @returns { hash, success: true } on successful pinning
   */
  @Post('pin/:hash')
  @UseGuards(ApiKeyGuard)         // The bouncer guards the pin list with terrifying efficiency.
  @HttpCode(HttpStatus.OK)        // 200 not 201 — this is a state change, not a creation (pedantically important)
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Pin a file by its IPFS hash — tell the void to hold on to this one' })
  @ApiResponse({
    status: 200,
    description: 'File pinned. The IPFS node has been given its marching orders.',
    type: IpfsPinResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required. Pinning privileges are not free.',
  })
  async pin(@Param('hash') hash: string) {
    try {
      // Issue the pin command and await the node's compliance.
      const success = await this.ipfsService.pin(hash);
      return {
        success: true,
        data: {
          hash,
          success,
        },
      };
    } catch (error) {
      // The pin did not stick. Unfortunate. The void is fickle.
      this.logger.error(`Failed to pin file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to pin file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/ipfs/unpin/:hash
   *
   * Releases the IPFS node's hold on a CID. The content still exists on the
   * broader network (probably) but this node will no longer actively preserve it.
   * Use with caution. Use with ceremony. Use with the understanding that
   * "it'll still be there" is not a storage strategy.
   *
   * @param hash - The IPFS CID to unpin (you're letting go; make peace with that)
   * @returns { hash, success: true } when the node has been told to move on
   */
  @Post('unpin/:hash')
  @UseGuards(ApiKeyGuard)         // Even forgetting requires authorization. Deeply philosophical.
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Unpin a file by its IPFS hash — release it back to the decentralized ether' })
  @ApiResponse({
    status: 200,
    description: 'File unpinned. It may or may not persist on the network. Good luck.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: API key required. Unpinning is also a privilege.',
  })
  async unpin(@Param('hash') hash: string) {
    try {
      // Let it go. (The Elsa of IPFS operations.)
      const success = await this.ipfsService.unpin(hash);
      return {
        success: true,
        data: {
          hash,
          success,
        },
      };
    } catch (error) {
      // Couldn't let go. Emotionally understandable. Operationally problematic.
      this.logger.error(`Failed to unpin file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to unpin file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/ipfs/pins
   *
   * Lists every CID currently pinned on this node, enriched with gateway URLs
   * for convenient browser viewing. Think of it as a museum catalog — except
   * everything is a hash and nothing has a frame.
   *
   * Public endpoint. Anyone can see what's pinned. (The blockchain attic has a guest list.)
   *
   * @returns Array of { cid, type, gatewayUrl } for all pinned content
   */
  @Get('pins')
  @ApiOperation({ summary: 'List all pinned files (CIDs) on the IPFS node — the full inventory of eternity' })
  @ApiResponse({
    status: 200,
    description: 'The complete catalog of things we have promised to keep forever.',
  })
  async listPins() {
    try {
      // Ask the node for its full pin inventory. This could be a long list.
      const pins = await this.ipfsService.listPins();

      // Enrich each CID with a gateway URL so browsers can actually look at these things.
      const data = pins.map((p) => ({
        cid: p.cid,          // The CID itself — the true name of the file in IPFS
        type: p.type,        // Usually 'recursive' — means the whole DAG subtree is pinned
        gatewayUrl: this.ipfsService.getGatewayUrl(p.cid), // The human-friendly URL
      }));

      return {
        success: true,
        data: { pins: data },
      };
    } catch (error) {
      // The pin list could not be retrieved. The attic door is stuck.
      this.logger.error(`Failed to list pins: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to list pins: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/ipfs/check/:hash
   *
   * Existential question of the day: is this CID pinned, or just floating
   * in the decentralized ether on borrowed time?
   *
   * @param hash - The CID whose pinning status you are here to interrogate
   * @returns { hash, pinned: boolean } — truth, delivered plainly
   */
  @Get('check/:hash')
  @ApiOperation({ summary: 'Check if a file is pinned — because uncertainty is no way to run a launchpad' })
  @ApiResponse({
    status: 200,
    description: 'Pin status retrieved. The answer may or may not bring comfort.',
  })
  async checkPin(@Param('hash') hash: string) {
    try {
      // Ask the question. Accept the answer.
      const isPinned = await this.ipfsService.isPinned(hash);
      return {
        success: true,
        data: {
          hash,
          pinned: isPinned,  // true = safe; false = say a prayer
        },
      };
    } catch (error) {
      // We couldn't even determine the pin status. Schrödinger's CID.
      this.logger.error(`Failed to check pin status: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to check pin status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/ipfs/retrieve/:hash
   *
   * Fetches the raw bytes of a file from IPFS and returns them base64-encoded
   * in the response body. Great for verifying content exists.
   * Not great for serving large files over HTTP. (Please use the gateway for that.
   * Seriously. The gateway. Use it.)
   *
   * @param hash - The CID of the file to retrieve from the decentralized ether
   * @returns Base64-encoded file content, hash, and byte size
   */
  @Get('retrieve/:hash')
  @ApiOperation({ summary: 'Retrieve raw file content from IPFS — base64-encoded, delivered with love' })
  @ApiResponse({
    status: 200,
    description: 'File content retrieved. Bytes intact. Entropy defeated (this time).',
  })
  async retrieve(@Param('hash') hash: string) {
    try {
      // Fetch the raw bytes from IPFS. We then base64-encode them for JSON compatibility.
      const content = await this.ipfsService.getFile(hash);
      return {
        success: true,
        data: {
          hash,
          content: content.toString('base64'), // Base64: making binary safe for JSON since 1987
          size: content.length,
        },
      };
    } catch (error) {
      const msg: string = error.message ?? '';

      // Directories masquerading as files — a common source of confusion and sorrow.
      const isDirectory = msg.includes('is a directory') || msg.includes('dag node is a directory');

      // The hash doesn't exist or can't be found. The void has no record of this content.
      const notFound = msg.includes('not found') || msg.includes('does not exist');

      if (isDirectory || notFound) {
        // Specific 404 with context — we respect your time enough to explain why this failed.
        throw new HttpException(
          { success: false, error: `Hash ${hash} is a directory or not retrievable as a file` },
          HttpStatus.NOT_FOUND,
        );
      }

      // Something else went wrong. Unknown variety. The worst kind.
      this.logger.error(`Failed to retrieve file: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/ipfs/metadata/:hash
   *
   * Fetches and parses JSON metadata from IPFS. This is what NFT marketplaces
   * call when they want to display your collection's name, description, and image.
   * The sacred data. The metadata that will outlive us all.
   *
   * @param hash - The CID of the JSON metadata file stored in IPFS
   * @returns Parsed metadata object, ready for consumption by marketplaces and the curious
   */
  @Get('metadata/:hash')
  @ApiOperation({ summary: 'Retrieve JSON metadata from IPFS — the sacred NFT data itself' })
  @ApiResponse({
    status: 200,
    description: 'Metadata retrieved. Your NFT\'s identity, exposed for all to see.',
  })
  async getMetadata(@Param('hash') hash: string) {
    try {
      // Fetch the file, parse the JSON, return the metadata. Simple. Elegant. Usually works.
      const metadata = await this.ipfsService.getMetadata(hash);
      return {
        success: true,
        data: {
          hash,
          metadata,  // The actual NFT metadata — name, description, image, traits, and dreams
        },
      };
    } catch (error: any) {
      const msg: string = error.message ?? '';

      // Directory hash instead of metadata file — someone put the wrong CID in the contract. Classic.
      const isDirectory = msg.includes('is a directory') || msg.includes('dag node is a directory');

      // Hash doesn't exist in IPFS — maybe it was never uploaded, maybe it was unpinned, maybe it was fate.
      const notFound = msg.includes('not found') || msg.includes('does not exist');

      if (isDirectory || notFound) {
        // Clear, actionable 404. The metadata cannot be fetched. Full stop.
        throw new HttpException(
          { success: false, error: `Hash ${hash} is a directory or has no JSON metadata` },
          HttpStatus.NOT_FOUND,
        );
      }

      // Something else entirely. Unknown failure mode. Log it and apologize.
      this.logger.error(`Failed to retrieve metadata: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve metadata: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/ipfs/view/:hash
   *
   * The laziest endpoint we have, and we are proud of it.
   * Just redirects the browser straight to the IPFS public gateway for that hash.
   * No processing. No transforms. Just a 302 and a polite "go look over there."
   *
   * @param hash - The CID to view in the browser (ideally an image or HTML)
   * @returns 302 redirect to the public IPFS gateway URL
   */
  @Get('view/:hash')
  @Redirect()  // The HTTP equivalent of pointing and saying "it's over there"
  @ApiOperation({ summary: 'Redirect to IPFS gateway for browser viewing — our most decisive endpoint' })
  @ApiResponse({
    status: 302,
    description: 'Redirecting to IPFS gateway. It\'s out of our hands now. Godspeed.',
  })
  async viewInBrowser(@Param('hash') hash: string) {
    // Construct the gateway URL and tell NestJS where to redirect.
    // This endpoint redirects to the IPFS gateway for easy browser viewing.
    // No try-catch needed — if the URL constructs, we redirect. Simple life.
    const gatewayUrl = this.ipfsService.getGatewayUrl(hash);
    return { url: gatewayUrl, statusCode: 302 };
  }

  /**
   * GET /api/ipfs/info
   *
   * Returns raw node information from the IPFS daemon — ID, addresses,
   * agent version, protocol version. The node's identity card.
   * Useful for debugging, operators, and the professionally curious.
   *
   * @returns Full node info object from the Kubo API
   */
  @Get('info')
  @ApiOperation({ summary: 'Get IPFS node information — its ID, addresses, and general life story' })
  @ApiResponse({
    status: 200,
    description: 'Node information retrieved. The IPFS node has an identity and is comfortable with it.',
  })
  async getNodeInfo() {
    try {
      // Ask the node who it is. The Kubo API /id endpoint is always happy to answer.
      const nodeInfo = await this.ipfsService.getNodeInfo();
      return {
        success: true,
        data: nodeInfo,  // ID, addresses, agentVersion, protocolVersion — the full picture
      };
    } catch (error: any) {
      // The node failed to introduce itself. Possibly shy. More likely misconfigured.
      this.logger.error(`Failed to get node info: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get node info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: IPFS controller philosopher, reluctant HTTP handler, attic archivist
// Observation: Every endpoint here is a small prayer to the decentralized gods.
//              Some prayers are answered. Some return 503. The blockchain does not care.
// Note: "Permanent" storage is only permanent while someone is pinning it.
//       That someone is you. Pin everything. Pin it twice if you love it.
// ─────────────────────────────────────────────────────────────────────────────

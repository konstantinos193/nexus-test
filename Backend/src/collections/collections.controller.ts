import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  HttpException,
  HttpStatus,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CollectionsSyncService } from './collections-sync.service';
import { NFTCollection } from './dto/collection.dto';
import { ApiResponseDto } from './dto/api-response.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';

@ApiTags('collections')
@Controller('api/collections')
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly syncService: CollectionsSyncService,
  ) {}

  @Get('featured')
  @ApiOperation({ summary: 'Get featured collections' })
  @ApiResponse({ status: 200, description: 'Featured collections retrieved successfully' })
  async getFeatured(): Promise<ApiResponseDto<NFTCollection[]>> {
    try {
      const collections = await this.collectionsService.findFeatured();
      return { success: true, data: collections };
    } catch (error) {
      throw new HttpException(
        { success: false, error: 'Failed to fetch featured collections' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('discover')
  @ApiOperation({ summary: 'Get collections by discover tab' })
  @ApiQuery({ name: 'tab', enum: ['trending', 'new', 'ending_soon', 'free_mint'], required: false })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  async getDiscover(@Query('tab') tab?: string): Promise<ApiResponseDto<NFTCollection[]>> {
    try {
      const collections = await this.collectionsService.findByTab(tab || 'trending');
      return { success: true, data: collections };
    } catch (error) {
      throw new HttpException(
        { success: false, error: 'Failed to fetch discover collections' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all collections with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', enum: ['newest', 'oldest', 'name', 'minted'], required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (1–50). Default 15 when search is used.' })
  @ApiQuery({ name: 'creator', required: false, description: 'Filter by creator wallet address (for dashboard)' })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  async getAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limitStr?: string,
    @Query('creator') creatorAddress?: string,
  ): Promise<ApiResponseDto<NFTCollection[]>> {
    try {
      let limit: number | undefined;
      if (limitStr != null && limitStr !== '') {
        const n = parseInt(limitStr, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 50) limit = n;
      }
      const collections = await this.collectionsService.findAll({
        status,
        search: search?.trim() || undefined,
        sortBy,
        limit,
        creatorAddress: creatorAddress?.trim() || undefined,
      });
      return { success: true, data: collections };
    } catch (error) {
      throw new HttpException(
        { success: false, error: 'Failed to fetch collections' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single collection by ID or slug' })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getOne(@Param('id') idOrSlug: string): Promise<ApiResponseDto<NFTCollection>> {
    try {
      const collection = await this.collectionsService.findOne(idOrSlug);
      if (!collection) {
        throw new HttpException(
          { success: false, error: 'Collection not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: collection };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, error: 'Failed to fetch collection' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync')
  @ApiOperation({ summary: 'Manually trigger collection sync from blockchain' })
  @ApiResponse({ status: 200, description: 'Sync started successfully' })
  async syncCollections(): Promise<ApiResponseDto<{ message: string }>> {
    try {
      // Run sync in background (don't await - return immediately)
      this.syncService.syncCollections().catch((error) => {
        // Log error but don't throw (sync runs in background)
        console.error('Background sync failed:', error);
      });

      return {
        success: true,
        data: { message: 'Collection sync started in background' },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: 'Failed to start sync' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('deploy')
  @ApiOperation({ summary: 'Save collection to DB after frontend signs and confirms the on-chain tx' })
  @ApiResponse({ status: 201, description: 'Collection saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid collection data' })
  @ApiResponse({ status: 500, description: 'Failed to save collection' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async deployCollection(
    @Body() deployData: CreateCollectionDto,
  ): Promise<ApiResponseDto<{ collectionId: string; collectionAddress: string; slug: string }>> {
    try {
      const result = await this.collectionsService.deployCollection(deployData);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error instanceof Error ? error.message : 'Failed to save collection' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm on-chain deployment — called by frontend after tx is confirmed' })
  @ApiResponse({ status: 200, description: 'Collection marked as ready' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async confirmDeployment(
    @Param('id') collectionId: string,
    @Body() body: { signature: string },
  ): Promise<ApiResponseDto<NFTCollection>> {
    try {
      const collection = await this.collectionsService.confirmDeployment(collectionId, body.signature);
      return { success: true, data: collection };
    } catch (error) {
      throw new HttpException(
        { success: false, error: 'Failed to confirm deployment' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('onchain/:address')
  @ApiOperation({ summary: 'Get collection data directly from blockchain' })
  @ApiResponse({ status: 200, description: 'Collection data retrieved from blockchain' })
  async getCollectionOnChain(
    @Param('address') address: string,
  ): Promise<ApiResponseDto<any>> {
    try {
      const collection = await this.syncService.getCollectionOnChain(address);
      if (!collection) {
        throw new HttpException(
          { success: false, error: 'Collection not found on-chain' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: collection };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, error: 'Failed to fetch collection from blockchain' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

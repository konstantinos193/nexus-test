/**
 * IPFS Service
 *
 * Handles all IPFS operations via the Kubo HTTP API (fetch only, no ESM-only packages).
 * Works in CJS/Docker and connects to an existing IPFS node (e.g. ipfs/kubo in Docker).
 *
 * Supports: upload, pin, retrieve, directory upload, metadata.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IpfsConfig, defaultIpfsConfig } from './ipfs.config';

/** Minimal client state: base URL and optional API key for HTTP API calls */
interface IpfsHttpState {
  baseUrl: string;
  apiKey?: string;
}

@Injectable()
export class IpfsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IpfsService.name);
  private state: IpfsHttpState | null = null;
  private config: IpfsConfig;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    this.config = this.loadConfig();
  }

  private loadConfig(): IpfsConfig {
    const mode = (this.configService.get<string>('IPFS_MODE') || 'http') as 'local' | 'http';
    return {
      mode,
      http: {
        apiUrl: this.configService.get<string>('IPFS_API_URL') || defaultIpfsConfig.http!.apiUrl,
        gatewayUrl: this.configService.get<string>('IPFS_GATEWAY_URL') || defaultIpfsConfig.http!.gatewayUrl,
        apiKey: this.configService.get<string>('IPFS_API_KEY'),
      },
      local: {
        repoPath: this.configService.get<string>('IPFS_REPO_PATH') || defaultIpfsConfig.local!.repoPath,
      },
      pinning: {
        autoPin: this.configService.get<boolean>('IPFS_AUTO_PIN') ?? defaultIpfsConfig.pinning!.autoPin,
        pinTimeout: Number(this.configService.get('IPFS_PIN_TIMEOUT')) || defaultIpfsConfig.pinning!.pinTimeout || 30000,
      },
      gateway: {
        publicUrl: this.configService.get<string>('IPFS_PUBLIC_GATEWAY_URL') || defaultIpfsConfig.gateway!.publicUrl,
        enableCors: this.configService.get<boolean>('IPFS_GATEWAY_CORS') ?? defaultIpfsConfig.gateway!.enableCors,
      },
    };
  }

  async onModuleInit() {
    try {
      await this.initialize();
      this.logger.log('IPFS service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize IPFS service: ${error.message}`, error.stack);
    }
  }

  async onModuleDestroy() {
    this.state = null;
    this.isInitialized = false;
    this.logger.log('IPFS service shutting down');
  }

  private async initialize(): Promise<void> {
    if (this.config.mode !== 'http') {
      throw new Error('Local IPFS node mode not yet implemented. Use HTTP client mode.');
    }
    await this.initializeHttpClient();
  }

  /**
   * Call Kubo HTTP API (POST). Uses fetch; no ESM-only packages.
   */
  private async ipfsPost(
    command: string,
    searchParams: Record<string, string> = {},
    body?: BodyInit,
  ): Promise<Response> {
    const s = this.state;
    if (!s) throw new Error('IPFS service is not initialized.');
    const url = new URL(`/api/v0/${command}`, s.baseUrl);
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers: Record<string, string> = {};
    if (s.apiKey) headers['Authorization'] = `Bearer ${s.apiKey}`;
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: body ? { ...headers } : { ...headers },
      body,
      signal: AbortSignal.timeout(Number(this.config.pinning!.pinTimeout) || 30000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`IPFS API ${command}: ${res.status} ${text}`);
    }
    return res;
  }

  private async initializeHttpClient(): Promise<void> {
    const { apiUrl, apiKey } = this.config.http!;
    const baseUrl = apiUrl.replace(/\/$/, '');
    this.state = { baseUrl, apiKey };

    try {
      const res = await this.ipfsPost('id', {});
      const id = await res.json();
      this.logger.log(`Connected to IPFS node: ${id.ID ?? id.Id ?? id.id ?? 'ok'}`);
      this.isInitialized = true;
    } catch (error) {
      this.logger.error(`Failed to connect to IPFS node: ${error.message}`, error.stack);
      this.state = null;
      this.isInitialized = false;
      throw error;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.state !== null;
  }

  async uploadFile(
    file: Buffer | string,
    options?: { filename?: string; contentType?: string; pin?: boolean },
  ): Promise<{
    hash: string;
    path: string;
    gatewayUrl: string;
    size: number;
    pinned: boolean;
  }> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    const pin = options?.pin ?? this.config.pinning!.autoPin;
    const content = typeof file === 'string' ? Buffer.from(file) : file;
    const name = options?.filename || 'file';

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(content)]), name);

    const params: Record<string, string> = {
      'cid-version': '1',
      progress: 'false',
    };
    if (pin) params.pin = 'true';

    const res = await this.ipfsPost('add', params, form);
    const text = await res.text();
    const line = text.trim().split('\n')[0];
    if (!line) throw new Error('IPFS add returned empty response');
    const data = JSON.parse(line) as { Name: string; Hash: string; Size: string };
    const hash = data.Hash;
    const size = parseInt(data.Size, 10) || content.length;

    let pinned = pin;
    if (pin) {
      try {
        await this.pin(hash);
        pinned = true;
      } catch (e) {
        this.logger.warn(`Failed to pin file ${hash}: ${e.message}`);
        pinned = false;
      }
    }

    this.logger.log(`File uploaded to IPFS: ${hash} (${size} bytes)`);
    return {
      hash,
      path: `ipfs://${hash}`,
      gatewayUrl: this.getGatewayUrl(hash),
      size,
      pinned,
    };
  }

  async uploadDirectory(
    entries: Array<{ path: string; content: Buffer }>,
    pin?: boolean,
  ): Promise<{ hash: string; baseUri: string; gatewayUrl: string; pinned: boolean }> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    if (!entries.length) throw new Error('No files provided for directory upload.');
    const doPin = pin ?? this.config.pinning!.autoPin;

    const form = new FormData();
    for (const e of entries) {
      form.append(e.path, new Blob([new Uint8Array(e.content)]), e.path);
    }

    const params: Record<string, string> = {
      'wrap-with-directory': 'true',
      'cid-version': '1',
      progress: 'false',
    };
    if (doPin) params.pin = 'true';

    const res = await this.ipfsPost('add', params, form);
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    if (!lines.length) throw new Error('IPFS add returned no results');
    const last = JSON.parse(lines[lines.length - 1]) as { Name: string; Hash: string };
    const hash = last.Hash;
    const baseUri = `ipfs://${hash}/`;
    const gatewayUrl = this.getGatewayUrl(hash);

    let pinned = doPin;
    if (doPin) {
      try {
        await this.pin(hash);
        pinned = true;
      } catch (e) {
        this.logger.warn(`Failed to pin directory ${hash}: ${e.message}`);
        pinned = false;
      }
    }

    this.logger.log(`Directory uploaded to IPFS: ${hash} (${entries.length} files), base_uri=${baseUri}`);
    return { hash, baseUri, gatewayUrl, pinned };
  }

  async uploadMetadata(
    metadata: Record<string, any>,
    pin?: boolean,
  ): Promise<{ hash: string; path: string; gatewayUrl: string; size: number; pinned: boolean }> {
    const jsonString = JSON.stringify(metadata, null, 2);
    return this.uploadFile(jsonString, {
      filename: 'metadata.json',
      contentType: 'application/json',
      pin: pin ?? this.config.pinning!.autoPin,
    });
  }

  async pin(hash: string): Promise<boolean> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    await this.ipfsPost('pin/add', { arg: hash });
    this.logger.log(`File pinned: ${hash}`);
    return true;
  }

  async unpin(hash: string): Promise<boolean> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    await this.ipfsPost('pin/rm', { arg: hash });
    this.logger.log(`File unpinned: ${hash}`);
    return true;
  }

  async isPinned(hash: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const res = await this.ipfsPost('pin/ls', { arg: hash });
      const json = await res.json() as { Keys?: Record<string, { Type: string }> };
      const keys = json.Keys || {};
      return Object.keys(keys).some((k) => k === hash || k.includes(hash));
    } catch {
      return false;
    }
  }

  async listPins(): Promise<Array<{ cid: string; type: string }>> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    const res = await this.ipfsPost('pin/ls', { type: 'recursive' });
    const json = await res.json() as { Keys?: Record<string, { Type: string }> };
    const keys = json.Keys || {};
    return Object.entries(keys).map(([cid, v]) => ({ cid, type: v?.Type || 'recursive' }));
  }

  async getFile(hash: string): Promise<Buffer> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    const res = await this.ipfsPost('cat', { arg: hash });
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  async getMetadata(hash: string): Promise<Record<string, any>> {
    const file = await this.getFile(hash);
    try {
      return JSON.parse(file.toString('utf-8'));
    } catch (error) {
      throw new Error(`Failed to parse JSON from IPFS hash ${hash}: ${error.message}`);
    }
  }

  getGatewayUrl(hash: string): string {
    const gatewayUrl = this.config.gateway!.publicUrl;
    const base = gatewayUrl.endsWith('/') ? gatewayUrl : `${gatewayUrl}/`;
    return `${base}${hash}`;
  }

  getIpfsPath(hash: string): string {
    return `ipfs://${hash}`;
  }

  extractHash(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('ipfs://')) {
      return pathOrUrl.replace('ipfs://', '').replace(/\/$/, '');
    }
    const m = pathOrUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (m) return m[1];
    return pathOrUrl;
  }

  async getNodeInfo(): Promise<{
    id: string;
    addresses: string[];
    agentVersion: string;
    protocolVersion: string;
  }> {
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    const res = await this.ipfsPost('id', {});
    const id = await res.json() as Record<string, unknown>;
    const idStr = (id.ID ?? id.Id ?? id.id ?? '') as string;
    const addrs = (id.Addresses ?? id.addresses ?? []) as string[];
    return {
      id: String(idStr),
      addresses: Array.isArray(addrs) ? addrs.map(String) : [],
      agentVersion: (id.AgentVersion ?? id.agentVersion ?? 'unknown') as string,
      protocolVersion: (id.ProtocolVersion ?? id.protocolVersion ?? 'unknown') as string,
    };
  }
}

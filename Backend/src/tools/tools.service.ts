/**
 * tools.service.ts - The heavy lifter for the NFT asset generator.
 * Takes uploaded layer images, composites them using @napi-rs/canvas,
 * zips everything with archiver, writes to a temp file, hands back a token.
 *
 * Cleanup contract (very important, the user mentioned it twice):
 *   1. On download: the job directory is deleted immediately after the response finishes.
 *   2. On TTL: cron every 5 min deletes jobs older than 15 min.
 *   3. On startup: orphaned dirs (no valid meta.json) are pruned.
 *
 * @author Juan – temp-file janitor, memory-conscious compositor, async adventure haver
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
// @napi-rs/canvas: server-side canvas with prebuilt binaries – no GTK/cairo hell
import { createCanvas, loadImage } from '@napi-rs/canvas';
// archiver: streaming ZIP creation – we add images one at a time, never all in RAM at once
// archiver v6+ exports named classes (ZipArchive) instead of a default function
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ZipArchive } = require('archiver') as { ZipArchive: new (options?: object) => import('archiver').Archiver };
import type {
  GenerateNftConfig,
  GenerateNftResult,
  ExclusionRuleItem,
} from './dto/generate-nft.dto';

// All jobs live under this base directory
const JOBS_BASE = path.join(os.tmpdir(), 'nexus-nft-jobs');
// How long a job stays alive if the user never downloads (milliseconds)
const JOB_TTL_MS = 15 * 60 * 1000;
// Hard cap – we refuse to generate more than this regardless of config
const MAX_SUPPLY = 2000;

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  // On startup: clean up any orphaned dirs left by a previous server crash
  async onModuleInit() {
    try {
      await fs.mkdir(JOBS_BASE, { recursive: true });
      const entries = await fs.readdir(JOBS_BASE);
      for (const entry of entries) {
        const dir = path.join(JOBS_BASE, entry);
        try {
          const meta = JSON.parse(
            await fs.readFile(path.join(dir, 'meta.json'), 'utf-8'),
          );
          // Expired on last run – clean up
          if (new Date(meta.expiresAt) < new Date()) {
            await fs.rm(dir, { recursive: true, force: true });
            this.logger.log(`Startup cleanup: removed expired job ${entry}`);
          }
        } catch {
          // No meta.json = incomplete write / crash – discard
          await fs.rm(dir, { recursive: true, force: true });
          this.logger.log(`Startup cleanup: removed orphaned job ${entry}`);
        }
      }
    } catch {
      // JOBS_BASE didn't exist, created it above. Nothing to clean.
    }
  }

  // Main generation entry point – orchestrates everything, returns a download token
  async generate(
    files: Express.Multer.File[],
    configStr: string,
  ): Promise<GenerateNftResult> {
    const config: GenerateNftConfig = JSON.parse(configStr);

    // --- Organise uploaded files by layer ---
    const filesByLayer = new Map<string, Express.Multer.File[]>();
    for (const file of files) {
      // fieldname pattern: layer_{layerId}
      const layerId = file.fieldname.replace(/^layer_/, '');
      if (!filesByLayer.has(layerId)) filesByLayer.set(layerId, []);
      filesByLayer.get(layerId)!.push(file);
    }

    // Sort layers by draw order (index 0 = back, last = front)
    const sortedLayers = config.layers
      .sort((a, b) => a.order - b.order)
      .map((l) => ({
        id: l.id,
        name: l.name,
        files: filesByLayer.get(l.id) ?? [],
      }))
      .filter((l) => l.files.length > 0);

    if (sortedLayers.length === 0) {
      throw new Error('No valid layer files received.');
    }

    // Pre-decode every source image exactly once, in parallel.
    // Without this, a 7-layer × 2000-NFT run calls loadImage 14,000 times instead of ~67.
    // loadImage(buffer) decodes PNG/JPEG from scratch each call — it's the main bottleneck.
    type DecodedImage = Awaited<ReturnType<typeof loadImage>>;
    const decodedImages: DecodedImage[][] = await Promise.all(
      sortedLayers.map((layer) =>
        Promise.all(layer.files.map((f) => loadImage(f.buffer))),
      ),
    );

    // --- Determine output dimensions ---
    let width: number;
    let height: number;
    if (config.outputSize === '512') {
      width = height = 512;
    } else if (config.outputSize === '1024') {
      width = height = 1024;
    } else {
      // Natural size from the already-decoded first image — no extra loadImage call
      width = decodedImages[0][0].width;
      height = decodedImages[0][0].height;
    }

    // --- Enumerate valid combinations ---
    const layerLengths = sortedLayers.map((l) => l.files.length);
    const totalCombinations = layerLengths.reduce((a, b) => a * b, 1);

    const supply = config.supply
      ? Math.min(config.supply, Math.min(totalCombinations, MAX_SUPPLY))
      : Math.min(totalCombinations, MAX_SUPPLY);

    const useRarity = hasRarity(config.rarityByLayer);
    const combosToGenerate = useRarity
      ? buildWeightedCombos(sortedLayers, config, supply, layerLengths, totalCombinations)
      : buildSequentialCombos(sortedLayers, config, supply, layerLengths, totalCombinations);

    if (combosToGenerate.length === 0) {
      throw new Error('No valid combinations after exclusions.');
    }

    // --- Create temp job directory ---
    const token = uuid();
    const jobDir = path.join(JOBS_BASE, token);
    await fs.mkdir(jobDir, { recursive: true });
    const zipPath = path.join(jobDir, 'collection.zip');

    // --- Stream ZIP to disk ---
    const output = createWriteStream(zipPath);
    // level: 0 = store only; PNGs are already compressed, recompressing wastes CPU
    const archive = new ZipArchive({ zlib: { level: 0 } });

    const archiveDone = new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });

    archive.pipe(output);

    const allAttributes: Array<Array<{ trait_type: string; value: string }>> = [];
    const traitValueCount = new Map<string, number>();

    for (let i = 0; i < combosToGenerate.length; i++) {
      const { indices } = combosToGenerate[i];

      // Composite this combination onto a canvas (uses pre-decoded images, no buffer re-decode)
      const pngBuffer = await compositeLayers(decodedImages, indices, width, height);
      archive.append(pngBuffer, { name: `images/${i}.png` });

      // Build metadata attributes
      const attributes = sortedLayers.map((layer, layerIdx) => {
        const originalValue = nameFromFilename(layer.files[indices[layerIdx]].originalname);
        const overrideMap = config.valueNameOverrides[layer.id];
        const displayValue =
          overrideMap?.[originalValue]?.trim() || originalValue;
        return { trait_type: layer.name, value: displayValue };
      });
      allAttributes.push(attributes);

      const meta = buildTokenMetadata(i, config.collectionNameBase.trim() || 'NFT', attributes, {
        description: config.collectionDescription,
        externalUrl: config.externalUrl,
      });
      archive.append(JSON.stringify(meta, null, 2), { name: `metadata/${i}.json` });

      // Accumulate trait counts for rarity scoring
      for (const attr of attributes) {
        const key = `${attr.trait_type}\t${attr.value}`;
        traitValueCount.set(key, (traitValueCount.get(key) ?? 0) + 1);
      }
    }

    // --- Rarity scoring ---
    const totalGen = allAttributes.length;
    const scores = allAttributes.map((attrs) =>
      attrs.reduce((sum, a) => {
        const key = `${a.trait_type}\t${a.value}`;
        return sum + totalGen / (traitValueCount.get(key) ?? 1);
      }, 0),
    );
    const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
    const rankByTokenId = new Map<number, number>();
    order.forEach((tokenId, zeroRank) => rankByTokenId.set(tokenId, zeroRank + 1));

    const rarityIndex = Array.from({ length: totalGen }, (_, tokenId) => ({
      tokenId,
      rank: rankByTokenId.get(tokenId)!,
      score: Math.round(scores[tokenId] * 100) / 100,
    }));

    archive.append(JSON.stringify(rarityIndex, null, 2), { name: 'rarity.json' });

    // Finalise and wait for the ZIP stream to fully close
    archive.finalize();
    await archiveDone;

    // --- Write job metadata for TTL tracking ---
    const expiresAt = new Date(Date.now() + JOB_TTL_MS);
    await fs.writeFile(
      path.join(jobDir, 'meta.json'),
      JSON.stringify({ expiresAt: expiresAt.toISOString(), count: totalGen }),
    );

    this.logger.log(`Job ${token}: generated ${totalGen} NFTs (${width}×${height})`);

    return { token, count: totalGen, rarityIndex, expiresAt: expiresAt.toISOString() };
  }

  // Returns the path to the ZIP, or null if the job doesn't exist / is expired
  async getJobZipPath(token: string): Promise<string | null> {
    // Basic path traversal guard – token should be a UUID
    if (!/^[0-9a-f-]{36}$/.test(token)) return null;

    const zipPath = path.join(JOBS_BASE, token, 'collection.zip');
    try {
      await fs.access(zipPath);
      return zipPath;
    } catch {
      return null;
    }
  }

  // Deletes the entire job directory – called after download and by the cron
  async deleteJob(token: string): Promise<void> {
    if (!/^[0-9a-f-]{36}$/.test(token)) return;
    const jobDir = path.join(JOBS_BASE, token);
    await fs.rm(jobDir, { recursive: true, force: true });
    this.logger.log(`Deleted job: ${token}`);
  }

  // Cron: scan every 5 minutes, delete anything past its TTL
  @Cron('*/5 * * * *')
  async cleanupExpiredJobs() {
    try {
      const entries = await fs.readdir(JOBS_BASE);
      for (const entry of entries) {
        try {
          const metaPath = path.join(JOBS_BASE, entry, 'meta.json');
          const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
          if (new Date(meta.expiresAt) < new Date()) {
            await fs.rm(path.join(JOBS_BASE, entry), { recursive: true, force: true });
            this.logger.log(`TTL cleanup: removed expired job ${entry}`);
          }
        } catch {
          // Unreadable meta.json – orphan, remove it
          await fs.rm(path.join(JOBS_BASE, entry), { recursive: true, force: true }).catch(() => undefined);
        }
      }
    } catch {
      // JOBS_BASE doesn't exist yet – no jobs, nothing to do
    }
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Strip file extension and clean up the name (mirrors nft-asset-utils.ts on the frontend)
function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

// Map a flat combo index → per-layer file indices
function getCombinationIndices(flatIndex: number, layerLengths: number[]): number[] {
  const indices: number[] = new Array(layerLengths.length);
  let remaining = flatIndex;
  for (let i = layerLengths.length - 1; i >= 0; i--) {
    indices[i] = remaining % layerLengths[i];
    remaining = Math.floor(remaining / layerLengths[i]);
  }
  return indices;
}

// Check if a combo matches any exclusion rule (exact mirror of frontend logic)
function isCombinationExcluded(
  layers: Array<{ id: string; files: Express.Multer.File[] }>,
  indices: number[],
  rules: ExclusionRuleItem[],
): boolean {
  for (const rule of rules) {
    const idxA = layers.findIndex((l) => l.id === rule.layerAId);
    const idxB = layers.findIndex((l) => l.id === rule.layerBId);
    if (idxA < 0 || idxB < 0) continue;
    const valA = nameFromFilename(layers[idxA].files[indices[idxA]].originalname);
    const valB = nameFromFilename(layers[idxB].files[indices[idxB]].originalname);
    if (valA === rule.valueA && valB === rule.valueB) return true;
  }
  return false;
}

// Check if any layer has rarity weights set
function hasRarity(rarityByLayer: Record<string, Record<string, string>>): boolean {
  return Object.values(rarityByLayer).some((layer) =>
    Object.values(layer).some((v) => parseFloat(v) > 0),
  );
}

// Get the rarity weight for a specific combo
function getCombinationWeight(
  layers: Array<{ id: string; files: Express.Multer.File[] }>,
  indices: number[],
  rarityByLayer: Record<string, Record<string, string>>,
): number {
  let weight = 1;
  for (let i = 0; i < layers.length; i++) {
    const layerRarity = rarityByLayer[layers[i].id];
    if (!layerRarity) continue;
    const valueName = nameFromFilename(layers[i].files[indices[i]].originalname);
    const pct = parseFloat(layerRarity[valueName]);
    if (!isNaN(pct)) weight *= pct;
  }
  return weight;
}

// Sequential (equal chance) selection: first N valid combos in order
function buildSequentialCombos(
  layers: Array<{ id: string; files: Express.Multer.File[] }>,
  config: GenerateNftConfig,
  supply: number,
  layerLengths: number[],
  total: number,
): Array<{ indices: number[] }> {
  const result: Array<{ indices: number[] }> = [];
  for (let i = 0; i < total && result.length < supply; i++) {
    const indices = getCombinationIndices(i, layerLengths);
    if (!isCombinationExcluded(layers, indices, config.exclusionRules)) {
      result.push({ indices });
    }
  }
  return result;
}

// Weighted selection: rarity-biased random sampling without replacement
function buildWeightedCombos(
  layers: Array<{ id: string; files: Express.Multer.File[] }>,
  config: GenerateNftConfig,
  supply: number,
  layerLengths: number[],
  total: number,
): Array<{ indices: number[] }> {
  type Weighted = { flatIndex: number; indices: number[]; weight: number };
  const pool: Weighted[] = [];
  let totalWeight = 0;

  for (let i = 0; i < total; i++) {
    const indices = getCombinationIndices(i, layerLengths);
    if (isCombinationExcluded(layers, indices, config.exclusionRules)) continue;
    const weight = getCombinationWeight(layers, indices, config.rarityByLayer);
    if (weight <= 0) continue;
    pool.push({ flatIndex: i, indices, weight });
    totalWeight += weight;
  }

  if (totalWeight === 0) return [];

  const used = new Set<number>();
  const result: Array<{ indices: number[] }> = [];

  for (let n = 0; n < supply && used.size < pool.length; n++) {
    let remaining = pool.reduce((s, c) => (used.has(c.flatIndex) ? s : s + c.weight), 0);
    if (remaining <= 0) break;
    let r = Math.random() * remaining;
    let picked: Weighted | null = null;
    for (const c of pool) {
      if (used.has(c.flatIndex)) continue;
      r -= c.weight;
      if (r <= 0) {
        picked = c;
        break;
      }
    }
    if (!picked) picked = pool.find((c) => !used.has(c.flatIndex)) ?? null;
    if (!picked) break;
    used.add(picked.flatIndex);
    result.push({ indices: picked.indices });
  }

  return result;
}

// Composite N layers onto a canvas using pre-decoded images — no buffer re-decode per NFT
async function compositeLayers(
  decodedImages: Array<Array<Awaited<ReturnType<typeof loadImage>>>>,
  indices: number[],
  width: number,
  height: number,
): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < decodedImages.length; i++) {
    ctx.drawImage(decodedImages[i][indices[i]] as unknown as Parameters<typeof ctx.drawImage>[0], 0, 0, width, height);
  }

  return canvas.encode('png');
}

// Build the standard NFT metadata JSON object
function buildTokenMetadata(
  index: number,
  nameBase: string,
  attributes: Array<{ trait_type: string; value: string }>,
  opts: { description?: string; externalUrl?: string },
) {
  return {
    name: `${nameBase} #${index}`,
    description: opts.description ?? '',
    external_url: opts.externalUrl ?? '',
    attributes,
  };
}

// — Juan. Temp files: created, used once, deleted. Like a mayfly, but a ZIP file.

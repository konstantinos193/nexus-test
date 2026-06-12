// RevenueService — the owner's money view.
//
// Two complementary sources, by design:
//   • SNAPSHOT  (Collection table): exact all-time totals = minted × price × feeBps/10000.
//                Always correct, but has no time dimension.
//   • LEDGER    (fee_ledger table): time-series of fee revenue, accrued going forward from
//                when the ledger started recording deltas. Powers the charts.
//
// All monetary values are SOL. SQL casts money expressions to float8 so node-pg returns
// JS numbers instead of numeric strings. Table is "Collection" (quoted PascalCase) — the
// lowercase `collection` does not exist (a bug we avoid here).

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SolanaService } from '../solana/solana.service';
import { PLATFORM_FEE_BPS, PLATFORM_WALLET } from '../solana/constants';

// Per-collection fee bps falls back to the platform default when a row didn't store its own.
const DEFAULT_FEE_BPS = Number(PLATFORM_FEE_BPS) || 100;

export interface RevenueSummary {
  allTimeRevenue: number;     // SOL, snapshot (exact)
  last24h: number;            // SOL, from ledger
  last7d: number;             // SOL, from ledger
  last30d: number;            // SOL, from ledger
  ledgerAllTime: number;      // SOL, from ledger (for transparency vs snapshot)
  totalMinted: number;
  paidCollections: number;
  freeCollections: number;
  treasuryWallet: string;
  treasuryBalance: number | null;   // live on-chain SOL balance of PLATFORM_WALLET (null if RPC down)
  expectedAccrued: number;          // = allTimeRevenue (snapshot) — what treasury "should" hold
  treasuryDrift: number | null;     // treasuryBalance - expectedAccrued (null if balance unknown)
  defaultFeeBps: number;
}

@Injectable()
export class RevenueService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly solana: SolanaService,
  ) {}

  async getSummary(): Promise<RevenueSummary> {
    // Snapshot totals from the live Collection table.
    const snap = await this.dataSource.query(
      `
      SELECT
        COALESCE(SUM(
          CASE WHEN price IS NOT NULL AND price > 0
            THEN minted * price * COALESCE("platformFeeBasisPoints", $1) / 10000.0
            ELSE 0 END
        ), 0)::float8                                                   AS "allTimeRevenue",
        COALESCE(SUM(minted), 0)::int                                   AS "totalMinted",
        COUNT(*) FILTER (WHERE price IS NOT NULL AND price > 0)::int    AS "paidCollections",
        COUNT(*) FILTER (WHERE price IS NULL OR price = 0)::int         AS "freeCollections"
      FROM "Collection"
      WHERE "deletedAt" IS NULL
      `,
      [DEFAULT_FEE_BPS],
    );

    // Period totals from the ledger.
    const led = await this.dataSource.query(
      `
      SELECT
        COALESCE(SUM("feeRevenue") FILTER (WHERE "recordedAt" >= NOW() - INTERVAL '1 day'), 0)::float8   AS "last24h",
        COALESCE(SUM("feeRevenue") FILTER (WHERE "recordedAt" >= NOW() - INTERVAL '7 days'), 0)::float8  AS "last7d",
        COALESCE(SUM("feeRevenue") FILTER (WHERE "recordedAt" >= NOW() - INTERVAL '30 days'), 0)::float8 AS "last30d",
        COALESCE(SUM("feeRevenue"), 0)::float8                                                            AS "ledgerAllTime"
      FROM "fee_ledger"
      `,
    );

    const s = snap[0];
    const l = led[0];

    // Live treasury balance — best effort; never fail the whole report if the RPC is down.
    let treasuryBalance: number | null = null;
    try {
      treasuryBalance = await this.solana.getAccountBalance(PLATFORM_WALLET);
    } catch {
      treasuryBalance = null;
    }

    const expectedAccrued = s.allTimeRevenue;
    return {
      allTimeRevenue: s.allTimeRevenue,
      last24h: l.last24h,
      last7d: l.last7d,
      last30d: l.last30d,
      ledgerAllTime: l.ledgerAllTime,
      totalMinted: s.totalMinted,
      paidCollections: s.paidCollections,
      freeCollections: s.freeCollections,
      treasuryWallet: PLATFORM_WALLET,
      treasuryBalance,
      expectedAccrued,
      treasuryDrift: treasuryBalance == null ? null : treasuryBalance - expectedAccrued,
      defaultFeeBps: DEFAULT_FEE_BPS,
    };
  }

  /** Per-collection fee revenue (snapshot), highest earners first. */
  async getByCollection(limit = 100): Promise<any[]> {
    const safeLimit = Math.min(500, Math.max(1, limit));
    return this.dataSource.query(
      `
      SELECT
        id, name, slug, "mintAddress", "creatorAddress", creator,
        minted, "totalSupply",
        price::float8                                  AS price,
        COALESCE("platformFeeBasisPoints", $1)         AS "platformFeeBps",
        (CASE WHEN price IS NOT NULL AND price > 0
          THEN minted * price * COALESCE("platformFeeBasisPoints", $1) / 10000.0
          ELSE 0 END)::float8                          AS "feeRevenue"
      FROM "Collection"
      WHERE "deletedAt" IS NULL
      ORDER BY "feeRevenue" DESC, minted DESC
      LIMIT $2
      `,
      [DEFAULT_FEE_BPS, safeLimit],
    );
  }

  /** Per-creator fee revenue (snapshot), highest earners first. */
  async getByCreator(): Promise<any[]> {
    return this.dataSource.query(
      `
      SELECT
        "creatorAddress",
        creator                                        AS "displayName",
        COUNT(*)::int                                  AS "collectionCount",
        COALESCE(SUM(minted), 0)::int                  AS "totalMinted",
        COALESCE(SUM(
          CASE WHEN price IS NOT NULL AND price > 0
            THEN minted * price * COALESCE("platformFeeBasisPoints", $1) / 10000.0
            ELSE 0 END
        ), 0)::float8                                  AS "feeRevenue"
      FROM "Collection"
      WHERE "deletedAt" IS NULL
      GROUP BY "creatorAddress", creator
      ORDER BY "feeRevenue" DESC
      `,
      [DEFAULT_FEE_BPS],
    );
  }

  /**
   * Time-series of fee revenue and mint volume from the ledger.
   * bucket ∈ {hour, day, week, month}. Defaults: last 30 days, daily buckets,
   * baseline (catch-up) rows excluded so the curve reflects organic growth.
   */
  async getTimeseries(params: {
    from?: string;
    to?: string;
    bucket?: string;
    includeBaseline?: boolean;
  }): Promise<Array<{ bucket: string; feeRevenue: number; minted: number }>> {
    const allowed = new Set(['hour', 'day', 'week', 'month']);
    const bucket = allowed.has(params.bucket ?? '') ? params.bucket! : 'day';
    const to = params.to ? new Date(params.to) : new Date();
    const from = params.from ? new Date(params.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const includeBaseline = params.includeBaseline ?? false;

    return this.dataSource.query(
      `
      SELECT
        date_trunc($1, "recordedAt")          AS bucket,
        COALESCE(SUM("feeRevenue"), 0)::float8 AS "feeRevenue",
        COALESCE(SUM("mintedDelta"), 0)::int   AS minted
      FROM "fee_ledger"
      WHERE "recordedAt" >= $2 AND "recordedAt" <= $3
        AND ($4 OR "isBaseline" = false)
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [bucket, from, to, includeBaseline],
    );
  }

  /** CSV of per-collection fee revenue, for accounting/bookkeeping. */
  async exportByCollectionCsv(): Promise<string> {
    const rows = await this.getByCollection(500);
    const header = [
      'collectionId',
      'name',
      'slug',
      'mintAddress',
      'creatorAddress',
      'creator',
      'minted',
      'totalSupply',
      'priceSol',
      'platformFeeBps',
      'feeRevenueSol',
    ];
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.name,
          r.slug,
          r.mintAddress,
          r.creatorAddress,
          r.creator,
          r.minted,
          r.totalSupply,
          r.price ?? 0,
          r.platformFeeBps,
          r.feeRevenue,
        ]
          .map(escape)
          .join(','),
      );
    }
    return lines.join('\n');
  }
}

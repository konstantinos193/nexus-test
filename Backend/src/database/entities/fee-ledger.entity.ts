// The FeeLedger entity.
//
// The platform's money diary. Every time the 5-minute sync notices a collection's
// on-chain `minted` count went up, it writes one row here recording how much
// platform-fee revenue that delta represents. Sum these rows over time and you get
// the owner's revenue chart; sum them all-time and you get the owner's take.
//
// Why a ledger and not just `minted * price * feeBps`? Because that snapshot tells you
// the TOTAL, but never WHEN it happened. The ledger gives the time dimension the
// snapshot can't: revenue today, this week, this month — and the charts the owner asked for.
//
// Source of truth note: this ledger is DERIVED from the on-chain `minted` counter via
// the sync service. There is no on-chain mint event to subscribe to (the program only
// logs "Minted X"), so deltas observed at sync time are the best available signal.
// Granularity is therefore ~5 minutes, and the first observation of a pre-existing
// collection lands as one larger "baseline" delta (mintedBefore tells you which rows
// those are). Exact all-time totals still come from the live snapshot; the ledger owns
// the timeline.

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * FeeLedger
 *
 * One row per observed positive change in a collection's minted count.
 * Maps to the PostgreSQL table "fee_ledger".
 *
 * feeRevenue is stored (not just computed on read) so reports never have to
 * re-derive historical fee rates — the rate that applied at observation time is
 * frozen into the row. (platform_fee_bps can change; the ledger remembers what was.)
 */
@Entity('fee_ledger')
@Index(['collectionId'])
@Index(['creatorAddress'])
@Index(['recordedAt'])
export class FeeLedger {
  /** Surrogate primary key. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The Collection.id this revenue belongs to.
   * Not a hard FK (the sync upserts collections in the same transaction and we
   * don't want a constraint ordering headache) but always populated and indexed.
   */
  @Column()
  collectionId: string;

  /** On-chain mint address, copied for convenience so reports avoid a join. */
  @Column({ nullable: true, length: 44 })
  mintAddress?: string;

  /** Creator wallet, copied so "revenue by creator" is a single-table GROUP BY. */
  @Column({ length: 44 })
  creatorAddress: string;

  /** Cumulative minted before this observation (0 on a collection's first sync). */
  @Column({ default: 0 })
  mintedBefore: number;

  /** Cumulative minted after this observation. */
  @Column({ default: 0 })
  mintedAfter: number;

  /** mintedAfter - mintedBefore. Always > 0 for a persisted row. */
  @Column({ default: 0 })
  mintedDelta: number;

  /**
   * Price per mint in SOL at observation time (the creator's price, fee is on top).
   * High precision to match lamport accuracy. Null/0 for free mints.
   */
  @Column('numeric', {
    precision: 18,
    scale: 9,
    nullable: true,
    transformer: { to: (v: number | null) => v, from: (v: string | null) => (v == null ? undefined : parseFloat(v)) },
  })
  pricePerMint?: number;

  /** Platform fee in basis points at observation time (100 = 1%). */
  @Column('int', { nullable: true })
  platformFeeBps?: number;

  /**
   * Platform fee revenue in SOL for this delta.
   * = mintedDelta * pricePerMint * platformFeeBps / 10000
   * Frozen at write time so changing the fee rate later never rewrites history.
   */
  @Column('numeric', {
    precision: 18,
    scale: 9,
    default: 0,
    transformer: { to: (v: number | null) => v, from: (v: string | null) => (v == null ? 0 : parseFloat(v)) },
  })
  feeRevenue: number;

  /**
   * True when this row is the first observation of an already-minted collection
   * (mintedBefore was 0 but the chain reported a non-zero minted). These rows make
   * all-time-from-ledger correct but distort the time bucket they land in, so
   * timeseries queries can optionally exclude them.
   */
  @Column({ default: false })
  @Index()
  isBaseline: boolean;

  /** When the sync observed this delta. The timeline anchor for all charts. */
  @CreateDateColumn()
  recordedAt: Date;
}

// The AuditLog entity.
//
// The owner console's black box recorder. Every privileged action — featuring a
// collection, overriding a status, deleting, changing a fee, pausing the platform,
// creating an admin — lands here with who/what/when/target and, for on-chain actions,
// the transaction signature. If something changed and nobody remembers why, this table
// is where the answer lives.
//
// Append-only by convention: we insert, we read, we never update or delete.

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * AuditLog
 *
 * Maps to the PostgreSQL table "audit_log".
 */
@Entity('audit_log')
@Index(['actorId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** AdminUser.id that performed the action. Null for system/automated actions. */
  @Column({ nullable: true })
  actorId?: string;

  /** Denormalized actor email so the log is readable even if the user is later removed. */
  @Column({ nullable: true })
  actorEmail?: string;

  /** Machine-readable action key, e.g. "collection.featured", "auth.login", "fee.update". */
  @Column()
  action: string;

  /** What kind of thing was acted on, e.g. "collection", "admin_user", "platform". */
  @Column({ nullable: true })
  targetType?: string;

  /** Identifier of the acted-on thing (collection id, admin id, etc.). */
  @Column({ nullable: true })
  targetId?: string;

  /** Arbitrary structured context — before/after values, request body, etc. */
  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  /** On-chain transaction signature for governance actions, when applicable. */
  @Column({ nullable: true, length: 88 })
  txSignature?: string;

  /** Requester IP for forensic context. */
  @Column({ nullable: true })
  ip?: string;

  @CreateDateColumn()
  createdAt: Date;
}

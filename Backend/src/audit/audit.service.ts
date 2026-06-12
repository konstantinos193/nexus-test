// AuditService — writes and reads the owner console's append-only action log.
//
// `record` is fire-and-safe: an audit write must NEVER break the action it documents,
// so failures are logged and swallowed. `list` powers the audit page.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';

export interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  txSignature?: string;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /** Persist one audit entry. Never throws — audit failure must not abort the caller. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.save(this.repo.create(entry));
    } catch (e) {
      this.logger.error(`Failed to write audit log for "${entry.action}":`, e as any);
    }
  }

  /** Paginated, filterable audit history (newest first). */
  async list(params: {
    page?: number;
    pageSize?: number;
    action?: string;
    actorId?: string;
  }): Promise<{ data: AuditLog[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));

    const qb = this.repo.createQueryBuilder('a').orderBy('a.createdAt', 'DESC');
    if (params.action) qb.andWhere('a.action = :action', { action: params.action });
    if (params.actorId) qb.andWhere('a.actorId = :actorId', { actorId: params.actorId });

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total, page, pageSize };
  }
}

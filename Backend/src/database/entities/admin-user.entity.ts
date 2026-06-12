// The AdminUser entity.
//
// The owner console's staff list. Replaces the old single shared API key with real
// accounts that have names, hashed passwords, and ROLES — so "who did this and were
// they allowed to" finally has an answer.
//
// Passwords are hashed with scrypt (Node's built-in crypto, no native deps) — see
// auth/password.util.ts. We never store plaintext. We never log the hash. We never
// email it. The hash lives here and nowhere else.

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * AdminRole — what an admin is allowed to do.
 *
 * Ordered loosely by power. RolesGuard maps each privileged route to the roles
 * permitted to call it. super_admin can do everything (including managing other admins).
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin', // Everything, including admin user & governance management
  FINANCE     = 'finance',     // Revenue/fees reports + read-only oversight
  MODERATOR   = 'moderator',   // Collections moderation (featured, status, pause, delete)
  READ_ONLY   = 'read_only',   // Look, don't touch
}

/**
 * AdminUser
 *
 * Maps to the PostgreSQL table "admin_user".
 * One row per person who can sign into the owner console.
 */
@Entity('admin_user')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Login identity. Unique, stored lowercased by the service. */
  @Column({ unique: true })
  @Index()
  email: string;

  /** scrypt hash in the form "scrypt$<saltHex>$<hashHex>". Never exposed via the API. */
  @Column()
  passwordHash: string;

  /** Human display name shown in the UI and audit log. */
  @Column()
  displayName: string;

  /** Role gating what this admin can do. */
  @Column({ default: AdminRole.READ_ONLY })
  role: AdminRole;

  /** Disabled accounts cannot log in but are retained for audit history. */
  @Column({ default: false })
  disabled: boolean;

  /** Last successful login — for the admin management view. */
  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

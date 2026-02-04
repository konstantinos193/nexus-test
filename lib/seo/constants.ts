/**
 * Client-safe SEO constants (no process.env, no ??).
 * Use from 'use client' components to avoid Turbopack/SWC issues with lib/seo/config.
 * Keep in sync with config.ts where relevant.
 */

/** Copyright holder for footer and legal notices. */
export const siteCopyright = 'MarTech Networks'

/** X (Twitter) – MarTech Networks. */
export const twitterUrl = 'https://x.com/MartechNetworks'

/** Discord – MarTech Networks community. */
export const discordUrl = 'https://discord.gg/dWTDBzKuXv'

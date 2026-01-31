/**
 * Client-safe SEO constants (no process.env, no ??)
 * Use from 'use client' components to avoid Turbopack/SWC issues with lib/seo/config
 * Keep in sync with config.ts where relevant
 *
 * We keep these here so Footer, JsonLd, etc. can import without pulling in
 * the full config (which uses process.env and can cause hydration/SSR issues)
 *
 * @author Juan - The developer who kept constants safe for the client
 * (Coded with care, humor, and probably too much coffee)
 */

/** Copyright holder for footer and legal notices */
export const siteCopyright = 'MarTech Networks'

/** X (Twitter) – MarTech Networks */
export const twitterUrl = 'https://x.com/MartechNetworks'

/** Discord – MarTech Networks community */
export const discordUrl = 'https://discord.gg/dWTDBzKuXv'

// Coded by Juan - because every good config needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Constants: one place. No env in client. We're safe.

/**
 * Slug utility functions.
 *
 * The unsung heroes of URL hygiene.
 * Nobody thinks about slugs until a collection is named "Nexus: Genesis!!!"
 * and the URL becomes /collection/nexus-genesis and everyone is pleased.
 * Or until two teams both name their collection "Genesis" and we politely
 * append "-2" instead of letting PostgreSQL throw a unique constraint violation.
 *
 * Slugs are the URL's sense of dignity. This file provides that dignity.
 * No hash suffixes. No random strings. No "genesis-a3f9b2c".
 * Just clean, human-readable, URL-safe identifiers. As nature intended.
 */

/**
 * generateSlug
 *
 * Converts any string into a clean, URL-friendly slug.
 * The process: lowercase → trim → spaces to dashes → strip non-alphanumeric →
 * collapse multiple dashes → strip leading/trailing dashes.
 *
 * The result is safe to put in a URL, safe to put in a database with a UNIQUE constraint,
 * and safe to read to a human over the phone without causing confusion.
 *
 * Examples:
 *   "Nexus: Genesis!!!"   → "nexus-genesis"
 *   "  My Cool  NFT  "    → "my-cool-nft"
 *   "Üñíçödë Çhæøs"       → "nfd" (non-ASCII is stripped; plan your collection names wisely)
 *   ""                    → "collection" (the fallback for when inspiration didn't arrive)
 *   null / undefined      → "collection" (same fallback; we handle chaos gracefully)
 *
 * @param text - The input string to slugify (usually a collection name)
 * @returns A clean URL-safe slug — no special characters, no uppercase, no drama
 */
export function generateSlug(text: string): string {
  // Defensive check: if text is empty, null, undefined, or not a string —
  // return 'collection' as the default. It's not inspired, but it's valid.
  if (!text || typeof text !== 'string') {
    return 'collection';  // The safe fallback for when inspiration didn't show up
  }

  return text
    .toLowerCase()               // Step 1: ALL lowercase — URLs are case-sensitive, slugs shouldn't care
    .trim()                      // Step 2: strip surrounding whitespace — clean inputs, clean slugs
    .replace(/\s+/g, '-')        // Step 3: replace any run of whitespace with a single dash
    .replace(/[^a-z0-9-]/g, '')  // Step 4: remove everything that isn't a letter, digit, or dash
                                 //         (Sorry special characters. The URL spec has opinions.)
    .replace(/-+/g, '-')         // Step 5: collapse consecutive dashes into one — "my--nft" → "my-nft"
    .replace(/^-+|-+$/g, '');    // Step 6: strip any leading or trailing dashes — clean edges
}

/**
 * generateUniqueSlug
 *
 * Generates a unique slug by appending a numeric suffix when the base slug
 * already exists in the provided set of known slugs.
 *
 * The approach: try the base slug first. If taken, try base-2. Then base-3.
 * Continue until a free slot is found. Simple, readable, deterministic.
 * No UUIDs. No random strings. No hashes.
 *
 * Two "Genesis Collection" launches on the same platform will produce:
 *   "genesis-collection"    ← first to arrive
 *   "genesis-collection-2"  ← second to arrive
 *   "genesis-collection-3"  ← yes, there could be a third; we handle it
 *
 * The "nice" way to handle slug collisions. The alternative was ugly hashes.
 * Juan refused to write ugly hashes. Juan wrote this instead.
 *
 * @param baseSlug      - The desired slug (output of generateSlug, or similar)
 * @param existingSlugs - Set of all currently existing slugs — checked for collisions
 * @returns A unique slug string that does not exist in existingSlugs
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: Set<string>,
): string {
  // Check the base slug first — most collections are uniquely named and get through on the first try.
  // This is the happy path. Most users live here. Treasure the happy path.
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;  // First try, no collision. The best possible outcome. Light a candle.
  }

  // The base slug is taken. Someone was here first. We iterate with numeric suffixes.
  // Counter starts at 2 because "genesis-collection-1" looks like an accident.
  // "genesis-collection-2" looks like a sequel. Sequels are fine.
  let counter = 2;
  let candidate = `${baseSlug}-${counter}`;

  // Keep incrementing until we find a slug nobody has claimed yet.
  // In practice: this loop runs once or twice. In theory: it runs until the heat death of the universe.
  // In practice, there are not that many "Genesis Collection" collections on one platform.
  // (There are more than you'd think. But not that many.)
  while (existingSlugs.has(candidate)) {
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }

  // Found a free slot. Return the candidate with its numeric suffix.
  // The caller will save this to the database. The slug will be unique. Everyone will be fine.
  return candidate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: URL aesthetics officer, slug philosopher, defender of human-readable identifiers
// Strongly held belief: a URL should be readable by a human without a decoder ring.
//                       /collection/nexus-genesis is good.
//                       /collection/a3f9b2c81d4e is an existential threat.
//                       We choose good URLs. Every time.
// Note: generateSlug strips non-ASCII characters. If your collection name is in
//       Greek, Cyrillic, Chinese, or Emoji, the slug may become unexpectedly short.
//       Consider providing an explicit slug field in the creation form.
//       Or don't. "collection-47" has a certain mysterious charm.
// ─────────────────────────────────────────────────────────────────────────────

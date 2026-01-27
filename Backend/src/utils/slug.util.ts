/**
 * Utility functions for generating clean, URL-friendly slugs.
 * No hash suffixes here - just pure, beautiful slugs that make sense.
 */

/**
 * Converts a string to a URL-friendly slug.
 * Removes special characters, converts to lowercase, replaces spaces with dashes.
 * 
 * @param text - The text to convert to a slug
 * @returns A clean slug (e.g., "Preparing Launch" -> "preparing-launch")
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return 'collection';
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

/**
 * Generates a unique slug by appending a number if the base slug already exists.
 * This is the "nice" way to handle duplicates - no ugly hashes!
 * 
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Set of existing slugs to check against
 * @returns A unique slug (e.g., "preparing-launch", "preparing-launch-2", etc.)
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: Set<string>,
): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let candidate = `${baseSlug}-${counter}`;
  
  while (existingSlugs.has(candidate)) {
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}

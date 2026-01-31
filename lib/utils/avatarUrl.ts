/**
 * Avatar URL utility - generates local avatar URLs
 * Because external image services are slow, and we're not about that life
 * 
 * @author Juan - The developer who optimized avatars
 * (Coded with care, humor, and probably too much coffee)
 */

/**
 * Generate placeholder avatar image URL.
 * Milestone 1: use placehold.net so avatars show without /api/images/avatar.
 */
export function avatarUrl(
  _text: string,
  size: number = 16,
  _bgColor: string = '00d4ff',
  _textColor: string = 'ffffff'
): string {
  return `https://placehold.net/${size}x${size}.png`
}

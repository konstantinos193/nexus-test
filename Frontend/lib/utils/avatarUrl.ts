/**
 * Avatar URL utility - generates local avatar URLs
 * Because external image services are slow, and we're not about that life
 * 
 * @author Juan - The developer who optimized avatars
 * (Coded with care, humor, and probably too much coffee)
 */

/**
 * Generate local API URL for avatar image
 * Uses our own API route instead of placehold.co for better performance
 */
export function avatarUrl(
  text: string,
  size: number = 16,
  bgColor: string = '00d4ff',
  textColor: string = 'ffffff'
): string {
  const params = new URLSearchParams({
    text,
    size: size.toString(),
    bg: bgColor,
    textColor,
  })
  return `/api/images/avatar?${params.toString()}`
}

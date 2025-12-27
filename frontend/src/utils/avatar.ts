/**
 * Generate avatar URL using DiceBear API
 * Creates consistent, unique avatars based on username
 */

export type AvatarStyle = 
  | 'adventurer'      // Cartoon faces
  | 'adventurer-neutral'
  | 'avataaars'       // Bitmoji-like
  | 'bottts'          // Robots
  | 'fun-emoji'       // Fun emojis
  | 'lorelei'         // Anime style
  | 'notionists'      // Notion-style
  | 'open-peeps'      // Hand-drawn people
  | 'personas'        // Simple faces
  | 'pixel-art'       // Pixelated
  | 'thumbs'          // Thumbs up/down characters

const AVATAR_STYLES: AvatarStyle[] = [
  'adventurer',
  'avataaars', 
  'bottts',
  'fun-emoji',
  'lorelei',
  'notionists',
  'pixel-art',
  'thumbs'
]

/**
 * Get a consistent avatar style based on username
 * Same username always gets the same style
 */
function getStyleForUsername(username: string): AvatarStyle {
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_STYLES[hash % AVATAR_STYLES.length]
}

/**
 * Generate avatar URL for a user
 */
export function getAvatarUrl(username: string, size: number = 80): string {
  const style = getStyleForUsername(username)
  const seed = encodeURIComponent(username.toLowerCase())
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&size=${size}&backgroundColor=transparent`
}

/**
 * Generate avatar URL for a subreddit
 */
export function getSubredditAvatarUrl(name: string, size: number = 80): string {
  const seed = encodeURIComponent(name.toLowerCase())
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&size=${size}&backgroundColor=b91c1c,c2410c,d97706,65a30d,059669,0891b2,2563eb,7c3aed,c026d3`
}

/**
 * Avatar component props helper
 */
export function getAvatarProps(username: string, size: number = 40) {
  return {
    src: getAvatarUrl(username, size * 2), // 2x for retina
    alt: `${username}'s avatar`,
    width: size,
    height: size,
  }
}


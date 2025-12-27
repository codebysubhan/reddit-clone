import { useState } from 'react'
import { getAvatarUrl, getSubredditAvatarUrl } from '../utils/avatar'

interface AvatarProps {
  username?: string
  subreddit?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 64,
}

const sizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-16 h-16',
}

export default function Avatar({ username, subreddit, size = 'md', className = '' }: AvatarProps) {
  const [error, setError] = useState(false)
  const pixelSize = sizes[size]
  const sizeClass = sizeClasses[size]
  
  const name = username || subreddit || 'anonymous'
  const url = subreddit 
    ? getSubredditAvatarUrl(subreddit, pixelSize * 2)
    : getAvatarUrl(name, pixelSize * 2)
  
  // Fallback to initials if image fails
  if (error) {
    const initial = name[0]?.toUpperCase() || '?'
    const bgColors = [
      'from-orange-500 to-red-600',
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-pink-500 to-rose-600',
      'from-yellow-500 to-orange-600',
      'from-indigo-500 to-blue-600',
      'from-cyan-500 to-blue-600',
    ]
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % bgColors.length
    
    return (
      <div 
        className={`${sizeClass} rounded-full bg-gradient-to-br ${bgColors[colorIndex]} flex items-center justify-center text-white font-bold ${className}`}
        style={{ fontSize: pixelSize * 0.4 }}
      >
        {initial}
      </div>
    )
  }
  
  return (
    <img
      src={url}
      alt={`${name}'s avatar`}
      className={`${sizeClass} rounded-full bg-reddit-dark object-cover ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  )
}

// Specialized components for common use cases
export function UserAvatar({ username, size = 'md', className = '' }: Omit<AvatarProps, 'subreddit'>) {
  return <Avatar username={username} size={size} className={className} />
}

export function SubredditAvatar({ name, size = 'md', className = '' }: { name: string; size?: AvatarProps['size']; className?: string }) {
  return <Avatar subreddit={name} size={size} className={className} />
}


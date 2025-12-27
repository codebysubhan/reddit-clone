import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, Bookmark, MoreHorizontal } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postApi, Post } from '../api/client'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { SubredditAvatar } from './Avatar'

interface PostCardProps {
  post: Post
  showFullContent?: boolean
}

function formatVoteCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return count.toString()
}

export default function PostCard({ post, showFullContent = false }: PostCardProps) {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const voteMutation = useMutation({
    mutationFn: ({ vote }: { vote: number }) => postApi.vote(post.id, vote),
    onMutate: async ({ vote }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['posts', 'feed'])
      
      // Optimistically update
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) => {
              if (p.id === post.id) {
                const oldVote = p.user_vote || 0
                const voteDiff = vote - oldVote
                return {
                  ...p,
                  user_vote: vote === 0 ? null : vote,
                  vote_count: p.vote_count + voteDiff
                }
              }
              return p
            })
          }))
        }
      })
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['posts', 'feed'], context.previousData)
      }
      toast.error('Failed to vote')
    },
    // Don't refetch on success - we already updated optimistically
  })

  const handleVote = (e: React.MouseEvent, vote: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated()) {
      toast.error('Please login to vote')
      return
    }
    const newVote = post.user_vote === vote ? 0 : vote
    voteMutation.mutate({ vote: newVote })
  }

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast.success('Post saved!')
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false })
    .replace('about ', '')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' months', 'mo')
    .replace(' month', 'mo')

  return (
    <article className="bg-reddit-card border border-reddit-border rounded-lg hover:border-reddit-textSecondary/50 transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-2 text-xs">
        <Link 
          to={`/r/${post.subreddit_name}`}
          className="flex items-center gap-1.5 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <SubredditAvatar name={post.subreddit_name} size="xs" />
          <span className="font-semibold text-reddit-text">r/{post.subreddit_name}</span>
        </Link>
        <span className="text-reddit-textSecondary">•</span>
        <span className="text-reddit-textSecondary">{timeAgo} ago</span>
      </div>

      <Link to={`/post/${post.id}`} className="block">
        {/* Title */}
        <h3 className="px-3 text-lg font-medium text-reddit-text leading-snug group-hover:text-reddit-blue transition-colors">
          {post.title}
        </h3>

        {/* Content Preview */}
        {post.content && (
          <p className={`px-3 mt-1 text-sm text-reddit-textSecondary ${showFullContent ? '' : 'line-clamp-3'}`}>
            {post.content}
          </p>
        )}

        {/* Image */}
        {post.image_url && !imageError && (
          <div className="mt-2 relative bg-black/20">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-reddit-dark/50">
                <div className="w-8 h-8 border-2 border-reddit-orange border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img 
              src={post.image_url} 
              alt={post.title}
              className={`w-full max-h-[512px] object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        )}
      </Link>

      {/* Actions Bar */}
      <div className="px-2 py-1.5 flex items-center gap-1 text-reddit-textSecondary">
        {/* Votes */}
        <div className="flex items-center bg-reddit-dark/50 rounded-full">
          <button
            onClick={(e) => handleVote(e, 1)}
            className={`p-1.5 rounded-full hover:bg-reddit-dark transition-colors ${
              post.user_vote === 1 ? 'text-reddit-orange' : 'hover:text-reddit-orange'
            }`}
            title="Upvote"
          >
            <ArrowBigUp className="w-5 h-5" fill={post.user_vote === 1 ? 'currentColor' : 'none'} />
          </button>
          <span className={`text-xs font-bold min-w-[2rem] text-center ${
            post.user_vote === 1 ? 'text-reddit-orange' : 
            post.user_vote === -1 ? 'text-blue-500' : ''
          }`}>
            {formatVoteCount(post.vote_count)}
          </span>
          <button
            onClick={(e) => handleVote(e, -1)}
            className={`p-1.5 rounded-full hover:bg-reddit-dark transition-colors ${
              post.user_vote === -1 ? 'text-blue-500' : 'hover:text-blue-500'
            }`}
            title="Downvote"
          >
            <ArrowBigDown className="w-5 h-5" fill={post.user_vote === -1 ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Comments */}
        <Link 
          to={`/post/${post.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-reddit-dark/50 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-semibold">{post.comment_count}</span>
        </Link>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-reddit-dark/50 transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:inline">Share</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-reddit-dark/50 transition-colors"
          title="Save"
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:inline">Save</span>
        </button>

        {/* More */}
        <button
          className="p-1.5 rounded-full hover:bg-reddit-dark/50 transition-colors ml-auto"
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </article>
  )
}

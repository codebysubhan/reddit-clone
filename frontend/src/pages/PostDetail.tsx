import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { postApi, commentApi, Comment } from '../api/client'
import { useAuthStore } from '../store/auth'
import { 
  ArrowBigUp, ArrowBigDown, MessageSquare, Loader2, Share2, 
  MoreHorizontal, Pencil, Trash2, X, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { UserAvatar, SubredditAvatar } from '../components/Avatar'

function formatVoteCount(count: number): string {
  if (Math.abs(count) >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return count.toString()
}

interface CommentCardProps {
  comment: Comment
  postId: string
  depth: number
  tree: Map<string | null, Comment[]>
  onReply: (parentId: string) => void
  replyingTo: string | null
  replyText: string
  setReplyText: (text: string) => void
  onSubmitReply: (parentId: string) => void
  onCancelReply: () => void
  isSubmitting: boolean
  currentUserId?: string
}

function CommentCard({ 
  comment, 
  postId, 
  depth, 
  tree, 
  onReply, 
  replyingTo, 
  replyText, 
  setReplyText,
  onSubmitReply,
  onCancelReply,
  isSubmitting,
  currentUserId
}: CommentCardProps) {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  
  const isAuthor = currentUserId === comment.author_id
  
  const voteMutation = useMutation({
    mutationFn: ({ vote }: { vote: number }) => commentApi.vote(postId, comment.id, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
  })

  const editMutation = useMutation({
    mutationFn: () => commentApi.update(postId, comment.id, editText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      setIsEditing(false)
      toast.success('Comment updated')
    },
    onError: () => toast.error('Failed to update comment'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => commentApi.delete(postId, comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      toast.success('Comment deleted')
    },
    onError: () => toast.error('Failed to delete comment'),
  })

  const handleVote = (vote: number) => {
    if (!isAuthenticated()) {
      toast.error('Please login to vote')
      return
    }
    const newVote = comment.user_vote === vote ? 0 : vote
    voteMutation.mutate({ vote: newVote })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteMutation.mutate()
    }
    setShowMenu(false)
  }

  const children = tree.get(comment.id) || []
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })
    .replace('about ', '')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')

  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-6' : ''}>
      <div className={`${depth > 0 ? 'border-l-2 border-reddit-border/50 pl-3 sm:pl-4' : ''}`}>
        <div className="py-2">
          {/* Author info */}
          <div className="flex items-center gap-2 text-xs mb-1">
            <Link to={`/u/${comment.author_username}`}>
              <UserAvatar username={comment.author_username} size="sm" />
            </Link>
            <Link to={`/u/${comment.author_username}`} className="font-medium text-reddit-text hover:underline">
              {comment.author_username}
            </Link>
            <span className="text-reddit-textSecondary">•</span>
            <span className="text-reddit-textSecondary">{timeAgo} ago</span>
            {isAuthor && <span className="text-xs text-reddit-blue">(you)</span>}
          </div>
          
          {/* Content or Edit Mode */}
          {isEditing ? (
            <div className="pl-8 mb-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-reddit-dark border border-reddit-border rounded-lg p-3 text-sm text-reddit-text focus:outline-none focus:border-reddit-blue resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => editMutation.mutate()}
                  disabled={editMutation.isPending || !editText.trim()}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  {editMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditText(comment.content) }}
                  className="btn-secondary text-xs py-1.5 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-reddit-text pl-8 mb-2">{comment.content}</p>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-1 pl-8 text-reddit-textSecondary">
            {/* Votes */}
            <button
              onClick={() => handleVote(1)}
              className={`p-1 rounded hover:bg-reddit-dark/50 transition-colors ${
                comment.user_vote === 1 ? 'text-reddit-orange' : 'hover:text-reddit-orange'
              }`}
            >
              <ArrowBigUp className="w-4 h-4" fill={comment.user_vote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-xs font-bold min-w-[1.5rem] text-center ${
              comment.user_vote === 1 ? 'text-reddit-orange' : 
              comment.user_vote === -1 ? 'text-blue-500' : ''
            }`}>
              {comment.vote_count}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className={`p-1 rounded hover:bg-reddit-dark/50 transition-colors ${
                comment.user_vote === -1 ? 'text-blue-500' : 'hover:text-blue-500'
              }`}
            >
              <ArrowBigDown className="w-4 h-4" fill={comment.user_vote === -1 ? 'currentColor' : 'none'} />
            </button>
            
            <button 
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-reddit-dark/50 transition-colors text-xs font-semibold ml-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Reply
            </button>
            
            <button className="p-1 rounded hover:bg-reddit-dark/50 transition-colors">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            
            {/* More menu for author */}
            {isAuthor && (
              <div className="relative ml-auto">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-reddit-dark/50 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-reddit-card border border-reddit-border rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                      <button
                        onClick={() => { setIsEditing(true); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-reddit-text hover:bg-reddit-dark transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-reddit-dark transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Reply box */}
          {replyingTo === comment.id && (
            <div className="mt-3 pl-8">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full bg-reddit-dark border border-reddit-border rounded-lg p-3 text-sm text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-blue resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onSubmitReply(comment.id)}
                  disabled={isSubmitting || !replyText.trim()}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {isSubmitting ? 'Posting...' : 'Reply'}
                </button>
                <button
                  onClick={onCancelReply}
                  className="btn-secondary text-xs py-1.5 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Child comments */}
        {children.length > 0 && (
          <div className="space-y-1">
            {children.map(child => (
              <CommentCard
                key={child.id}
                comment={child}
                postId={postId}
                depth={depth + 1}
                tree={tree}
                onReply={onReply}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmitReply={onSubmitReply}
                onCancelReply={onCancelReply}
                isSubmitting={isSubmitting}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentApi.list(id!).then(r => r.data),
    enabled: !!id,
  })

  const voteMutation = useMutation({
    mutationFn: ({ vote }: { vote: number }) => postApi.vote(id!, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
  })

  const commentMutation = useMutation({
    mutationFn: (data: { content: string; parent_id?: string }) => commentApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      setCommentText('')
      setReplyText('')
      setReplyingTo(null)
      toast.success('Comment added!')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  const editPostMutation = useMutation({
    mutationFn: () => postApi.update(id!, { title: editTitle, content: editContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      setIsEditingPost(false)
      toast.success('Post updated')
    },
    onError: () => toast.error('Failed to update post'),
  })

  const deletePostMutation = useMutation({
    mutationFn: () => postApi.delete(id!),
    onSuccess: () => {
      toast.success('Post deleted')
      navigate('/')
    },
    onError: () => toast.error('Failed to delete post'),
  })

  const handleVote = (vote: number) => {
    if (!isAuthenticated()) {
      toast.error('Please login to vote')
      return
    }
    const newVote = post?.user_vote === vote ? 0 : vote
    voteMutation.mutate({ vote: newVote })
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return
    commentMutation.mutate({ content: commentText })
  }

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim()) return
    commentMutation.mutate({ content: replyText, parent_id: parentId })
  }

  const handleEditPost = () => {
    setEditTitle(post?.title || '')
    setEditContent(post?.content || '')
    setIsEditingPost(true)
    setShowPostMenu(false)
  }

  const handleDeletePost = () => {
    if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      deletePostMutation.mutate()
    }
    setShowPostMenu(false)
  }

  // Build comment tree
  const commentTree = new Map<string | null, Comment[]>()
  comments.forEach(c => {
    const parent = c.parent_id
    if (!commentTree.has(parent)) {
      commentTree.set(parent, [])
    }
    commentTree.get(parent)!.push(c)
  })
  const rootComments = commentTree.get(null) || []

  const isPostAuthor = user?.id === post?.author_id

  if (postLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-reddit-text mb-2">Post Not Found</h1>
        <p className="text-reddit-textSecondary">This post may have been deleted.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Post */}
      <div className="bg-reddit-card border border-reddit-border rounded-xl overflow-hidden">
        {/* Post Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 text-xs">
            <Link 
              to={`/r/${post.subreddit_name}`}
              className="flex items-center gap-1.5 hover:underline"
            >
              <SubredditAvatar name={post.subreddit_name} size="sm" />
              <span className="font-semibold text-reddit-text">r/{post.subreddit_name}</span>
            </Link>
            <span className="text-reddit-textSecondary">•</span>
            <span className="text-reddit-textSecondary">
              Posted by <Link to={`/u/${post.author_username}`} className="hover:underline">u/{post.author_username}</Link> {formatDistanceToNow(new Date(post.created_at))} ago
            </span>
            {isPostAuthor && <span className="text-xs text-reddit-blue">(you)</span>}
          </div>
        </div>

        {/* Post Content */}
        <div className="px-4 pb-3">
          {isEditingPost ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-reddit-dark border border-reddit-border rounded-lg p-3 text-lg font-semibold text-reddit-text focus:outline-none focus:border-reddit-blue"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-reddit-dark border border-reddit-border rounded-lg p-3 text-reddit-text focus:outline-none focus:border-reddit-blue resize-none"
                rows={5}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => editPostMutation.mutate()}
                  disabled={editPostMutation.isPending || !editTitle.trim()}
                  className="btn-primary py-2 px-4 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editPostMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditingPost(false)}
                  className="btn-secondary py-2 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-reddit-text mb-3">{post.title}</h1>
              
              {post.content && (
                <p className="text-reddit-text mb-4 whitespace-pre-wrap">{post.content}</p>
              )}
              
              {post.image_url && (
                <div className="mb-4">
                  <img 
                    src={post.image_url} 
                    alt="Post content" 
                    className="max-h-[600px] rounded-lg object-contain w-full bg-black/20"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Post Actions */}
        <div className="px-4 py-2 border-t border-reddit-border/50 flex items-center gap-2 text-reddit-textSecondary">
          {/* Votes */}
          <div className="flex items-center">
            <button
              onClick={() => handleVote(1)}
              className={`p-1.5 rounded hover:bg-reddit-dark transition-colors ${
                post.user_vote === 1 ? 'text-reddit-orange' : 'hover:text-reddit-orange'
              }`}
            >
              <ArrowBigUp className="w-5 h-5" fill={post.user_vote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-sm font-bold min-w-[2rem] text-center ${
              post.user_vote === 1 ? 'text-reddit-orange' : 
              post.user_vote === -1 ? 'text-blue-500' : ''
            }`}>
              {formatVoteCount(post.vote_count)}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className={`p-1.5 rounded hover:bg-reddit-dark transition-colors ${
                post.user_vote === -1 ? 'text-blue-500' : 'hover:text-blue-500'
              }`}
            >
              <ArrowBigDown className="w-5 h-5" fill={post.user_vote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold">
            <MessageSquare className="w-4 h-4" />
            <span>{post.comment_count} Comments</span>
          </div>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link copied!')
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-reddit-dark transition-colors text-xs font-semibold"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          {/* Post author menu */}
          {isPostAuthor && (
            <div className="relative ml-auto">
              <button 
                onClick={() => setShowPostMenu(!showPostMenu)}
                className="p-1.5 rounded hover:bg-reddit-dark transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showPostMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPostMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-reddit-card border border-reddit-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                    <button
                      onClick={handleEditPost}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-reddit-text hover:bg-reddit-dark transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Post
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-reddit-dark transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Comment */}
      {isAuthenticated() && (
        <div className="mt-4 bg-reddit-card border border-reddit-border rounded-xl p-4">
          <p className="text-sm text-reddit-textSecondary mb-2">
            Comment as <span className="text-reddit-text font-medium">{user?.username}</span>
          </p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="What are your thoughts?"
            className="w-full bg-reddit-dark border border-reddit-border rounded-lg p-3 text-sm text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-blue resize-none"
            rows={4}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmitComment}
              disabled={commentMutation.isPending || !commentText.trim()}
              className="btn-primary text-sm py-2 px-6"
            >
              {commentMutation.isPending ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mt-4 bg-reddit-card border border-reddit-border rounded-xl p-4">
        <h2 className="font-bold text-reddit-text mb-4">
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>

        {commentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-reddit-orange" />
          </div>
        ) : rootComments.length === 0 ? (
          <p className="text-center text-reddit-textSecondary py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-2">
            {rootComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                postId={id!}
                depth={0}
                tree={commentTree}
                onReply={(parentId) => setReplyingTo(parentId)}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmitReply={handleSubmitReply}
                onCancelReply={() => { setReplyingTo(null); setReplyText('') }}
                isSubmitting={commentMutation.isPending}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

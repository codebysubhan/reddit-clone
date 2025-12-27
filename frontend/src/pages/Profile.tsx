import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { formatDistanceToNow } from 'date-fns'
import { 
  Loader2, 
  Calendar, 
  MessageSquare, 
  FileText, 
  TrendingUp,
  ArrowBigUp,
  ExternalLink
} from 'lucide-react'
import { UserAvatar } from '../components/Avatar'

interface UserProfile {
  id: string
  username: string
  karma: number
  post_count: number
  comment_count: number
  created_at: string
}

interface UserPost {
  id: string
  title: string
  content: string | null
  subreddit_name: string
  vote_count: number
  comment_count: number
  image_url: string | null
  created_at: string
}

interface UserComment {
  id: string
  content: string
  post_id: string
  post_title: string
  subreddit_name: string
  vote_count: number
  created_at: string
}

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts')

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api.get<UserProfile>(`/users/${username}`).then(r => r.data),
    enabled: !!username,
  })

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () => api.get<UserPost[]>(`/users/${username}/posts`).then(r => r.data),
    enabled: !!username && activeTab === 'posts',
  })

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['user-comments', username],
    queryFn: () => api.get<UserComment[]>(`/users/${username}/comments`).then(r => r.data),
    enabled: !!username && activeTab === 'comments',
  })

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-reddit-text mb-2">User Not Found</h1>
        <p className="text-reddit-textSecondary">u/{username} doesn't exist</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Profile Header */}
      <div className="bg-reddit-card border border-reddit-border rounded-xl overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-reddit-orange via-orange-500 to-red-600" />
        
        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-reddit-card overflow-hidden bg-reddit-dark">
                <UserAvatar username={profile.username} size="xl" className="w-full h-full" />
              </div>
            </div>
            
            <div className="flex-1 sm:pb-2">
              <h1 className="text-2xl font-bold text-reddit-text">u/{profile.username}</h1>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-reddit-dark rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-reddit-orange mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xl font-bold">{profile.karma.toLocaleString()}</span>
              </div>
              <p className="text-xs text-reddit-textSecondary">Karma</p>
            </div>
            
            <div className="bg-reddit-dark rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                <FileText className="w-5 h-5" />
                <span className="text-xl font-bold">{profile.post_count}</span>
              </div>
              <p className="text-xs text-reddit-textSecondary">Posts</p>
            </div>
            
            <div className="bg-reddit-dark rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xl font-bold">{profile.comment_count}</span>
              </div>
              <p className="text-xs text-reddit-textSecondary">Comments</p>
            </div>
            
            <div className="bg-reddit-dark rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-purple-400 mb-1">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-bold">
                  {formatDistanceToNow(new Date(profile.created_at))}
                </span>
              </div>
              <p className="text-xs text-reddit-textSecondary">Account Age</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'posts'
              ? 'bg-reddit-card text-reddit-text border border-reddit-border'
              : 'text-reddit-textSecondary hover:text-reddit-text hover:bg-reddit-dark'
          }`}
        >
          <FileText className="w-4 h-4" />
          Posts
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'comments'
              ? 'bg-reddit-card text-reddit-text border border-reddit-border'
              : 'text-reddit-textSecondary hover:text-reddit-text hover:bg-reddit-dark'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Comments
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'posts' && (
          <>
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-reddit-orange" />
              </div>
            ) : posts?.length === 0 ? (
              <div className="bg-reddit-card border border-reddit-border rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-reddit-textSecondary mb-3" />
                <p className="text-reddit-textSecondary">No posts yet</p>
              </div>
            ) : (
              posts?.map(post => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="block bg-reddit-card border border-reddit-border rounded-xl p-4 hover:border-reddit-textSecondary transition-colors"
                >
                  <div className="flex gap-4">
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="" 
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-reddit-textSecondary mb-1">
                        <span className="text-reddit-blue">r/{post.subreddit_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
                      </div>
                      <h3 className="font-medium text-reddit-text mb-2 line-clamp-2">{post.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-reddit-textSecondary">
                        <span className="flex items-center gap-1">
                          <ArrowBigUp className="w-4 h-4" />
                          {post.vote_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </>
        )}

        {activeTab === 'comments' && (
          <>
            {commentsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-reddit-orange" />
              </div>
            ) : comments?.length === 0 ? (
              <div className="bg-reddit-card border border-reddit-border rounded-xl p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-reddit-textSecondary mb-3" />
                <p className="text-reddit-textSecondary">No comments yet</p>
              </div>
            ) : (
              comments?.map(comment => (
                <Link
                  key={comment.id}
                  to={`/post/${comment.post_id}`}
                  className="block bg-reddit-card border border-reddit-border rounded-xl p-4 hover:border-reddit-textSecondary transition-colors"
                >
                  <div className="flex items-start gap-2 text-xs text-reddit-textSecondary mb-2">
                    <MessageSquare className="w-3 h-3 mt-0.5" />
                    <span>Commented on</span>
                    <span className="text-reddit-text font-medium line-clamp-1">{comment.post_title}</span>
                    <span>in</span>
                    <span className="text-reddit-blue">r/{comment.subreddit_name}</span>
                  </div>
                  <p className="text-reddit-text text-sm mb-2 line-clamp-3">{comment.content}</p>
                  <div className="flex items-center gap-4 text-xs text-reddit-textSecondary">
                    <span className="flex items-center gap-1">
                      <ArrowBigUp className="w-4 h-4" />
                      {comment.vote_count}
                    </span>
                    <span>{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                    <span className="flex items-center gap-1 text-reddit-blue">
                      <ExternalLink className="w-3 h-3" />
                      View
                    </span>
                  </div>
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}


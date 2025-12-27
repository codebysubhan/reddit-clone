import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subredditApi, Subreddit } from '../api/client'
import { useAuthStore } from '../store/auth'
import { Users, Plus, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { SubredditAvatar } from './Avatar'

interface Props {
  currentSubreddit?: Subreddit
}

export default function SubredditSidebar({ currentSubreddit }: Props) {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: subreddits } = useQuery({
    queryKey: ['subreddits'],
    queryFn: () => subredditApi.list().then(r => r.data),
  })

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => subredditApi.recommendations().then(r => r.data),
    enabled: isAuthenticated(),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => subredditApi.join(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] })
      queryClient.invalidateQueries({ queryKey: ['subreddit'] })
      toast.success('Joined community!')
    },
  })

  const leaveMutation = useMutation({
    mutationFn: (id: string) => subredditApi.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] })
      queryClient.invalidateQueries({ queryKey: ['subreddit'] })
      toast.success('Left community')
    },
  })

  return (
    <div className="space-y-4">
      {/* Current Subreddit Info */}
      {currentSubreddit && (
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <SubredditAvatar name={currentSubreddit.name} size="lg" />
            <h2 className="font-bold text-lg">r/{currentSubreddit.name}</h2>
          </div>
          <p className="text-sm text-reddit-textSecondary mb-3">
            {currentSubreddit.description}
          </p>
          <div className="flex items-center gap-2 text-sm text-reddit-textSecondary mb-3">
            <Users className="w-4 h-4" />
            <span>{currentSubreddit.member_count.toLocaleString()} members</span>
          </div>
          {isAuthenticated() && (
            currentSubreddit.is_member ? (
              <button
                onClick={() => leaveMutation.mutate(currentSubreddit.id)}
                className="btn-secondary w-full text-sm"
                disabled={leaveMutation.isPending}
              >
                Joined ✓
              </button>
            ) : (
              <button
                onClick={() => joinMutation.mutate(currentSubreddit.id)}
                className="btn-primary w-full text-sm"
                disabled={joinMutation.isPending}
              >
                Join
              </button>
            )
          )}
        </div>
      )}

      {/* Recommendations */}
      {isAuthenticated() && recommendations && recommendations.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-reddit-orange" />
            <h3 className="font-bold text-sm">Communities You Might Like</h3>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <Link 
                key={rec.id}
                to={`/r/${rec.name}`}
                className="flex items-center gap-2 p-1 hover:bg-reddit-dark rounded transition-colors"
              >
                <SubredditAvatar name={rec.name} size="xs" />
                <span className="text-sm flex-1 text-reddit-text hover:text-reddit-blue">
                  r/{rec.name}
                </span>
                <span className="text-xs text-reddit-textSecondary">
                  {rec.overlap_score} similar
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Communities */}
      <div className="card p-4">
        <h3 className="font-bold text-sm mb-3">Top Communities</h3>
        <div className="space-y-2">
          {subreddits?.slice(0, 5).map((sub, i) => (
            <Link 
              key={sub.id}
              to={`/r/${sub.name}`}
              className="flex items-center gap-3 p-2 hover:bg-reddit-dark rounded transition-colors"
            >
              <span className="text-sm text-reddit-textSecondary w-4">{i + 1}</span>
              <SubredditAvatar name={sub.name} size="sm" />
              <div className="flex-1">
                <div className="text-sm font-medium">r/{sub.name}</div>
                <div className="text-xs text-reddit-textSecondary">
                  {sub.member_count.toLocaleString()} members
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Create Community */}
      {isAuthenticated() && (
        <div className="card p-4">
          <Link 
            to="/submit?create=community"
            className="flex items-center gap-2 text-sm text-reddit-textSecondary hover:text-reddit-text transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Community
          </Link>
        </div>
      )}

      {/* DB Info */}
      <div className="card p-4 text-xs text-reddit-textSecondary">
        <div className="font-bold mb-2 text-reddit-text">Polyglot Persistence</div>
        <ul className="space-y-1">
          <li>📦 MongoDB: Users, Metadata</li>
          <li>⚡ Cassandra: Posts, Comments</li>
          <li>🔗 Neo4j: Social Graph</li>
          <li>🚀 Redis: Cache, Voting</li>
          <li>🖼️ S3: Images</li>
        </ul>
      </div>
    </div>
  )
}


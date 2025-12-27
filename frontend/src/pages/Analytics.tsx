import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../api/client'
import { useAuthStore } from '../store/auth'
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Hash, 
  TrendingUp,
  Database,
  Activity,
  Loader2
} from 'lucide-react'

export default function Analytics() {
  const { isAuthenticated } = useAuthStore()

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then(r => r.data),
  })

  const { data: topSubs } = useQuery({
    queryKey: ['analytics', 'top-subreddits'],
    queryFn: () => analyticsApi.topSubreddits().then(r => r.data),
  })

  const { data: trending } = useQuery({
    queryKey: ['analytics', 'trending'],
    queryFn: () => analyticsApi.trending().then(r => r.data),
  })

  const { data: graphStats } = useQuery({
    queryKey: ['analytics', 'graph-stats'],
    queryFn: () => analyticsApi.graphStats().then(r => r.data),
  })

  const { data: myStats } = useQuery({
    queryKey: ['analytics', 'my-stats'],
    queryFn: () => analyticsApi.myStats().then(r => r.data),
    enabled: isAuthenticated(),
  })

  if (overviewLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-reddit-orange" />
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={overview?.total_users ?? 0}
          color="text-blue-400"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Total Posts"
          value={overview?.total_posts ?? 0}
          color="text-green-400"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Total Comments"
          value={overview?.total_comments ?? 0}
          color="text-purple-400"
        />
        <StatCard
          icon={<Hash className="w-5 h-5" />}
          label="Communities"
          value={overview?.total_subreddits ?? 0}
          color="text-yellow-400"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Posts Today"
          value={overview?.posts_today ?? 0}
          color="text-reddit-orange"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Active Today"
          value={overview?.active_users_today ?? 0}
          color="text-pink-400"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Communities */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-reddit-orange" />
            Top Communities
          </h2>
          <div className="space-y-3">
            {topSubs?.map((sub, i) => (
              <div key={sub.name} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-reddit-dark rounded text-sm font-bold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="font-medium">r/{sub.name}</div>
                  <div className="text-xs text-reddit-textSecondary">
                    {sub.member_count.toLocaleString()} members • {sub.post_count} posts
                  </div>
                </div>
                <div className="w-24 bg-reddit-dark rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-reddit-orange h-full"
                    style={{ width: `${Math.min(100, (sub.member_count / (topSubs[0]?.member_count || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!topSubs || topSubs.length === 0) && (
              <p className="text-reddit-textSecondary text-sm">No data yet</p>
            )}
          </div>
        </div>

        {/* Trending */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Trending (24h)
          </h2>
          <div className="space-y-3">
            {trending?.map((item) => (
              <div key={item.subreddit} className="flex items-center justify-between p-3 bg-reddit-dark rounded">
                <div>
                  <div className="font-medium">r/{item.subreddit}</div>
                  <div className="text-xs text-reddit-textSecondary">
                    {item.post_count} new posts
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-reddit-orange font-bold">{item.vote_activity}</div>
                  <div className="text-xs text-reddit-textSecondary">votes</div>
                </div>
              </div>
            ))}
            {(!trending || trending.length === 0) && (
              <p className="text-reddit-textSecondary text-sm">No trending activity</p>
            )}
          </div>
        </div>

        {/* Graph Stats */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            Neo4j Graph Stats
          </h2>
          {graphStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-reddit-dark rounded text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {graphStats.total_nodes?.toLocaleString() ?? 0}
                  </div>
                  <div className="text-xs text-reddit-textSecondary">Total Nodes</div>
                </div>
                <div className="p-4 bg-reddit-dark rounded text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {graphStats.total_relationships?.toLocaleString() ?? 0}
                  </div>
                  <div className="text-xs text-reddit-textSecondary">Relationships</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Subscription Stats</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-reddit-dark rounded">
                    <div className="font-bold">{graphStats.subscription_stats?.min ?? 0}</div>
                    <div className="text-xs text-reddit-textSecondary">Min</div>
                  </div>
                  <div className="p-2 bg-reddit-dark rounded">
                    <div className="font-bold">{graphStats.subscription_stats?.avg ?? 0}</div>
                    <div className="text-xs text-reddit-textSecondary">Avg</div>
                  </div>
                  <div className="p-2 bg-reddit-dark rounded">
                    <div className="font-bold">{graphStats.subscription_stats?.max ?? 0}</div>
                    <div className="text-xs text-reddit-textSecondary">Max</div>
                  </div>
                </div>
              </div>

              {graphStats.most_active_users && graphStats.most_active_users.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Most Active Users</div>
                  <div className="space-y-1">
                    {graphStats.most_active_users.map((user: any) => (
                      <div key={user.username} className="flex justify-between text-sm">
                        <span>u/{user.username}</span>
                        <span className="text-reddit-textSecondary">{user.subscriptions} subs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-reddit-textSecondary text-sm">No graph data available</p>
          )}
        </div>

        {/* My Stats */}
        {isAuthenticated() && myStats && (
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-reddit-orange" />
              Your Stats
            </h2>
            <div className="space-y-4">
              <div className="text-center p-4 bg-reddit-dark rounded">
                <div className="text-3xl font-bold text-reddit-orange">{myStats.karma}</div>
                <div className="text-sm text-reddit-textSecondary">Total Karma</div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-reddit-dark rounded">
                  <div className="font-bold">{myStats.post_count}</div>
                  <div className="text-xs text-reddit-textSecondary">Posts</div>
                </div>
                <div className="p-3 bg-reddit-dark rounded">
                  <div className="font-bold">{myStats.comment_count}</div>
                  <div className="text-xs text-reddit-textSecondary">Comments</div>
                </div>
                <div className="p-3 bg-reddit-dark rounded">
                  <div className="font-bold">{myStats.subscription_count}</div>
                  <div className="text-xs text-reddit-textSecondary">Subscribed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Legend */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">Polyglot Persistence Architecture</h2>
        <div className="grid md:grid-cols-5 gap-4">
          <DBCard 
            name="MongoDB" 
            icon="📦" 
            desc="User profiles, subreddit metadata"
            color="bg-green-900/30 border-green-700"
          />
          <DBCard 
            name="Cassandra" 
            icon="⚡" 
            desc="Posts, comments (high-write)"
            color="bg-blue-900/30 border-blue-700"
          />
          <DBCard 
            name="Neo4j" 
            icon="🔗" 
            desc="Social graph, recommendations"
            color="bg-purple-900/30 border-purple-700"
          />
          <DBCard 
            name="Redis" 
            icon="🚀" 
            desc="Cache, voting, hot rankings"
            color="bg-red-900/30 border-red-700"
          />
          <DBCard 
            name="S3/MinIO" 
            icon="🖼️" 
            desc="Image storage"
            color="bg-yellow-900/30 border-yellow-700"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-reddit-textSecondary">{label}</div>
    </div>
  )
}

function DBCard({ name, icon, desc, color }: { name: string; icon: string; desc: string; color: string }) {
  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-bold">{name}</div>
      <div className="text-xs text-reddit-textSecondary">{desc}</div>
    </div>
  )
}


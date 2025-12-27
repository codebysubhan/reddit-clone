import { useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useSearchParams } from 'react-router-dom'
import { postApi } from '../api/client'
import PostCard from '../components/PostCard'
import SubredditSidebar from '../components/SubredditSidebar'
import { Flame, Clock, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

type SortOption = 'hot' | 'new' | 'top'

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = (searchParams.get('sort') as SortOption) || 'hot'
  
  const handleSortChange = (newSort: SortOption) => {
    setSearchParams({ sort: newSort })
  }
  const { ref, inView } = useInView()
  const queryClient = useQueryClient()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['posts', 'feed', sort],
    queryFn: ({ pageParam }) => 
      postApi.feed({ sort, cursor: pageParam, limit: 15 }).then(r => r.data),
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.next_cursor : undefined,
    initialPageParam: undefined as string | undefined,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'feed', sort] })
    refetch()
  }

  const posts = data?.pages.flatMap(page => page.posts) ?? []

  const sortOptions: { key: SortOption; label: string; icon: typeof Flame }[] = [
    { key: 'hot', label: 'Hot', icon: Flame },
    { key: 'new', label: 'New', icon: Clock },
    { key: 'top', label: 'Top', icon: TrendingUp },
  ]

  return (
    <div className="flex gap-6">
      {/* Main Feed */}
      <div className="flex-1 min-w-0">
        {/* Sort Tabs */}
        <div className="bg-reddit-card border border-reddit-border rounded-lg p-2 mb-4">
          <div className="flex items-center gap-2">
            {sortOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleSortChange(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  sort === key 
                    ? 'bg-reddit-dark text-reddit-text' 
                    : 'text-reddit-textSecondary hover:bg-reddit-dark/50 hover:text-reddit-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="ml-auto p-2 rounded-full text-reddit-textSecondary hover:bg-reddit-dark/50 hover:text-reddit-text transition-colors disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-reddit-orange" />
            <p className="text-reddit-textSecondary">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-reddit-card border border-reddit-border rounded-lg p-12 text-center">
            <Flame className="w-16 h-16 mx-auto text-reddit-orange mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-reddit-text mb-2">No posts yet</h2>
            <p className="text-reddit-textSecondary">Be the first to create a post!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <PostCard key={`${post.id}-${index}`} post={post} />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={ref} className="py-6 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-reddit-textSecondary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-sm text-reddit-textSecondary">You've reached the end!</p>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-16">
          <SubredditSidebar />
        </div>
      </aside>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { subredditApi, postApi } from '../api/client'
import PostCard from '../components/PostCard'
import SubredditSidebar from '../components/SubredditSidebar'
import { Flame, Clock, Loader2 } from 'lucide-react'

export default function Subreddit() {
  const { name } = useParams<{ name: string }>()
  const [sort, setSort] = useState<'hot' | 'new'>('hot')
  const { ref, inView } = useInView()

  const { data: subreddit, isLoading: subLoading } = useQuery({
    queryKey: ['subreddit', name],
    queryFn: () => subredditApi.get(name!).then(r => r.data),
    enabled: !!name,
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
  } = useInfiniteQuery({
    queryKey: ['posts', 'subreddit', subreddit?.id, sort],
    queryFn: ({ pageParam }) => 
      postApi.feed({ subreddit_id: subreddit!.id, sort, cursor: pageParam, limit: 10 }).then(r => r.data),
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.next_cursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!subreddit?.id,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap(page => page.posts) ?? []

  if (subLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
      </div>
    )
  }

  if (!subreddit) {
    return (
      <div className="card p-12 text-center">
        <h2 className="text-xl font-bold mb-2">Subreddit not found</h2>
        <p className="text-reddit-textSecondary">r/{name} doesn't exist yet.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Banner */}
      <div className="card mb-4 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-reddit-orange to-reddit-orangeLight" />
        <div className="p-4">
          <h1 className="text-2xl font-bold">r/{subreddit.name}</h1>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Feed */}
        <div className="flex-1 space-y-4">
          {/* Sort Tabs */}
          <div className="card flex gap-2 p-2">
            <button
              onClick={() => setSort('hot')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                sort === 'hot' 
                  ? 'bg-reddit-dark text-reddit-text' 
                  : 'text-reddit-textSecondary hover:bg-reddit-dark'
              }`}
            >
              <Flame className="w-4 h-4" />
              Hot
            </button>
            <button
              onClick={() => setSort('new')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                sort === 'new' 
                  ? 'bg-reddit-dark text-reddit-text' 
                  : 'text-reddit-textSecondary hover:bg-reddit-dark'
              }`}
            >
              <Clock className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Posts */}
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
            </div>
          ) : posts.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-reddit-textSecondary">No posts in this community yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="py-4 flex justify-center">
            {isFetchingNextPage && (
              <Loader2 className="w-6 h-6 animate-spin text-reddit-orange" />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-80">
          <SubredditSidebar currentSubreddit={subreddit} />
        </aside>
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api/client'
import PostCard from '../components/PostCard'
import { Search as SearchIcon, Users, MessageSquare, Loader2 } from 'lucide-react'
import { SubredditAvatar, UserAvatar } from '../components/Avatar'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const tab = searchParams.get('tab') || 'posts'
  const sort = searchParams.get('sort') || 'relevance'

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['search', 'posts', query, sort],
    queryFn: () => searchApi.posts(query, { sort, limit: 25 }),
    enabled: !!query && tab === 'posts',
  })

  const { data: subredditsData, isLoading: subredditsLoading } = useQuery({
    queryKey: ['search', 'subreddits', query],
    queryFn: () => searchApi.subreddits(query, 20),
    enabled: !!query && tab === 'communities',
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['search', 'users', query],
    queryFn: () => searchApi.users(query, 20),
    enabled: !!query && tab === 'people',
  })

  const setTab = (newTab: string) => {
    setSearchParams({ q: query, tab: newTab, sort })
  }

  const setSort = (newSort: string) => {
    setSearchParams({ q: query, tab, sort: newSort })
  }

  if (!query) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <SearchIcon className="w-16 h-16 mx-auto text-reddit-textSecondary mb-4" />
        <h1 className="text-2xl font-bold text-reddit-text mb-2">Search Reddit Clone</h1>
        <p className="text-reddit-textSecondary">Use the search bar above to find posts, communities, and users</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-reddit-border">
        <button
          onClick={() => setTab('posts')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            tab === 'posts'
              ? 'text-reddit-text'
              : 'text-reddit-textSecondary hover:text-reddit-text'
          }`}
        >
          Posts
          {tab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-reddit-orange" />
          )}
        </button>
        <button
          onClick={() => setTab('communities')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            tab === 'communities'
              ? 'text-reddit-text'
              : 'text-reddit-textSecondary hover:text-reddit-text'
          }`}
        >
          Communities
          {tab === 'communities' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-reddit-orange" />
          )}
        </button>
        <button
          onClick={() => setTab('people')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            tab === 'people'
              ? 'text-reddit-text'
              : 'text-reddit-textSecondary hover:text-reddit-text'
          }`}
        >
          People
          {tab === 'people' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-reddit-orange" />
          )}
        </button>
      </div>

      {/* Sort options for posts */}
      {tab === 'posts' && (
        <div className="flex gap-2 mb-4">
          {['relevance', 'new', 'top'].map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sort === s
                  ? 'bg-reddit-text text-reddit-dark'
                  : 'bg-reddit-dark/50 text-reddit-textSecondary hover:bg-reddit-dark'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {/* Posts */}
        {tab === 'posts' && (
          <>
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
              </div>
            ) : postsData?.data?.posts?.length ? (
              postsData.data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-12 text-reddit-textSecondary">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No posts found for "{query}"</p>
              </div>
            )}
          </>
        )}

        {/* Communities */}
        {tab === 'communities' && (
          <>
            {subredditsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
              </div>
            ) : subredditsData?.data?.subreddits?.length ? (
              <div className="space-y-2">
                {subredditsData.data.subreddits.map((sub: any) => (
                  <Link
                    key={sub.id}
                    to={`/r/${sub.name}`}
                    className="block card p-4 hover:border-reddit-textSecondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SubredditAvatar name={sub.name} size="lg" />
                      <div>
                        <h3 className="font-medium text-reddit-text">r/{sub.name}</h3>
                        <p className="text-sm text-reddit-textSecondary">
                          {sub.member_count.toLocaleString()} members
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-reddit-textSecondary">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No communities found for "{query}"</p>
              </div>
            )}
          </>
        )}

        {/* People */}
        {tab === 'people' && (
          <>
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
              </div>
            ) : usersData?.data?.users?.length ? (
              <div className="space-y-2">
                {usersData.data.users.map((user: any) => (
                  <div
                    key={user.id}
                    className="card p-4 flex items-center gap-3"
                  >
                    <UserAvatar username={user.username} size="lg" />
                    <div>
                      <h3 className="font-medium text-reddit-text">u/{user.username}</h3>
                      <p className="text-sm text-reddit-textSecondary">
                        {user.karma.toLocaleString()} karma
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-reddit-textSecondary">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No users found for "{query}"</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


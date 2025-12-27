import axios from 'axios'
import { useAuthStore } from '../store/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// Types
export interface User {
  id: string
  username: string
  email: string
  karma: number
  created_at: string
}

export interface Subreddit {
  id: string
  name: string
  description: string
  member_count: number
  created_at: string
  creator_id: string
  is_member: boolean
}

export interface Post {
  id: string
  title: string
  content: string | null
  subreddit_id: string
  subreddit_name: string
  author_id: string
  author_username: string
  image_url: string | null
  vote_count: number
  comment_count: number
  user_vote: number | null
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  content: string
  author_id: string
  author_username: string
  parent_id: string | null
  depth: number
  vote_count: number
  user_vote: number | null
  created_at: string
}

export interface PostFeed {
  posts: Post[]
  next_cursor: string | null
  has_more: boolean
}

export interface Analytics {
  total_users: number
  total_posts: number
  total_comments: number
  total_subreddits: number
  posts_today: number
  active_users_today: number
}

export interface SubredditRecommendation {
  id: string
  name: string
  description: string
  member_count: number
  overlap_score: number
}

// API Functions
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<{ access_token: string }>('/users/register', data),
  login: (data: { username: string; password: string }) =>
    api.post<{ access_token: string }>('/users/login', data),
  me: (token?: string) => api.get<User>('/users/me', token ? {
    headers: { Authorization: `Bearer ${token}` }
  } : undefined),
  update: (data: { display_name?: string; email?: string; current_password?: string; new_password?: string }) =>
    api.patch<User>('/users/me', data),
  delete: (password: string) =>
    api.delete('/users/me', { data: { password } }),
  getProfile: (username: string) => api.get(`/users/${username}`),
}

export const subredditApi = {
  list: () => api.get<Subreddit[]>('/subreddits'),
  get: (name: string) => api.get<Subreddit>(`/subreddits/r/${name}`),
  create: (data: { name: string; description: string }) =>
    api.post<Subreddit>('/subreddits', data),
  update: (id: string, data: { description: string }) =>
    api.patch<Subreddit>(`/subreddits/${id}`, data),
  delete: (id: string) => api.delete(`/subreddits/${id}`),
  join: (id: string) => api.post(`/subreddits/${id}/join`),
  leave: (id: string) => api.post(`/subreddits/${id}/leave`),
  recommendations: () => api.get<SubredditRecommendation[]>('/subreddits/recommendations/for-me'),
}

export const postApi = {
  feed: (params: { subreddit_id?: string; sort?: string; cursor?: string; limit?: number }) =>
    api.get<PostFeed>('/posts/feed', { params }),
  get: (id: string) => api.get<Post>(`/posts/${id}`),
  create: (data: { title: string; content?: string; subreddit_id: string; image_url?: string }) =>
    api.post<Post>('/posts', data),
  update: (id: string, data: { title?: string; content?: string }) =>
    api.patch<Post>(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  vote: (id: string, vote: number) => api.post(`/posts/${id}/vote`, { vote }),
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ image_url: string }>('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const commentApi = {
  list: (postId: string) => api.get<Comment[]>(`/posts/${postId}/comments`),
  create: (postId: string, data: { content: string; parent_id?: string }) =>
    api.post<Comment>(`/posts/${postId}/comments`, data),
  update: (postId: string, commentId: string, content: string) =>
    api.patch<Comment>(`/posts/${postId}/comments/${commentId}`, { content }),
  delete: (postId: string, commentId: string) =>
    api.delete(`/posts/${postId}/comments/${commentId}`),
  vote: (postId: string, commentId: string, vote: number) =>
    api.post(`/posts/${postId}/comments/${commentId}/vote`, { vote }),
}

export interface SearchResult {
  posts: Post[]
  total: number
}

export interface SearchAllResult {
  posts: { id: string; title: string; subreddit_name: string; vote_count: number; comment_count: number }[]
  subreddits: { id: string; name: string; member_count: number }[]
  users: { id: string; username: string; karma: number }[]
}

export const searchApi = {
  posts: (q: string, params?: { subreddit?: string; sort?: string; limit?: number }) =>
    api.get<SearchResult>('/search/posts', { params: { q, ...params } }),
  subreddits: (q: string, limit?: number) =>
    api.get('/search/subreddits', { params: { q, limit } }),
  users: (q: string, limit?: number) =>
    api.get('/search/users', { params: { q, limit } }),
  all: (q: string, limit?: number) =>
    api.get<SearchAllResult>('/search/all', { params: { q, limit } }),
}

export const analyticsApi = {
  overview: () => api.get<Analytics>('/analytics/overview'),
  topSubreddits: () => api.get<{ name: string; member_count: number; post_count: number }[]>('/analytics/top-subreddits'),
  trending: () => api.get<{ subreddit: string; post_count: number; vote_activity: number }[]>('/analytics/trending'),
  graphStats: () => api.get('/analytics/user-graph-stats'),
  myStats: () => api.get('/analytics/my-stats'),
}


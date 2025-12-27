import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subredditApi, postApi } from '../api/client'
import { useAuthStore } from '../store/auth'
import { 
  Image, 
  FileText, 
  Loader2, 
  X, 
  ChevronDown,
  Link2,
  AlertCircle,
  Sparkles,
  Users,
  Check,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SubredditAvatar, UserAvatar } from '../components/Avatar'

export default function CreatePost() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSelectedSub = searchParams.get('subreddit')
  const isCreatingCommunity = searchParams.get('create') === 'community'
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()

  // Post state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subredditId, setSubredditId] = useState('')
  const [selectedSubName, setSelectedSubName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [postType, setPostType] = useState<'text' | 'image' | 'link'>('text')
  const [linkUrl, setLinkUrl] = useState('')
  const [showSubDropdown, setShowSubDropdown] = useState(false)
  const [subSearch, setSubSearch] = useState('')

  // Community state
  const [communityName, setCommunityName] = useState('')
  const [communityDesc, setCommunityDesc] = useState('')

  const { data: subreddits } = useQuery({
    queryKey: ['subreddits'],
    queryFn: () => subredditApi.list().then(r => r.data),
  })

  const filteredSubreddits = subreddits?.filter(sub => 
    sub.name.toLowerCase().includes(subSearch.toLowerCase())
  )

  const uploadMutation = useMutation({
    mutationFn: (file: File) => postApi.uploadImage(file),
  })

  const postMutation = useMutation({
    mutationFn: async (data: { title: string; content?: string; subreddit_id: string; image_url?: string }) => {
      let image_url = data.image_url
      if (imageFile) {
        const result = await uploadMutation.mutateAsync(imageFile)
        image_url = result.data.image_url
      }
      return postApi.create({ ...data, image_url })
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post created successfully!')
      navigate(`/post/${response.data.id}`)
    },
    onError: () => {
      toast.error('Failed to create post')
    },
  })

  const communityMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => subredditApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] })
      toast.success('Community created!')
      navigate(`/r/${response.data.name}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create community')
    },
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSelectSubreddit = (id: string, name: string) => {
    setSubredditId(id)
    setSelectedSubName(name)
    setShowSubDropdown(false)
    setSubSearch('')
  }

  const handleSubmitPost = () => {
    if (!title.trim()) {
      toast.error('Please add a title')
      return
    }
    if (!subredditId) {
      toast.error('Please select a community')
      return
    }
    
    const finalContent = postType === 'link' ? linkUrl : content
    
    postMutation.mutate({
      title,
      content: finalContent || undefined,
      subreddit_id: subredditId,
    })
  }

  const handleSubmitCommunity = () => {
    if (!communityName.trim() || !communityDesc.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    communityMutation.mutate({
      name: communityName,
      description: communityDesc,
    })
  }

  if (!isAuthenticated()) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="bg-gradient-to-br from-reddit-card to-reddit-dark border border-reddit-border rounded-2xl p-10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-reddit-orange to-red-600 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-reddit-text">Login Required</h2>
          <p className="text-reddit-textSecondary mb-8">Join the conversation! Login to create posts and communities.</p>
          <div className="flex gap-4 justify-center">
            <Link to="/login" className="btn-primary px-8 py-3 text-lg">Log In</Link>
            <Link to="/register" className="btn-secondary px-8 py-3 text-lg">Sign Up</Link>
          </div>
        </div>
      </div>
    )
  }

  if (isCreatingCommunity) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4">
        <div className="bg-reddit-card border border-reddit-border rounded-2xl overflow-hidden shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-reddit-orange via-orange-500 to-red-600 p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Create a Community</h1>
                <p className="text-white/80">Build your own corner of Reddit Clone</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3 text-reddit-text">Community Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-reddit-textSecondary font-medium text-lg">r/</span>
                <input
                  type="text"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="community_name"
                  className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-4 pl-10 pr-4 text-reddit-text text-lg placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
                  maxLength={21}
                />
              </div>
              <p className="text-xs text-reddit-textSecondary mt-2 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Only letters, numbers, and underscores. Cannot be changed later.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 text-reddit-text">Description</label>
              <textarea
                value={communityDesc}
                onChange={(e) => setCommunityDesc(e.target.value)}
                placeholder="What is this community about?"
                className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl p-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-reddit-textSecondary mt-2 text-right">
                {communityDesc.length}/500
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-4 rounded-xl border-2 border-reddit-border text-reddit-textSecondary hover:text-reddit-text hover:border-reddit-textSecondary transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCommunity}
                disabled={communityMutation.isPending || !communityName.trim() || !communityDesc.trim()}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-reddit-orange to-red-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {communityMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Community
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex gap-8">
        {/* Main Form */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-reddit-text">Create a post</h1>
            <Link 
              to="/submit?create=community" 
              className="text-sm text-reddit-blue hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Create a community
            </Link>
          </div>

          {/* Community Selector */}
          <div className="relative mb-6">
            <button
              onClick={() => setShowSubDropdown(!showSubDropdown)}
              className={`w-full bg-reddit-card border-2 rounded-xl p-4 flex items-center justify-between transition-all ${
                showSubDropdown ? 'border-reddit-orange' : 'border-reddit-border hover:border-reddit-textSecondary'
              }`}
            >
              {selectedSubName ? (
                <div className="flex items-center gap-3">
                  <SubredditAvatar name={selectedSubName} size="md" />
                  <div className="text-left">
                    <span className="font-semibold text-reddit-text text-lg">r/{selectedSubName}</span>
                    <p className="text-xs text-reddit-textSecondary">
                      {subreddits?.find(s => s.name === selectedSubName)?.member_count.toLocaleString()} members
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-reddit-dark flex items-center justify-center">
                    <Search className="w-4 h-4 text-reddit-textSecondary" />
                  </div>
                  <span className="text-reddit-textSecondary">Choose a community</span>
                </div>
              )}
              <ChevronDown className={`w-6 h-6 text-reddit-textSecondary transition-transform ${showSubDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showSubDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSubDropdown(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1b] border-2 border-reddit-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-reddit-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-reddit-textSecondary" />
                      <input
                        type="text"
                        value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                        placeholder="Search communities..."
                        className="w-full bg-reddit-dark border border-reddit-border rounded-lg py-2 pl-10 pr-4 text-sm text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-blue"
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* List */}
                  <div className="max-h-72 overflow-y-auto">
                    {filteredSubreddits?.length === 0 ? (
                      <div className="p-6 text-center text-reddit-textSecondary">
                        No communities found
                      </div>
                    ) : (
                      filteredSubreddits?.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubreddit(sub.id, sub.name)}
                          className="w-full flex items-center gap-4 p-4 bg-[#1a1a1b] hover:bg-[#272729] transition-colors"
                        >
                          <SubredditAvatar name={sub.name} size="md" />
                          <div className="text-left flex-1">
                            <div className="font-semibold text-reddit-text">r/{sub.name}</div>
                            <div className="text-xs text-reddit-textSecondary">
                              {sub.member_count.toLocaleString()} members
                            </div>
                          </div>
                          {subredditId === sub.id && (
                            <div className="w-6 h-6 rounded-full bg-reddit-orange flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Post Card */}
          <div className="bg-reddit-card border border-reddit-border rounded-xl overflow-hidden shadow-lg">
            {/* Post Type Tabs */}
            <div className="flex border-b border-reddit-border bg-reddit-dark/30">
              {[
                { type: 'text', icon: FileText, label: 'Post' },
                { type: 'image', icon: Image, label: 'Image' },
                { type: 'link', icon: Link2, label: 'Link' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setPostType(type as typeof postType)}
                  className={`flex-1 flex items-center justify-center gap-3 py-5 font-semibold transition-all relative ${
                    postType === type
                      ? 'text-reddit-text bg-reddit-card'
                      : 'text-reddit-textSecondary hover:text-reddit-text hover:bg-reddit-dark/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${postType === type ? 'text-reddit-orange' : ''}`} />
                  <span>{label}</span>
                  {postType === type && (
                    <div className="absolute bottom-0 left-4 right-4 h-1 bg-reddit-orange rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="An interesting title..."
                  className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl p-4 text-reddit-text text-lg font-medium placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
                  maxLength={300}
                />
                <div className="flex justify-end mt-2">
                  <span className={`text-xs font-medium ${title.length > 280 ? 'text-reddit-orange' : 'text-reddit-textSecondary'}`}>
                    {title.length}/300
                  </span>
                </div>
              </div>

              {/* Content based on type */}
              {postType === 'text' && (
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Text (optional)"
                    className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl p-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors resize-none min-h-[180px]"
                    rows={6}
                  />
                </div>
              )}

              {postType === 'image' && (
                <div>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden bg-black/30 border-2 border-reddit-border">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-[350px] w-full object-contain"
                      />
                      <button
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                        }}
                        className="absolute top-4 right-4 p-2 bg-black/80 hover:bg-red-600 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="block border-2 border-dashed border-reddit-border rounded-xl p-16 text-center cursor-pointer hover:border-reddit-orange hover:bg-reddit-dark/50 transition-all group">
                      <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-reddit-dark to-reddit-card flex items-center justify-center group-hover:from-reddit-orange/20 group-hover:to-red-600/20 transition-colors">
                        <Image className="w-10 h-10 text-reddit-textSecondary group-hover:text-reddit-orange transition-colors" />
                      </div>
                      <p className="text-reddit-text font-semibold text-lg mb-2">Drop an image here</p>
                      <p className="text-reddit-textSecondary">or click to browse</p>
                      <p className="text-xs text-reddit-textSecondary mt-3">PNG, JPG, GIF up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {postType === 'link' && (
                <div>
                  <div className="relative">
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-reddit-textSecondary" />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Paste your link here..."
                      className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-4 pl-12 pr-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-reddit-border p-5 bg-reddit-dark/30 flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 rounded-xl text-reddit-textSecondary hover:text-reddit-text hover:bg-reddit-dark transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={postMutation.isPending || !title.trim() || !subredditId}
                className="px-10 py-3 rounded-xl bg-gradient-to-r from-reddit-orange to-red-600 text-white font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {postMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-80">
          <div className="bg-reddit-card border border-reddit-border rounded-xl overflow-hidden sticky top-20">
            {/* User Card */}
            <div className="bg-gradient-to-r from-reddit-orange/20 to-red-600/20 p-5 border-b border-reddit-border">
              <div className="flex items-center gap-4">
                <UserAvatar username={user?.username || ''} size="xl" />
                <div>
                  <div className="font-bold text-lg text-reddit-text">u/{user?.username}</div>
                  <div className="text-sm text-reddit-orange font-medium">{user?.karma?.toLocaleString()} karma</div>
                </div>
              </div>
            </div>
            
            {/* Guidelines */}
            <div className="p-5">
              <h3 className="font-bold text-reddit-text mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-reddit-orange" />
                Posting Guidelines
              </h3>
              <ul className="space-y-3">
                {[
                  'Remember the human',
                  'Search before posting',
                  'Use descriptive titles',
                  'Credit original creators',
                  'Be respectful to others',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span className="text-reddit-textSecondary">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

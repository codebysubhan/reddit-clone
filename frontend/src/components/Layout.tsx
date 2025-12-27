import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { 
  Home, 
  PlusCircle, 
  BarChart3, 
  LogOut, 
  Flame,
  Search,
  TrendingUp,
  Menu,
  X
} from 'lucide-react'
import { UserAvatar } from './Avatar'

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-reddit-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-reddit-darkLight border-b border-reddit-border">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-reddit-orange rounded-full flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-reddit-text hidden md:block">
              reddit<span className="text-reddit-orange">clone</span>
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-reddit-textSecondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Reddit Clone"
                className="w-full bg-reddit-dark border border-reddit-border rounded-full py-1.5 pl-10 pr-4 text-sm text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-blue focus:bg-reddit-darkLight transition-colors"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-reddit-dark rounded-md transition-colors text-reddit-textSecondary hover:text-reddit-text"
              title="Home"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Home</span>
            </Link>
            
            <Link 
              to="/?sort=hot" 
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-reddit-dark rounded-md transition-colors text-reddit-textSecondary hover:text-reddit-text"
              title="Popular"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Popular</span>
            </Link>
            
            {isAuthenticated() && (
              <Link 
                to="/submit" 
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-reddit-dark rounded-md transition-colors text-reddit-textSecondary hover:text-reddit-text"
                title="Create Post"
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Create</span>
              </Link>
            )}
            
            <Link 
              to="/analytics" 
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-reddit-dark rounded-md transition-colors text-reddit-textSecondary hover:text-reddit-text"
              title="Analytics"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">Analytics</span>
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {isAuthenticated() ? (
              <div className="flex items-center gap-2">
                <Link 
                  to={`/u/${user?.username}`}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-reddit-dark hover:bg-reddit-border rounded-full border border-reddit-border transition-colors"
                >
                  <UserAvatar username={user?.username || ''} size="sm" />
                  <div className="text-sm">
                    <span className="font-medium text-reddit-text">{user?.username}</span>
                    <span className="text-reddit-orange ml-2">{user?.karma?.toLocaleString()} karma</span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-reddit-dark rounded-md transition-colors text-reddit-textSecondary hover:text-reddit-text"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">
                  Log In
                </Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-4 hidden sm:block">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-reddit-dark rounded-md transition-colors md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-reddit-border bg-reddit-darkLight">
            <nav className="p-4 space-y-2">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-reddit-dark rounded-md transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
              <Link 
                to="/?sort=hot" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-reddit-dark rounded-md transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Popular</span>
              </Link>
              {isAuthenticated() && (
                <Link 
                  to="/submit" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-reddit-dark rounded-md transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Create Post</span>
                </Link>
              )}
              <Link 
                to="/analytics" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-reddit-dark rounded-md transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Analytics</span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}

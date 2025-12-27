import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi, api } from '../api/client'
import { useAuthStore } from '../store/auth'
import { Loader2, Flame } from 'lucide-react'
import toast from 'react-hot-toast'

// Google Icon SVG
function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Check for OAuth errors
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(`Login failed: ${error.replace(/_/g, ' ')}`)
    }
  }, [searchParams])

  // Check if Google OAuth is enabled
  const { data: oauthStatus } = useQuery({
    queryKey: ['oauth-status'],
    queryFn: () => api.get('/auth/google/status').then(r => r.data),
    retry: false,
    staleTime: Infinity,
  })

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ username, password }),
    onSuccess: async (response) => {
      const token = response.data.access_token
      const userResponse = await authApi.me(token)
      setAuth(token, userResponse.data)
      toast.success('Welcome back!')
      navigate('/')
    },
    onError: () => {
      toast.error('Invalid username or password')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = 'http://localhost:8000/api/auth/google/login'
  }

  return (
    <div className="max-w-sm mx-auto mt-12 px-4">
      <div className="bg-reddit-card border border-reddit-border rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-reddit-orange to-red-600 rounded-full flex items-center justify-center">
            <Flame className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-reddit-text">Welcome Back</h1>
        <p className="text-center text-reddit-textSecondary text-sm mb-6">
          Log in to your account
        </p>

        {/* Google Sign In */}
        {oauthStatus?.enabled && (
          <>
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-300 transition-colors"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-reddit-border"></div>
              <span className="text-reddit-textSecondary text-xs uppercase">or</span>
              <div className="flex-1 h-px bg-reddit-border"></div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-3 px-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-3 px-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-reddit-orange to-red-600 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/forgot-password" className="text-sm text-reddit-blue hover:underline">
            Forgot password?
          </Link>
        </div>

        <p className="text-center text-sm text-reddit-textSecondary mt-4">
          New to Reddit Clone?{' '}
          <Link to="/register" className="text-reddit-blue hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}

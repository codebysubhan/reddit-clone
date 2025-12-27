import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Loader2, Lock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)

  // Verify token is valid
  const { isLoading: verifying, isError: tokenInvalid } = useQuery({
    queryKey: ['verify-token', token],
    queryFn: () => api.get(`/password/verify-token/${token}`),
    enabled: !!token,
    retry: false,
  })

  const resetMutation = useMutation({
    mutationFn: () => api.post('/password/reset', { token, new_password: password }),
    onSuccess: () => {
      setSuccess(true)
      toast.success('Password reset successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to reset password')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    resetMutation.mutate()
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto mt-12 px-4">
        <div className="bg-reddit-card border border-reddit-border rounded-2xl p-8 text-center shadow-xl">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-3 text-reddit-text">Invalid Link</h1>
          <p className="text-reddit-textSecondary mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block">
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  if (verifying) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-reddit-orange" />
      </div>
    )
  }

  if (tokenInvalid) {
    return (
      <div className="max-w-sm mx-auto mt-12 px-4">
        <div className="bg-reddit-card border border-reddit-border rounded-2xl p-8 text-center shadow-xl">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-3 text-reddit-text">Link Expired</h1>
          <p className="text-reddit-textSecondary mb-6">
            This password reset link has expired. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block">
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-12 px-4">
        <div className="bg-reddit-card border border-reddit-border rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-reddit-text">Password Reset!</h1>
          <p className="text-reddit-textSecondary mb-6">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Link
            to="/login"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-reddit-orange to-red-600 text-white font-bold inline-block text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-12 px-4">
      <div className="bg-reddit-card border border-reddit-border rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-reddit-orange/20 to-red-600/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-reddit-orange" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-reddit-text">Set New Password</h1>
        <p className="text-center text-reddit-textSecondary text-sm mb-6">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-3 px-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
              required
              minLength={6}
            />
          </div>

          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-3 px-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-reddit-orange to-red-600 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {resetMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-reddit-textSecondary hover:text-reddit-text"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}


import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const forgotMutation = useMutation({
    mutationFn: () => api.post('/password/forgot', { email }),
    onSuccess: () => {
      setSubmitted(true)
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotMutation.mutate()
  }

  if (submitted) {
    return (
      <div className="max-w-sm mx-auto mt-12 px-4">
        <div className="bg-reddit-card border border-reddit-border rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-reddit-text">Check Your Email</h1>
          <p className="text-reddit-textSecondary mb-6">
            If an account exists with <strong>{email}</strong>, you'll receive a password reset link shortly.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-reddit-blue hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
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
            <Mail className="w-8 h-8 text-reddit-orange" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-reddit-text">Forgot Password?</h1>
        <p className="text-center text-reddit-textSecondary text-sm mb-6">
          Enter your email and we'll send you a reset link
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-reddit-dark border-2 border-reddit-border rounded-xl py-3 px-4 text-reddit-text placeholder-reddit-textSecondary focus:outline-none focus:border-reddit-orange transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={forgotMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-reddit-orange to-red-600 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {forgotMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Send Reset Link'
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


import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { authApi } from '../api/client'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')

      if (error) {
        toast.error(`Login failed: ${error}`)
        navigate('/login')
        return
      }

      if (token) {
        try {
          // Fetch user info with the token
          const response = await authApi.me(token)
          setAuth(token, response.data)
          toast.success('Welcome back!')
          navigate('/')
        } catch (err) {
          toast.error('Failed to authenticate')
          navigate('/login')
        }
      } else {
        toast.error('No authentication token received')
        navigate('/login')
      }
    }

    handleCallback()
  }, [searchParams, navigate, setAuth])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-reddit-orange mb-4" />
      <p className="text-reddit-textSecondary text-lg">Completing sign in...</p>
    </div>
  )
}


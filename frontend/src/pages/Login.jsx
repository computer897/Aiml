import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, CheckCircle2 } from 'lucide-react'
import { authAPI } from '../services/api'

function Login({ setUser }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login(email, password)
      const userData = {
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
        name: response.user.name,
        token: response.access_token
      }
      setUser(userData)
      if (userData.role === 'student') {
        navigate('/student-dashboard')
      } else {
        navigate('/teacher-dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="hidden sm:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-10 w-96 h-96 bg-blue-300/5 rounded-full blur-3xl" />
        </div>

        {/* Header with logo and security badge */}
        <div className="relative">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-2xl font-bold text-white">VC ROOM</h1>
              <p className="text-blue-200 text-xs tracking-wide mt-1">Virtual Classroom Platform</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-blue-100 text-xs font-medium">
              <Shield className="w-3 h-3 inline mr-1" />
              SECURE GATEWAY
            </div>
          </div>

          {/* Status badges */}
          <div className="space-y-2 mb-12">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full px-4 py-2.5">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white font-semibold text-sm">LIVE MONITORING</span>
              <span className="text-white/80 text-xs">ACTIVE</span>
            </div>
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-300" />
              <span className="text-white font-semibold text-sm">ENROLLMENT</span>
              <span className="text-white/80 text-xs">VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            The Intelligent<br />Classroom Platform
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed pr-4">
            VC Room ensures integrity and focus, providing real-time engagement analytics for modern education.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-blue-200 space-x-4">
          <span>© 2024 VC Room</span>
          <button className="hover:text-white transition">Privacy Policy</button>
          <button className="hover:text-white transition">Terms of Service</button>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
        {/* Desktop header */}
        <div className="hidden sm:flex w-full max-w-md justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">VC ROOM</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Virtual Classroom</p>
          </div>
          <div className="text-right text-xs">
            <div className="text-gray-500 dark:text-gray-400">Need Help?</div>
            <button className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Support</button>
          </div>
        </div>

        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">Welcome Back</h2>
            <p className="text-gray-600 dark:text-gray-400 text-base">Sign in to access your classroom.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                EMAIL ID
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institute.edu"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  PASSWORD
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-12 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-3 p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 rounded-lg">
            <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span className="text-sm text-cyan-900 dark:text-cyan-200">
              <span className="font-semibold">VC Room Protection</span> Enabled
            </span>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

        {/* Mobile footer */}
        <div className="sm:hidden text-center mt-8 text-xs text-gray-500 space-y-2">
          <p>© 2024 VC Room • The Intelligent Classroom</p>
          <div className="flex gap-4 justify-center">
            <button className="hover:text-gray-700 transition">Privacy</button>
            <button className="hover:text-gray-700 transition">Terms</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

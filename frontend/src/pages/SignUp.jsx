import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Shield, CheckCircle2, Building2 } from 'lucide-react'
import { authAPI } from '../services/api'

function SignUp({ setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    institution: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      setLoading(false)
      return
    }

    try {
      await authAPI.register(formData.name, formData.email, formData.password, formData.role)
      const loginResponse = await authAPI.login(formData.email, formData.password)
      const userData = {
        id: loginResponse.user.id,
        email: loginResponse.user.email,
        role: loginResponse.user.role,
        name: loginResponse.user.name,
        token: loginResponse.access_token
      }
      setUser(userData)
      if (userData.role === 'student') {
        navigate('/student-dashboard')
      } else {
        navigate('/teacher-dashboard')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
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

        {/* Header */}
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
              <span className="text-white font-semibold text-sm">AI MONITORING</span>
              <span className="text-white/80 text-xs">Securing Educational Integrity</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Join VC Room
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Create your account and access our intelligent classroom platform with real-time monitoring and secure enrollment.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 pt-4">
            {[
              'Interactive Virtual Classrooms',
              'Private & Secure Learning',
              'Real-time Engagement Analytics'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-5 h-5 text-cyan-300 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
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
          <Link to="/login" className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
            ← Back to Login
          </Link>
        </div>

        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">Create Account</h2>
            <p className="text-gray-600 dark:text-gray-400 text-base">Please provide your institutional credentials.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I AM A</label>
              <div className="grid grid-cols-2 gap-3">
                {['student', 'teacher'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={`py-3 px-4 rounded-lg font-medium text-sm transition-all border-2 ${
                      formData.role === role
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="capitalize font-semibold">{role === 'student' ? 'Student' : 'Instructor'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                FULL NAME
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <User className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Julian Casablancas"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
              </div>
            </div>

            {/* Email */}
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
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@college.edu"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                DEPARTMENT
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Building2 className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Computer Science"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
              </div>
            </div>

            {/* Institution */}
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                COLLEGE / UNIVERSITY
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Building2 className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="institution"
                  name="institution"
                  type="text"
                  value={formData.institution}
                  onChange={handleChange}
                  placeholder="Institute of Technology"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                PASSWORD
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Minimum 8 characters with one special symbol.</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CONFIRM PASSWORD
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Register
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* Mobile footer */}
        <div className="sm:hidden text-center mt-8 text-xs text-gray-500 space-y-2">
          <p>© 2024 VC Room • The Intelligent Classroom</p>
          <div className="flex gap-4 justify-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-700 transition">← Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight, BookOpen, Users } from 'lucide-react'
import { authAPI } from '../services/api'

function SignUp({ setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  })
  // Note: college_name and department_name removed - using simple class ID join like Google Meet
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
      <div className="hidden sm:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 lg:p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full" />
        </div>

        <div className="relative text-center lg:text-left max-w-lg animate-fade-in-up py-8 lg:py-0">
          <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-white/10 backdrop-blur rounded-2xl mb-6 lg:mb-8 shadow-2xl">
            <GraduationCap className="w-9 h-9 lg:w-11 lg:h-11 text-white" />
          </div>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white mb-4 leading-tight">
            Join the<br />Future of Learning
          </h1>
          <p className="text-primary-200 text-base lg:text-lg leading-relaxed max-w-md">
            Create your account and start experiencing AI-powered virtual classrooms with real-time engagement tracking.
          </p>
          
          <div className="mt-8 space-y-3">
            {[
              { icon: BookOpen, text: 'Interactive live classrooms' },
              { icon: Users, text: 'Real-time engagement monitoring' },
              { icon: Lock, text: 'Secure & private by design' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 justify-center lg:justify-start text-primary-200">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-white dark:bg-gray-950">
        <div className="w-full max-w-sm sm:max-w-md animate-fade-in-up">
          {/* Mobile Logo */}
          <div className="sm:hidden text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl mb-3 shadow-lg shadow-primary-600/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Virtual Classroom</h1>
          </div>

          <div className="mb-5 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Create account</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm sm:text-base">Get started with your free account</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {['student', 'teacher'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={`py-3 px-4 rounded-xl font-medium text-sm transition-all border-2 ${
                      formData.role === role
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {role === 'student' ? <BookOpen className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      <span className="capitalize">{role}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  id="name" name="name" type="text"
                  value={formData.name} onChange={handleChange}
                  placeholder="Enter your full name" required
                  className="input-base input-with-icon"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  id="email" name="email" type="email"
                  value={formData.email} onChange={handleChange}
                  placeholder="name@example.com" required
                  className="input-base input-with-icon"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password} onChange={handleChange}
                    placeholder="Create password" required
                    className="input-base input-with-icon pr-12"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="confirmPassword" name="confirmPassword" type="password"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Confirm password" required
                    className="input-base input-with-icon"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 sm:py-3.5 btn-primary flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 sm:mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp

import { useState, useRef, useEffect } from 'react'
import { Bell, Search, ChevronDown, User, LogOut, GraduationCap, Sun, Sunset, Moon } from 'lucide-react'

// Get time-based greeting
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return { text: 'Good Morning', icon: Sun }
  } else if (hour < 17) {
    return { text: 'Good Afternoon', icon: Sunset }
  } else {
    return { text: 'Good Evening', icon: Moon }
  }
}

function Header({ user, onLogout, title, sidebarCollapsed }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [greeting, setGreeting] = useState(getGreeting())
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  const isTeacher = user?.role === 'teacher'
  const firstName = user?.name?.split(' ')[0] || 'User'
  const GreetingIcon = greeting.icon

  return (
    <header className={`sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-all duration-300 ${
      sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
    }`}>
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: Mobile logo + Page title */}
        <div className="flex items-center gap-3">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GreetingIcon className="w-5 h-5 text-amber-500" />
              {greeting.text}, {firstName}!
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Right: Search, Notifications, Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search - desktop only */}
          <div className="hidden md:flex items-center relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-56 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500 outline-none transition"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2 sm:pr-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm ${
                isTeacher
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                  : 'bg-gradient-to-br from-primary-500 to-primary-700'
              }`}>
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-gray-400 capitalize">{user?.role || 'student'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl animate-scale-in origin-top-right overflow-hidden z-50">
                {/* User info header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isTeacher
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                        : 'bg-gradient-to-br from-primary-500 to-primary-700'
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || 'user@email.com'}</p>
                    </div>
                  </div>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${
                    isTeacher
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  }`}>
                    {user?.role || 'Student'}
                  </span>
                </div>

                {/* Menu items */}
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <User className="w-4 h-4 text-gray-400" />
                    Profile
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); onLogout() }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

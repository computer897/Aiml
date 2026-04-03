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
    <header
      className={`sticky top-0 z-30 glass transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
      }`}
      style={{
        borderBottom: 'none',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* ── LEFT: Mobile logo + Greeting ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile logo - only on small screens */}
          <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0053db] to-[#0048c1] rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-[#1a1f2e] dark:text-white flex items-center gap-2 whitespace-nowrap">
              <GreetingIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
              <span className="truncate">{greeting.text}, {firstName}!</span>
            </h1>
            <p className="text-xs text-[#7a8295] dark:text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── RIGHT: Search, Notifications, Avatar ── */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Search - desktop only */}
          <div className="hidden md:flex items-center relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <Search className="w-4 h-4 text-[#7a8295]" />
            </div>
            <input
              type="text"
              placeholder="Search classes, students..."
              className="input-ghost w-56 pl-10 pr-4 text-sm"
            />
          </div>

          {/* Notifications */}
          <button className="btn-icon relative p-2 sm:p-2.5">
            <Bell className="w-5 h-5 text-[#575f75] dark:text-gray-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 sm:h-8 bg-[#e8ecf0] dark:bg-gray-800 hidden sm:block" />

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover-subtle p-1.5 sm:p-2 rounded-lg transition-all duration-200"
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0 ${
                  isTeacher
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                    : 'bg-gradient-to-br from-[#0053db] to-[#0048c1]'
                }`}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-[#1a1f2e] dark:text-white leading-tight truncate max-w-[120px]">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-[#7a8295] dark:text-gray-400 capitalize font-medium">{user?.role || 'Student'}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#7a8295] dark:text-gray-400 transition-transform hidden sm:block flex-shrink-0 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown - professional styling */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 surface-container-lowest dark:bg-gray-900 rounded-2xl shadow-card animate-scale-in origin-top-right overflow-hidden z-50">
                {/* User info header */}
                <div className="p-4 surface-container-low dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                        isTeacher
                          ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                          : 'bg-gradient-to-br from-[#0053db] to-[#0048c1]'
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1a1f2e] dark:text-white truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-[#7a8295] dark:text-gray-400 truncate">{user?.email || 'user@email.com'}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-block mt-2.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${
                      isTeacher
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-[#0053db] dark:text-blue-400'
                    }`}
                  >
                    {user?.role || 'Student'}
                  </span>
                </div>

                {/* Menu items */}
                <div className="p-2 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#575f75] dark:text-gray-300 hover-subtle rounded-lg transition-all duration-200">
                    <User className="w-4 h-4 text-[#7a8295]" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      onLogout()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
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

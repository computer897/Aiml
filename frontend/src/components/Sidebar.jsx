import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, StickyNote,
  Calendar, Settings, LogOut, ChevronLeft, ChevronRight,
  List, Users, Megaphone, PlusSquare
} from 'lucide-react'

// ── Student nav items ──
const studentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classes', label: 'Classes', icon: BookOpen },
  { id: 'notes', label: 'Notes & Materials', icon: StickyNote, route: '/documents' },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]

// ── Teacher nav items ──
const teacherNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-classroom', label: 'Create Classroom', icon: PlusSquare },
  { id: 'classroom-list', label: 'Classroom List', icon: List },
  { id: 'attending-students', label: 'Attending Students', icon: Users },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, route: '/announcements' },
]

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'logout', label: 'Logout', icon: LogOut },
]

// ── Reusable SidebarItem ──
function SidebarItem({ item, isActive, collapsed, hoveredItem, onHover, onLeave, onClick, isLogout }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`relative w-full flex items-center gap-3 rounded-lg transition-all duration-200 group ${
        collapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'
      } ${
        isLogout
          ? 'text-red-500 hover:bg-red-50/60 dark:hover:bg-red-900/20'
          : isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0053db] dark:text-blue-400'
            : 'text-[#575f75] dark:text-gray-400 hover:bg-white/40 dark:hover:bg-gray-800/30 hover:text-[#1a1f2e] dark:hover:text-white'
      }`}
      title={collapsed ? item.label : undefined}
    >
      {/* Left indicator bar for active */}
      {isActive && !isLogout && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#0053db] dark:bg-blue-400 rounded-r-full" />
      )}
      <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive && !isLogout ? 'text-[#0053db] dark:text-blue-400' : ''}`} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {/* Tooltip for collapsed state */}
      {collapsed && hoveredItem === item.id && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap z-50 shadow-subtle pointer-events-none animate-scale-in">
          {item.label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
        </div>
      )}
    </button>
  )
}

function Sidebar({ collapsed, onToggle, activeTab, onTabChange, onSettingsOpen, onLogout, role }) {
  const [hoveredItem, setHoveredItem] = useState(null)
  const navigate = useNavigate()

  const navItems = role === 'teacher' ? teacherNavItems : studentNavItems

  const handleNavClick = (item) => {
    if (item.route) {
      navigate(item.route)
    } else {
      onTabChange(item.id)
    }
  }

  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DESKTOP SIDEBAR - Glassmorphism
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 glass transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
        style={{
          borderRight: 'none',
        }}
      >
        {/* ── LOGO SECTION ── Subtle spacing, no border */}
        <div className={`flex items-center h-16 px-4 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className={`${collapsed ? 'w-10 h-10' : 'w-10 h-10'} bg-white/10 backdrop-blur-md border border-white/20 rounded-[15px] flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <img
              src="/logo.png"
              alt="VC Room"
              className={`${collapsed ? 'w-8 h-8' : 'w-8 h-8'} object-contain`}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <h1 className="text-sm font-bold text-[#1a1f2e] dark:text-white leading-tight truncate">VC Room</h1>
              <p className="text-[10px] text-[#7a8295] dark:text-gray-400 font-semibold uppercase tracking-wider">Virtual Classroom</p>
            </div>
          )}
        </div>

        {/* ── NAV ITEMS ── Spacing, no dividers */}
        <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              collapsed={collapsed}
              hoveredItem={hoveredItem}
              onHover={() => setHoveredItem(item.id)}
              onLeave={() => setHoveredItem(null)}
              onClick={() => handleNavClick(item)}
            />
          ))}
        </nav>

        {/* ── BOTTOM ITEMS ── Settings & Logout (spacing-based separation) */}
        <div className="py-3 px-2.5 space-y-1 flex-shrink-0">
          {bottomItems.map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={false}
              isLogout={item.id === 'logout'}
              collapsed={collapsed}
              hoveredItem={hoveredItem}
              onHover={() => setHoveredItem(item.id)}
              onLeave={() => setHoveredItem(null)}
              onClick={() => {
                if (item.id === 'settings') onSettingsOpen()
                if (item.id === 'logout') onLogout()
              }}
            />
          ))}
        </div>

        {/* ── COLLAPSE TOGGLE ── Bottom action (spacing-based separation) */}
        <div className="py-3 px-2.5 flex-shrink-0">
          <button
            onClick={onToggle}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#7a8295] dark:text-gray-400 hover:bg-white/40 dark:hover:bg-gray-800/30 hover:text-[#1a1f2e] dark:hover:text-white transition-all duration-200 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MOBILE BOTTOM NAVIGATION - Glassmorphic floating bar
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map(item => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-[#0053db] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-900/20'
                    : 'text-[#7a8295] dark:text-gray-500 hover:bg-white/40 dark:hover:bg-gray-800/30'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={onSettingsOpen}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg text-[#7a8295] dark:text-gray-500 hover:bg-white/40 dark:hover:bg-gray-800/30 transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default Sidebar

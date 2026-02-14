import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, StickyNote, Video, MessageSquare,
  Calendar, Settings, LogOut, ChevronLeft, ChevronRight,
  PlusSquare, List, Users, Sparkles, FileText, Megaphone
} from 'lucide-react'

// ── Student nav items ──
const studentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classes', label: 'Classes', icon: BookOpen },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'recordings', label: 'Recordings', icon: Video },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]

// ── Teacher nav items ──
const teacherNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-classroom', label: 'Create Classroom', icon: PlusSquare },
  { id: 'classroom-list', label: 'Classroom List', icon: List },
  { id: 'attending-students', label: 'Attending Students', icon: Users },
  { id: 'ai-study-plan', label: 'AI Study Plan', icon: Sparkles },
  { id: 'notes-materials', label: 'Notes & Materials', icon: FileText },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
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
      className={`relative w-full flex items-center gap-3 rounded-xl transition-all duration-200 group ${
        collapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'
      } ${
        isLogout
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : isActive
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
      }`}
      title={collapsed ? item.label : undefined}
    >
      {isActive && !isLogout && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-600 dark:bg-primary-400 rounded-r-full" />
      )}
      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive && !isLogout ? 'text-primary-600 dark:text-primary-400' : ''}`} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {/* Tooltip for collapsed state */}
      {collapsed && hoveredItem === item.id && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-lg whitespace-nowrap z-50 shadow-lg pointer-events-none">
          {item.label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
        </div>
      )}
    </button>
  )
}

function Sidebar({ collapsed, onToggle, activeTab, onTabChange, onSettingsOpen, onLogout, role }) {
  const [hoveredItem, setHoveredItem] = useState(null)

  const navItems = role === 'teacher' ? teacherNavItems : studentNavItems

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <img 
            src="/logo.png" 
            alt="VC Room" 
            className={`${collapsed ? 'w-10 h-10' : 'w-9 h-9'} object-contain flex-shrink-0`}
          />
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">VC Room</h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Virtual Classroom</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              collapsed={collapsed}
              hoveredItem={hoveredItem}
              onHover={() => setHoveredItem(item.id)}
              onLeave={() => setHoveredItem(null)}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </nav>

        {/* Bottom items */}
        <div className="py-3 px-3 space-y-1 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
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

        {/* Collapse toggle */}
        <div className="py-3 px-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={onToggle}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.slice(0, 5).map(item => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={onSettingsOpen}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-gray-400 dark:text-gray-500 transition-colors"
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

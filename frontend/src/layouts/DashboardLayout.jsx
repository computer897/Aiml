import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import SettingsPanel from '../components/SettingsPanel'

function DashboardLayout({ children, user, onLogout, title }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Clone children to inject activeTab and onTabChange
  const enhancedChildren = typeof children === 'function'
    ? children({ activeTab, onTabChange: setActiveTab })
    : children

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsOpen={() => setSettingsOpen(true)}
        onLogout={onLogout}
        role={user?.role}
      />

      {/* Header */}
      <Header
        user={user}
        onLogout={onLogout}
        title={title}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content */}
      <main className={`transition-all duration-300 pb-20 lg:pb-0 ${
        sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
      }`}>
        <div className="animate-fade-in">
          {enhancedChildren}
        </div>
      </main>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onLogout={onLogout}
      />
    </div>
  )
}

export default DashboardLayout

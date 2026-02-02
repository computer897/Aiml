import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GraduationCap, Settings, LogOut, Bell, Video } from 'lucide-react'
import { mockAttendance, engagementStats } from '../data/mockData'
import EngagementStats from '../components/EngagementStats'
import AttendanceTable from '../components/AttendanceTable'
import CreateClassModal from '../components/CreateClassModal'

function TeacherDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCreateClass = (formData) => {
    alert(`Classroom "${formData.title}" created successfully!`)
    setIsModalOpen(false)
    // Navigate to classroom or refresh data
  }

  const handleStartClass = () => {
    navigate('/classroom/class-1')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Settings className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Teacher Portal</span>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition relative">
                <Bell className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'TR'}
                  </span>
                </div>
                <button 
                  onClick={onLogout}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {user?.name || 'Teacher'}!
            </h1>
            <p className="text-gray-600">Manage your classes and monitor student engagement</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Create Classroom
            </button>
            <button
              onClick={handleStartClass}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all shadow-lg"
            >
              <Video className="w-5 h-5" />
              Start Class
            </button>
          </div>
        </div>

        {/* Engagement Statistics */}
        <EngagementStats stats={engagementStats} />

        {/* Attendance Table */}
        <AttendanceTable attendanceData={mockAttendance} />
      </main>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateClass}
      />
    </div>
  )
}

export default TeacherDashboard

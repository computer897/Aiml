import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GraduationCap, Settings, LogOut, Bell, Video } from 'lucide-react'
import { classAPI, attendanceAPI } from '../services/api'
import EngagementStats from '../components/EngagementStats'
import AttendanceTable from '../components/AttendanceTable'
import CreateClassModal from '../components/CreateClassModal'

function TeacherDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [classes, setClasses] = useState([])
  const [activeClass, setActiveClass] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [loading, setLoading] = useState(false)

  // Load classes and attendance data on mount
  useEffect(() => {
    loadTeacherData()
  }, [])

  const loadTeacherData = async () => {
    try {
      setLoading(true)
      // Load created classes
      const createdClasses = await classAPI.getTeacherClasses()
      setClasses(createdClasses)
      
      // Load attendance for the first active class if available
      if (createdClasses.length > 0 && createdClasses[0].is_active) {
        const report = await attendanceAPI.getReport(createdClasses[0].class_id)
        setAttendanceData(report.attendance_records || [])
        setActiveClass(createdClasses[0])
      }
    } catch (error) {
      console.error('Failed to load teacher data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClass = async (formData) => {
    setLoading(true)
    try {
      // Format the date for backend
      const classData = {
        class_id: formData.classId,
        title: formData.title,
        description: formData.description || '',
        schedule_time: new Date(formData.scheduleTime).toISOString(),
        duration_minutes: parseInt(formData.duration)
      }
      
      const response = await classAPI.create(classData)
      alert(`Classroom "${response.title}" created successfully!`)
      setIsModalOpen(false)
      // Refresh classes list
      await loadTeacherData()
    } catch (error) {
      alert('Failed to create class: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartClass = async () => {
    if (classes.length > 0) {
      const classToStart = classes[0]
      try {
        const response = await classAPI.activate(classToStart.class_id)
        navigate(`/classroom/${classToStart.class_id}`, { 
          state: { sessionId: response.session_id, classData: classToStart }
        })
      } catch (error) {
        alert('Failed to activate class: ' + error.message)
      }
    } else {
      alert('Please create a class first!')
    }
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
        <EngagementStats stats={{
          totalClasses: classes.length,
          activeStudents: attendanceData.filter(a => a.status === 'present').length,
          avgEngagement: attendanceData.length > 0 
            ? Math.round(attendanceData.reduce((sum, a) => sum + (a.engagement_percentage || 0), 0) / attendanceData.length)
            : 0,
          presentToday: attendanceData.filter(a => a.status === 'present').length
        }} />

        {/* Attendance Table */}
        <AttendanceTable attendanceData={attendanceData} />
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

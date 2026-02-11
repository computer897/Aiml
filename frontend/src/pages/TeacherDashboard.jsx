import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Video, BarChart3, Users, Clock, Upload, FileText,
  Bell, ChevronRight, BookOpen, Play, AlertCircle
} from 'lucide-react'
import { classAPI, attendanceAPI } from '../services/api'
import DashboardLayout from '../layouts/DashboardLayout'
import AttendanceTable from '../components/AttendanceTable'
import CreateClassModal from '../components/CreateClassModal'
import { todayClasses, teacherAnnouncements, mockStudents } from '../data/mockData'
import TeacherCreateClassroomTab from '../components/tabs/TeacherCreateClassroomTab'
import TeacherClassroomListTab from '../components/tabs/TeacherClassroomListTab'
import TeacherAttendingStudentsTab from '../components/tabs/TeacherAttendingStudentsTab'
import TeacherAIStudyPlanTab from '../components/tabs/TeacherAIStudyPlanTab'
import TeacherNotesMaterialsTab from '../components/tabs/TeacherNotesMaterialsTab'
import TeacherAnnouncementsTab from '../components/tabs/TeacherAnnouncementsTab'

function TeacherDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [classes, setClasses] = useState([])
  const [activeClass, setActiveClass] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadTeacherData() }, [])

  const loadTeacherData = async () => {
    try {
      setLoading(true)
      const createdClasses = await classAPI.getTeacherClasses()
      setClasses(createdClasses)
      if (createdClasses.length > 0 && createdClasses[0].is_active) {
        const report = await attendanceAPI.getReport(createdClasses[0].class_id)
        setAttendanceData(report.attendance_records || [])
        setActiveClass(createdClasses[0])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleCreateClass = async (formData) => {
    setLoading(true)
    try {
      const classData = {
        class_id: formData.classId,
        title: formData.title,
        description: formData.description || '',
        schedule_time: new Date(formData.scheduleTime).toISOString(),
        duration_minutes: parseInt(formData.duration),
      }
      const response = await classAPI.create(classData)
      alert(`Classroom "${response.title}" created successfully!`)
      setIsModalOpen(false)
      await loadTeacherData()
    } catch (error) { alert('Failed to create class: ' + error.message) } finally { setLoading(false) }
  }

  const handleStartClass = async () => {
    if (classes.length === 0) return alert('Please create a class first!')
    try {
      const response = await classAPI.activate(classes[0].class_id)
      navigate(`/classroom/${classes[0].class_id}`, {
        state: { sessionId: response.session_id, classData: classes[0] },
      })
    } catch (error) { alert('Failed to activate class: ' + error.message) }
  }

  const colorMap = {
    primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  }

  const totalStudents = mockStudents.length
  const presentStudents = mockStudents.filter(s => s.status !== 'absent').length

  const renderTabContent = (activeTab, onTabChange) => {
    switch (activeTab) {
      case 'create-classroom':
        return <TeacherCreateClassroomTab onCreateClass={handleCreateClass} />
      case 'classroom-list':
        return <TeacherClassroomListTab classes={classes} onNavigate={(id) => navigate(`/classroom/${id}`)} onStartClass={handleStartClass} onCreateClass={() => onTabChange('create-classroom')} />
      case 'attending-students':
        return <TeacherAttendingStudentsTab />
      case 'ai-study-plan':
        return <TeacherAIStudyPlanTab />
      case 'notes-materials':
        return <TeacherNotesMaterialsTab />
      case 'announcements':
        return <TeacherAnnouncementsTab />
      default:
        return renderDashboard()
    }
  }

  const renderDashboard = () => (
    <div className="space-y-6">

        {/* ── Welcome Banner ── */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white/5 rounded-full translate-y-10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome, {user?.name || 'Teacher'}!
              </h1>
              <p className="text-purple-200 mt-1 text-sm sm:text-base">Manage your classes and monitor student engagement.</p>
              <span className="inline-block mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold tracking-wide uppercase">
                Teacher
              </span>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={() => setIsModalOpen(true)} className="px-4 sm:px-5 py-2.5 bg-white text-purple-700 font-semibold text-sm rounded-xl hover:bg-white/90 transition flex items-center gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Create Class
              </button>
              <button onClick={handleStartClass} className="px-4 sm:px-5 py-2.5 bg-white/20 backdrop-blur text-white font-semibold text-sm rounded-xl hover:bg-white/30 transition flex items-center gap-2 border border-white/20">
                <Play className="w-4 h-4" /> Start Class
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Classes', value: classes.length, icon: BarChart3, color: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600', change: '+2 this week' },
            { label: 'Active Now', value: classes.filter(c => c.is_active).length, icon: Video, color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600', change: 'Live sessions' },
            { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600', change: `${presentStudents} present` },
            { label: 'Avg Engagement', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, a) => s + (a.engagement_percentage || 0), 0) / attendanceData.length) + '%' : '73%', icon: BarChart3, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', change: '+5% from last week' },
          ].map((stat, i) => (
            <div key={i} className="card-interactive p-4 sm:p-5 hover:scale-[1.02] transition-transform" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-green-600 mt-1 font-medium">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Today's Classes ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  Today's Classes
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  {todayClasses.length} classes
                </span>
              </div>
              <div className="p-5 space-y-3">
                {todayClasses.map(cls => {
                  const c = colorMap[cls.color] || colorMap.primary
                  return (
                    <div key={cls.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-sm transition-all group">
                      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                        <BookOpen className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cls.className}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{cls.batch}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.time}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.studentCount} students</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                        cls.status === 'completed'
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {cls.status === 'completed' ? 'Done' : 'Upcoming'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Class Management ── */}
            <section className="card-interactive overflow-hidden">
              <div className="p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Class Management
                </h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Create Class */}
                <button onClick={() => setIsModalOpen(true)} className="group p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-all text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Create Class</p>
                  <p className="text-[11px] text-gray-400 mt-1">Schedule a new session</p>
                </button>
                {/* Upload Notes */}
                <button className="group p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload Notes</p>
                  <p className="text-[11px] text-gray-400 mt-1">Share study materials</p>
                </button>
                {/* Upload Recorded Sessions */}
                <button className="group p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-cyan-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload Recording</p>
                  <p className="text-[11px] text-gray-400 mt-1">Post recorded sessions</p>
                </button>
              </div>
            </section>

            {/* ── Your Classes (from API) ── */}
            {classes.length > 0 && (
              <section className="card-interactive overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-500" />
                    Your Classes
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {classes.map((cls, i) => (
                    <div key={cls.class_id || i}
                      className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/classroom/${cls.class_id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          cls.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Video className={`w-5 h-5 ${cls.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cls.title}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {cls.class_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                          cls.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {cls.is_active ? '● Live' : 'Scheduled'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Student Overview / Attendance ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Student Overview
                </h2>
              </div>
              <div className="p-5">
                {/* Quick summary */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{presentStudents}</p>
                    <p className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">Present</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">{totalStudents - presentStudents}</p>
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">Absent</p>
                  </div>
                  <div className="text-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                    <p className="text-xl font-bold text-primary-700 dark:text-primary-400">{totalStudents}</p>
                    <p className="text-[11px] text-primary-600 dark:text-primary-400 mt-0.5">Total</p>
                  </div>
                </div>
                <AttendanceTable attendanceData={attendanceData} />
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (1/3) */}
          <div className="space-y-6">
            {/* ── Announcements / Notices ── */}
            <section className="card-interactive overflow-hidden lg:sticky lg:top-24">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Announcements
                </h2>
                <button className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold hover:underline">+ New</button>
              </div>
              <div className="p-5 space-y-3">
                {teacherAnnouncements.map(ann => (
                  <div key={ann.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        ann.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                        ann.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <AlertCircle className={`w-3.5 h-3.5 ${
                          ann.priority === 'high' ? 'text-red-600' :
                          ann.priority === 'medium' ? 'text-amber-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{ann.title}</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{ann.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{ann.date}</p>
                      </div>
                      {ann.priority === 'high' && (
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-bold rounded flex-shrink-0">!</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Quick Links ── */}
            <section className="card-interactive overflow-hidden">
              <div className="p-5 pb-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" />
                  Quick Links
                </h2>
              </div>
              <div className="p-5 space-y-2">
                {[
                  { label: 'View All Students', icon: Users, color: 'text-purple-600' },
                  { label: 'Attendance Reports', icon: BarChart3, color: 'text-green-600' },
                  { label: 'Uploaded Notes', icon: FileText, color: 'text-primary-600' },
                  { label: 'Recorded Sessions', icon: Video, color: 'text-red-500' },
                ].map((link, i) => (
                  <button key={i} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group">
                    <link.icon className={`w-4 h-4 ${link.color}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
    </div>
  )

  return (
    <>
      <DashboardLayout user={user} onLogout={onLogout} title="Dashboard">
        {({ activeTab, onTabChange }) => (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
            {renderTabContent(activeTab, onTabChange)}
          </div>
        )}
      </DashboardLayout>
      <CreateClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateClass}
      />
    </>
  )
}

export default TeacherDashboard

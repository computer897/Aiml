import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Video, BarChart3, Users, Clock, Upload, FileText,
  Bell, ChevronRight, BookOpen, Play, AlertCircle, RefreshCw,
  Trash2, Radio
} from 'lucide-react'
import { io } from 'socket.io-client'
import { classAPI, attendanceAPI } from '../services/api'
import { notifyClassEvent, notifySuccess } from '../services/notifications'
import { SIGNALING_URL } from '../services/webrtc'
import DashboardLayout from '../layouts/DashboardLayout'
import AttendanceTable from '../components/AttendanceTable'
import CreateClassModal from '../components/CreateClassModal'
import TeacherCreateClassroomTab from '../components/tabs/TeacherCreateClassroomTab'
import TeacherClassroomListTab from '../components/tabs/TeacherClassroomListTab'
import TeacherAttendingStudentsTab from '../components/tabs/TeacherAttendingStudentsTab'
import TeacherAIStudyPlanTab from '../components/tabs/TeacherAIStudyPlanTab'
import TeacherNotesMaterialsTab from '../components/tabs/TeacherNotesMaterialsTab'
import TeacherAnnouncementsTab from '../components/tabs/TeacherAnnouncementsTab'

// Local storage key for announcements
const ANNOUNCEMENTS_STORAGE_KEY = 'teacher_announcements'

function TeacherDashboard({ user, onLogout, onUserUpdate }) {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [classes, setClasses] = useState([])
  const [activeClass, setActiveClass] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [attendanceSessionId, setAttendanceSessionId] = useState(null)
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [liveEngagement, setLiveEngagement] = useState(null)
  const [liveError, setLiveError] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)

  const hydrateAttendanceData = async (classInfo, { preferredSessionId = null, refreshHistory = true } = {}) => {
    if (!classInfo) return
    setAttendanceLoading(true)
    try {
      let historyList = attendanceHistory
      if (refreshHistory) {
        historyList = await attendanceAPI.listReports(classInfo.class_id)
        setAttendanceHistory(historyList)
      }

      let sessionToLoad = preferredSessionId
      if (sessionToLoad && refreshHistory) {
        const stillExists = historyList.some(summary => summary.session_id === sessionToLoad)
        if (!stillExists) {
          sessionToLoad = null
        }
      }
      if (!sessionToLoad) {
        sessionToLoad = historyList[0]?.session_id || null
      }
      if (!sessionToLoad && classInfo.active_session_id) {
        sessionToLoad = classInfo.active_session_id
      }
      let report

      if (sessionToLoad) {
        report = await attendanceAPI.getReport(classInfo.class_id, sessionToLoad)
      } else {
        report = await attendanceAPI.getReport(classInfo.class_id)
        if (!sessionToLoad && report.session_id) {
          sessionToLoad = report.session_id
        }
      }

      setAttendanceData(report.attendance_records || [])
      const resolvedSession = report.session_id || sessionToLoad || classInfo.active_session_id || null
      setAttendanceSessionId(resolvedSession)
      setSelectedSessionId(resolvedSession)
    } catch (error) {
      console.error('Failed to load attendance report:', error)
      setAttendanceData([])
      setAttendanceSessionId(null)
      setSelectedSessionId(null)
    } finally {
      setAttendanceLoading(false)
    }
  }

  const loadReportForSession = async (sessionId) => {
    if (!activeClass || !sessionId) return
    setAttendanceLoading(true)
    try {
      const report = await attendanceAPI.getReport(activeClass.class_id, sessionId)
      setAttendanceData(report.attendance_records || [])
      const resolvedSession = report.session_id || sessionId
      setAttendanceSessionId(resolvedSession)
      setSelectedSessionId(resolvedSession)
    } catch (error) {
      alert(error.message || 'Failed to load attendance report')
    } finally {
      setAttendanceLoading(false)
    }
  }

  const handleSessionChange = async (sessionId) => {
    if (!activeClass) return
    if (!sessionId) {
      await hydrateAttendanceData(activeClass, { preferredSessionId: null, refreshHistory: true })
      return
    }
    await loadReportForSession(sessionId)
  }

  const handleSelectClassForAttendance = async (classId) => {
    const selected = classes.find(cls => cls.class_id === classId)
    if (!selected) return
    setActiveClass(selected)
    await hydrateAttendanceData(selected, { preferredSessionId: null, refreshHistory: true })
  }

  const handleRefreshAttendance = async () => {
    if (!activeClass) return
    await hydrateAttendanceData(activeClass, { preferredSessionId: selectedSessionId, refreshHistory: true })
  }

  const handleDeleteReport = async (sessionId) => {
    if (!activeClass || !sessionId) return
    if (!window.confirm('Delete this attendance report? This action cannot be undone.')) return
    try {
      await attendanceAPI.deleteReport(activeClass.class_id, sessionId)
      const stillSelected = sessionId === selectedSessionId ? null : selectedSessionId
      await hydrateAttendanceData(activeClass, { preferredSessionId: stillSelected, refreshHistory: true })
    } catch (error) {
      alert(error.message || 'Failed to delete attendance report')
    }
  }

  const formatSessionLabel = (summary) => {
    if (!summary) return 'Latest / Live'
    const endedAt = summary.ended_at ? new Date(summary.ended_at) : null
    const dateLabel = endedAt
      ? endedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : summary.class_date || 'Session'
    const timeLabel = endedAt
      ? endedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
    const attendanceRatio = summary.total_students > 0
      ? `${summary.present_count}/${summary.total_students} present`
      : 'No data'
    return `${dateLabel}${timeLabel ? ` · ${timeLabel}` : ''} (${attendanceRatio})`
  }

  const formatDurationMinutes = (seconds) => {
    if (!seconds || seconds <= 0) return '—'
    return `${Math.max(1, Math.round(seconds / 60))} min`
  }

  useEffect(() => { 
    loadTeacherData()
    
    // Poll for class status updates every 5 seconds to detect finished classes
    const classRefreshInterval = setInterval(() => {
      loadTeacherData()
    }, 5000)

    return () => clearInterval(classRefreshInterval)
  }, [])

  useEffect(() => {
    const socket = io(SIGNALING_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: false,
      reconnection: true,
    })

    socket.on('attendance-ready', async (payload) => {
      const classId = payload?.classId
      if (!classId) return

      const selectedClass = classes.find(cls => cls.class_id === classId)
      if (!selectedClass) return

      if (activeClass?.class_id !== classId) {
        setActiveClass(selectedClass)
      }

      await hydrateAttendanceData(selectedClass, {
        preferredSessionId: payload?.sessionId || null,
        refreshHistory: true,
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [activeClass?.class_id, classes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const classId = activeClass?.class_id
    if (!classId || !activeClass?.is_active) {
      setLiveEngagement(null)
      setLiveError(null)
      return
    }

    let cancelled = false

    const fetchLive = async () => {
      try {
        const live = await attendanceAPI.getLive(classId)
        if (!cancelled) {
          setLiveEngagement({
            ...live,
            updatedAt: new Date().toISOString(),
          })
          setLiveError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(error.message || 'Unable to fetch live engagement')
        }
      }
    }

    fetchLive()
    const intervalId = setInterval(fetchLive, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [activeClass?.class_id, activeClass?.is_active])

  const loadTeacherData = async () => {
    try {
      setLoading(true)
      const createdClasses = await classAPI.getTeacherClasses()
      setClasses(createdClasses)
      if (createdClasses.length > 0) {
        const selectedClass = createdClasses.find(cls => cls.is_active) || createdClasses[0]
        setActiveClass(selectedClass)
        await hydrateAttendanceData(selectedClass, { preferredSessionId: null, refreshHistory: true })
      } else {
        setActiveClass(null)
        setAttendanceData([])
        setAttendanceSessionId(null)
        setAttendanceHistory([])
        setSelectedSessionId(null)
      }
      // Load announcements from localStorage
      const storedAnnouncements = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY)
      if (storedAnnouncements) {
        setAnnouncements(JSON.parse(storedAnnouncements))
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
      
      // Send notification about new class
      notifyClassEvent(
        'New Class Created',
        `"${response.title}" has been created. Class ID: ${response.class_id}`
      )
      notifySuccess('Success', `Classroom "${response.title}" created successfully!`)
      
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

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) return
    setLoading(true)
    try {
      await classAPI.delete(classId)
      await loadTeacherData()
    } catch (error) { alert('Failed to delete class: ' + error.message) } finally { setLoading(false) }
  }

  const colorMap = {
    primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  }

  // Calculate student counts from real class data
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.enrolled_students?.length || 0), 0)
  const presentStudents = attendanceData.filter(a => a.attendance_status === 'present').length

  const renderTabContent = (activeTab, onTabChange) => {
    switch (activeTab) {
      case 'create-classroom':
        return <TeacherCreateClassroomTab onCreateClass={handleCreateClass} />
      case 'classroom-list':
        return <TeacherClassroomListTab classes={classes} onNavigate={(id) => navigate(`/classroom/${id}`)} onStartClass={handleStartClass} onCreateClass={() => onTabChange('create-classroom')} onDeleteClass={handleDeleteClass} />
      case 'attending-students':
        return <TeacherAttendingStudentsTab classes={classes} />
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
            { label: 'Avg Engagement', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, a) => s + (a.engagement_percentage || 0), 0) / attendanceData.length) + '%' : '0%', icon: BarChart3, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', change: attendanceData.length > 0 ? 'Finalized report' : 'No retained report' },
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
                  Your Classes
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  {classes.length} classes
                </span>
              </div>
              <div className="p-5 space-y-3">
                {classes.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No classes created yet</p>
                    <button onClick={() => setIsModalOpen(true)} className="mt-3 text-sm text-primary-600 hover:underline">Create your first class</button>
                  </div>
                ) : classes.slice(0, 4).map((cls, idx) => {
                  const colors = ['primary', 'purple', 'cyan']
                  const c = colorMap[colors[idx % 3]] || colorMap.primary
                  const scheduleTime = cls.schedule_time ? new Date(cls.schedule_time) : null
                  return (
                    <div key={cls.class_id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-sm transition-all group cursor-pointer" onClick={() => navigate(`/classroom/${cls.class_id}`)}>
                      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                        <BookOpen className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cls.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {cls.class_id}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{scheduleTime ? scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.enrolled_students?.length || 0} students</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                        cls.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        {cls.is_active ? '● Live' : 'Scheduled'}
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

                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                      <div className="flex flex-col flex-1 min-w-[180px]">
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">Class</label>
                        <select
                          value={activeClass?.class_id || ''}
                          onChange={(e) => handleSelectClassForAttendance(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200"
                        >
                          {classes.length === 0 && <option value="">No classes</option>}
                          {classes.map((cls) => (
                            <option key={cls.class_id} value={cls.class_id}>{cls.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col flex-1 min-w-[200px]">
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">Attendance Session</label>
                        <select
                          value={selectedSessionId || ''}
                          onChange={(e) => handleSessionChange(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200"
                        >
                          <option value="">Latest / Live</option>
                          {attendanceHistory.map((summary) => (
                            <option key={summary.session_id} value={summary.session_id}>
                              {formatSessionLabel(summary)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefreshAttendance}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition"
                      >
                        <RefreshCw className="w-4 h-4" /> Refresh
                      </button>
                      {selectedSessionId && (
                        <button
                          onClick={() => handleDeleteReport(selectedSessionId)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {activeClass?.is_active && (
                    <div className="mb-4 border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                          <Radio className="w-4 h-4 text-green-500 animate-pulse" /> Live Engagement Snapshot
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {liveEngagement?.updatedAt
                            ? `Updated ${new Date(liveEngagement.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : liveError || 'Waiting for student signals'}
                        </span>
                      </div>

                      {/* Legend for status indicators */}
                      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                          <span>Present</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                          <span>Not Present</span>
                        </div>
                      </div>
                              {(liveEngagement?.students || []).length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {liveError || 'No engagement data yet. Students will appear once their browsers send presence metadata.'}
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                  {(liveEngagement?.students || []).map((student) => {
                                    const isPresent = Boolean(student.face_detected)
                                    const dotColor = isPresent ? 'bg-green-400' : 'bg-red-400'
                                    const statusText = isPresent ? 'Present' : 'Not Present'
                                    return (
                                      <div key={student.student_id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${isPresent ? 'animate-pulse' : ''}`}></span>
                                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{student.student_name}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isPresent ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                            {statusText}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {Math.round(student.engagement_percentage || 0)}%
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {(liveEngagement?.students || []).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                  <span>
                                    {(liveEngagement?.students || []).filter((s) => s.face_detected).length} / {(liveEngagement?.students || []).length} students present
                                  </span>
                                  <span>
                                    Avg engagement: {Math.round((liveEngagement?.students || []).reduce((sum, s) => sum + (s.engagement_percentage || 0), 0) / Math.max((liveEngagement?.students || []).length, 1))}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <AttendanceTable
                            attendanceData={attendanceData}
                            classId={activeClass?.class_id}
                            sessionId={attendanceSessionId}
                            loading={attendanceLoading}
                          />

                          {attendanceHistory.length > 0 && (
                            <div className="mt-5 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Stored Reports</h3>
                                <button
                                  onClick={handleRefreshAttendance}
                                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" /> Refresh
                                </button>
                              </div>
                              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {attendanceHistory.slice(0, 5).map((summary) => {
                                  const engagementAvg = Math.round(summary.average_engagement_percentage || 0)
                                  return (
                                    <div key={summary.session_id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatSessionLabel(summary)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Duration {formatDurationMinutes(summary.class_duration_seconds)} · Avg engagement {engagementAvg}%
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleSessionChange(summary.session_id)}
                                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReport(summary.session_id)}
                                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
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
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">{Math.max(attendanceData.length - presentStudents, 0)}</p>
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">Absent</p>
                  </div>
                  <div className="text-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                    <p className="text-xl font-bold text-primary-700 dark:text-primary-400">{attendanceData.length}</p>
                    <p className="text-[11px] text-primary-600 dark:text-primary-400 mt-0.5">Total</p>
                  </div>
                </div>
                  <AttendanceTable attendanceData={attendanceData} classId={activeClass?.class_id} sessionId={attendanceSessionId} />
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
                {announcements.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No announcements yet</p>
                ) : announcements.map(ann => (
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
      <DashboardLayout user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} title="Dashboard">
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

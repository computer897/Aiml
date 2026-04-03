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
        // Always fetch fresh history when refreshing
        historyList = await attendanceAPI.listReports(classInfo.class_id)
        setAttendanceHistory(historyList)
      }

      let sessionToLoad = preferredSessionId
      
      // Validation: Ensure preferred session still exists
      if (sessionToLoad && refreshHistory) {
        const stillExists = historyList.some(summary => summary.session_id === sessionToLoad)
        if (!stillExists) {
          sessionToLoad = null
        }
      }
      
      // If no preferred session, use the newest from history
      if (!sessionToLoad && historyList.length > 0) {
        sessionToLoad = historyList[0]?.session_id || null
      }
      
      // Fallback: use active session if class is still active
      if (!sessionToLoad && classInfo.active_session_id) {
        sessionToLoad = classInfo.active_session_id
      }
      
      let report = null
      if (sessionToLoad) {
        // Load specific session report
        report = await attendanceAPI.getReport(classInfo.class_id, sessionToLoad)
      } else {
        // Try to get the latest report
        report = await attendanceAPI.getReport(classInfo.class_id)
        if (!sessionToLoad && report?.session_id) {
          sessionToLoad = report.session_id
        }
      }

      // Set attendance data from the report
      setAttendanceData(report?.attendance_records || [])
      const resolvedSession = report?.session_id || sessionToLoad || classInfo.active_session_id || null
      setAttendanceSessionId(resolvedSession)
      setSelectedSessionId(resolvedSession)
    } catch (error) {
      console.error('Failed to load attendance report:', error)
      // Don't reset data on error, keep existing data to avoid flashing
      if (!attendanceData.length) {
        setAttendanceData([])
      }
      if (!attendanceSessionId) {
        setAttendanceSessionId(null)
        setSelectedSessionId(null)
      }
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

  // Watch for changes in active class status (when class finishes)
  useEffect(() => {
    const prevWasActive = activeClass?.is_active
    
    // If active class was live but is no longer live, refresh attendance data
    if (prevWasActive && !activeClass?.is_active && attendanceHistory.length === 0) {
      // Class just finished, refresh the attendance data to show final report
      hydrateAttendanceData(activeClass, { preferredSessionId: null, refreshHistory: true })
    }
  }, [activeClass?.is_active, activeClass?.id])

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
        // Check if currently active class still exists and its status
        const currentClassStillExists = activeClass 
          ? createdClasses.find(cls => cls.class_id === activeClass.class_id)
          : null
          
        // Determine which class to select
        let selectedClass
        if (currentClassStillExists) {
          // Class still exists, use it (even if status changed)
          selectedClass = currentClassStillExists
          
          // If class was active but now finished, trigger attendance refresh
          if (activeClass.is_active && !selectedClass.is_active) {
            // Class just finished during polling, we'll refresh attendance below
          }
        } else {
          // Current class doesn't exist, pick active or first class
          selectedClass = createdClasses.find(cls => cls.is_active) || createdClasses[0]
        }
        
        setActiveClass(selectedClass)
        
        // Always refresh attendance data to ensure latest status
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
      
      console.log('Creating class with data:', classData)
      const response = await classAPI.create(classData)
      console.log('Class created successfully:', response)
      
      // Verify response has required fields
      if (!response || !response.class_id) {
        throw new Error('Invalid response from server - class not created properly')
      }
      
      // Send notification about new class
      notifyClassEvent(
        'New Class Created',
        `"${response.title}" has been created. Class ID: ${response.class_id}`
      )
      notifySuccess('Success', `Classroom "${response.title}" created successfully!`)
      
      setIsModalOpen(false)
      
      // Refresh class list after successful creation
      await loadTeacherData()
      
    } catch (error) { 
      console.error('Error creating class:', error)
      alert('Failed to create class: ' + (error.message || 'Unknown error')) 
    } finally { 
      setLoading(false) 
    }
  }

  const handleStartClass = async () => {
    if (classes.length === 0) return alert('Please create a class first!')
    if (!classes[0]) return alert('Invalid class data')
    
    try {
      console.log('Starting class:', classes[0].class_id)
      const response = await classAPI.activate(classes[0].class_id)
      console.log('Class activated:', response)
      
      if (!response || !response.session_id) {
        throw new Error('Invalid response from server - session not created')
      }
      
      navigate(`/classroom/${classes[0].class_id}`, {
        state: { sessionId: response.session_id, classData: classes[0] },
      })
    } catch (error) { 
      console.error('Error starting class:', error)
      alert('Failed to activate class: ' + (error.message || 'Unknown error')) 
    }
  }

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) return
    setLoading(true)
    try {
      console.log('Deleting class:', classId)
      await classAPI.delete(classId)
      console.log('Class deleted successfully')
      
      notifySuccess('Success', 'Class deleted successfully')
      
      // Refresh class list after deletion
      await loadTeacherData()
    } catch (error) { 
      console.error('Error deleting class:', error)
      alert('Failed to delete class: ' + (error.message || 'Unknown error')) 
    } finally { 
      setLoading(false) 
    }
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
    <div className="spacing-lg">

        {/* ── Welcome Banner ── Professional, no playful colors */}
        <div className="bg-gradient-to-r from-[#0053db] to-[#0048c1] rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden shadow-card">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/8 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white/4 rounded-full translate-y-10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-page-title text-white">
                Welcome, {user?.name || 'Teacher'}!
              </h1>
              <p className="text-white/70 mt-1.5 text-sm sm:text-base font-medium">Manage your classes and monitor student engagement in real-time.</p>
              <span className="badge-status mt-3 bg-white/20 dark:bg-white/10 text-white font-semibold">
                Teacher
              </span>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Class
              </button>
              <button onClick={handleStartClass} className="btn-secondary bg-white/20 dark:bg-white/15 text-white hover:bg-white/30 dark:hover:bg-white/25 border-0 flex items-center gap-2">
                <Play className="w-4 h-4" /> Start Class
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Classes', value: classes.length, icon: BarChart3, color: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-[#0053db]', change: '+2 this week' },
            { label: 'Active Now', value: classes.filter(c => c.is_active).length, icon: Video, color: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600', change: 'Live sessions' },
            { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600', change: `${presentStudents} present` },
            { label: 'Avg Engagement', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, a) => s + (a.engagement_percentage || 0), 0) / attendanceData.length) + '%' : '0%', icon: BarChart3, color: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600', change: attendanceData.length > 0 ? 'Finalized report' : 'No retained report' },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#1a1f2e] dark:text-white">{stat.value}</p>
              <p className="text-label mt-1">{stat.label}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 spacing-lg">

          {/* LEFT COLUMN (2/3) */}
          <div className="lg:col-span-2 spacing-lg">

            {/* ── Your Classes ── */}
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-section-title flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0053db]" />
                  Your Classes
                </h2>
                <span className="text-label bg-[#f0f4f7] dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  {classes.length} classes
                </span>
              </div>
              <div className="spacing-sm">
                {classes.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-10 h-10 text-[#7a8295] dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-body font-medium">No classes created yet</p>
                    <button onClick={() => setIsModalOpen(true)} className="btn-tertiary mt-3">Create your first class</button>
                  </div>
                ) : classes.slice(0, 4).map((cls, idx) => {
                  const colors = ['primary', 'purple', 'cyan']
                  const c = colorMap[colors[idx % 3]] || colorMap.primary
                  const scheduleTime = cls.schedule_time ? new Date(cls.schedule_time) : null
                  return (
                    <div key={cls.class_id} className="flex items-center gap-4 p-4 rounded-lg hover-subtle hover-lift cursor-pointer transition-all group" onClick={() => navigate(`/classroom/${cls.class_id}`)}>
                      <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                        <BookOpen className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[#1a1f2e] dark:text-white truncate">{cls.title}</h3>
                        <p className="text-small">ID: {cls.class_id}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#7a8295] dark:text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{scheduleTime ? scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.enrolled_students?.length || 0} students</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full flex-shrink-0 ${
                        cls.is_active
                          ? 'badge-status-active'
                          : 'badge-status-inactive'
                      }`}>
                        {cls.is_active ? '● Live' : 'Scheduled'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Class Management ── */}
            <section className="card">
              <h2 className="text-section-title flex items-center gap-2 mb-4">
    c:\Users\Gilbert\OneDrive\Pictures\Screenshots\Screenshot 2026-03-31 213315.png            <BarChart3 className="w-5 h-5 text-[#575f75]" />
                Class Management
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Create Class */}
                <button onClick={() => setIsModalOpen(true)} className="group p-5 rounded-lg surface-container-low dark:bg-gray-800/50 hover-subtle hover-lift text-center transition-all">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-[#0053db]" />
                  </div>
                  <p className="text-sm font-semibold text-[#1a1f2e] dark:text-white">Create Class</p>
                  <p className="text-small mt-1">Schedule a new session</p>
                </button>
                {/* Upload Notes */}
                <button className="group p-5 rounded-lg surface-container-low dark:bg-gray-800/50 hover-subtle hover-lift text-center transition-all">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold text-[#1a1f2e] dark:text-white">Upload Notes</p>
                  <p className="text-small mt-1">Share study materials</p>
                </button>
                {/* Upload Recorded Sessions */}
                <button className="group p-5 rounded-lg surface-container-low dark:bg-gray-800/50 hover-subtle hover-lift text-center transition-all">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-cyan-600" />
                  </div>
                  <p className="text-sm font-semibold text-[#1a1f2e] dark:text-white">Upload Recording</p>
                  <p className="text-small mt-1">Post recorded sessions</p>
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
                  <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                      <div className="flex flex-col flex-1 min-w-[180px]">
                        <label className="text-label mb-2">Class</label>
                        <select
                          value={activeClass?.class_id || ''}
                          onChange={(e) => handleSelectClassForAttendance(e.target.value)}
                          className="input-ghost"
                        >
                          {classes.length === 0 && <option value="">No classes</option>}
                          {classes.map((cls) => (
                            <option key={cls.class_id} value={cls.class_id}>{cls.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col flex-1 min-w-[200px]">
                        <label className="text-label mb-2">Attendance Session</label>
                        <select
                          value={selectedSessionId || ''}
                          onChange={(e) => handleSessionChange(e.target.value)}
                          className="input-ghost"
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleRefreshAttendance}
                        className="flex items-center gap-1.5 btn-secondary px-3 py-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Refresh
                      </button>
                      {selectedSessionId && (
                        <button
                          onClick={() => handleDeleteReport(selectedSessionId)}
                          className="flex items-center gap-1.5 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20 rounded-lg font-semibold text-sm transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {activeClass?.is_active && (
                    <div className="card-compact surface-container-low dark:bg-gray-800/50 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1f2e] dark:text-gray-200">
                          <Radio className="w-4 h-4 text-green-500 animate-pulse" /> Live Engagement Snapshot
                        </div>
                        <span className="text-label">
                          {liveEngagement?.updatedAt
                            ? `Updated ${new Date(liveEngagement.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : liveError || 'Waiting for student signals'}
                        </span>
                      </div>

                      {/* Legend for status indicators */}
                      <div className="flex items-center gap-4 mb-3 text-xs text-[#7a8295] dark:text-gray-400">
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
                                <p className="text-body">
                                  {liveError || 'No engagement data yet. Students will appear once their browsers send presence metadata.'}
                                </p>
                              ) : (
                                <div className="spacing-xs max-h-48 overflow-y-auto pr-1">
                                  {(liveEngagement?.students || []).map((student) => {
                                    const isPresent = Boolean(student.face_detected)
                                    const dotColor = isPresent ? 'bg-green-400' : 'bg-red-400'
                                    const statusText = isPresent ? 'Present' : 'Not Present'
                                    return (
                                      <div key={student.student_id} className="flex items-center justify-between py-1.5 px-3 rounded-lg surface-container-lowest dark:bg-gray-900/50 hover-subtle">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${isPresent ? 'animate-pulse' : ''}`}></span>
                                          <span className="text-sm font-medium text-[#1a1f2e] dark:text-gray-100">{student.student_name}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isPresent ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                            {statusText}
                                          </span>
                                        </div>
                                        <span className="text-xs text-[#7a8295] dark:text-gray-400">
                                          {Math.round(student.engagement_percentage || 0)}%
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {(liveEngagement?.students || []).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-[#e8ecf0] dark:border-gray-700 flex items-center justify-between text-xs text-[#7a8295] dark:text-gray-400">
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
                            <div className="card">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-card-title">Stored Reports</h3>
                                <button
                                  onClick={handleRefreshAttendance}
                                  className="btn-tertiary p-0"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="spacing-sm">
                                {attendanceHistory.slice(0, 5).map((summary) => {
                                  const engagementAvg = Math.round(summary.average_engagement_percentage || 0)
                                  return (
                                    <div key={summary.session_id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover-subtle p-2 rounded-lg transition-all">
                                      <div>
                                        <p className="text-card-title">{formatSessionLabel(summary)}</p>
                                        <p className="text-small mt-0.5">
                                          Duration {formatDurationMinutes(summary.class_duration_seconds)} · Avg engagement {engagementAvg}%
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => handleSessionChange(summary.session_id)}
                                          className="btn-secondary px-3 py-1.5 text-xs"
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReport(summary.session_id)}
                                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-all duration-200"
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
            <section className="card">
              <h2 className="text-section-title flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#575f75]" />
                Student Overview
              </h2>
              {/* Quick summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{presentStudents}</p>
                  <p className="text-label mt-1 text-green-600 dark:text-green-400">Present</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-xl font-bold text-red-700 dark:text-red-400">{Math.max(attendanceData.length - presentStudents, 0)}</p>
                  <p className="text-label mt-1 text-red-600 dark:text-red-400">Absent</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xl font-bold text-[#0053db] dark:text-blue-400">{attendanceData.length}</p>
                  <p className="text-label mt-1 text-[#0053db] dark:text-blue-400">Total</p>
                </div>
              </div>
                  <AttendanceTable attendanceData={attendanceData} classId={activeClass?.class_id} sessionId={attendanceSessionId} />
            </section>
          </div>

          {/* RIGHT COLUMN (1/3) */}
          <div className="spacing-lg">
            {/* ── Announcements / Notices ── */}
            <section className="card lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-section-title flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Announcements
                </h2>
                <button className="btn-tertiary p-0">+ New</button>
              </div>
              <div className="spacing-sm">
                {announcements.length === 0 ? (
                  <p className="text-body text-center py-4">No announcements yet</p>
                ) : announcements.map(ann => (
                  <div key={ann.id} className="p-3.5 rounded-lg surface-container-low dark:bg-gray-800/50 hover:shadow-card transition-all">
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
                        <h4 className="text-label text-[#1a1f2e] dark:text-white">{ann.title}</h4>
                        <p className="text-small mt-0.5 line-clamp-2">{ann.message}</p>
                        <p className="text-[10px] text-[#7a8295] dark:text-gray-400 mt-1.5">{ann.date}</p>
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
            <section className="card">
              <h2 className="text-section-title flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-cyan-500" />
                Quick Links
              </h2>
              <div className="spacing-xs">
                {[
                  { label: 'View All Students', icon: Users, color: 'text-purple-600' },
                  { label: 'Attendance Reports', icon: BarChart3, color: 'text-green-600' },
                  { label: 'Uploaded Notes', icon: FileText, color: 'text-[#0053db]' },
                  { label: 'Recorded Sessions', icon: Video, color: 'text-red-500' },
                ].map((link, i) => (
                  <button key={i} className="w-full flex items-center gap-3 p-3 rounded-lg hover-subtle transition-all text-left group">
                    <link.icon className={`w-4 h-4 ${link.color}`} />
                    <span className="text-sm text-[#575f75] dark:text-gray-300 font-medium flex-1">{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-[#7a8295] dark:text-gray-400 group-hover:text-[#0053db] transition" />
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

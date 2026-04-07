import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Video, BarChart3, Users, Clock, Upload, FileText,
  Bell, ChevronRight, BookOpen, Play, AlertCircle, RefreshCw,
  Trash2, Radio
} from 'lucide-react'
import { io } from 'socket.io-client'
import { classAPI, attendanceAPI } from '../services/api'
import { notifyClassEvent, notifySuccess } from '../services/notifications'
import { SIGNALING_URL } from '../services/webrtc'
import DashboardLayout from '../layouts/DashboardLayout'
import AttendanceTable from '../components/AttendanceTable'
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
  const location = useLocation()
  const handledAttendanceRouteState = useRef(false)
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
    
    // Force refresh when page becomes visible (user returns from classroom)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[TeacherDashboard] Page visible, refreshing class list')
        loadTeacherData()
      }
    }
    
    // Poll for class status updates every 5 seconds to detect finished classes
    const classRefreshInterval = setInterval(() => {
      loadTeacherData()
    }, 5000)
    
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(classRefreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
    const routeState = location.state
    if (handledAttendanceRouteState.current || !routeState?.openAttendanceReport) return
    if (classes.length === 0) return

    const classId = routeState.attendanceClassId || routeState.classId
    if (!classId) return

    const selectedClass = classes.find(cls => cls.class_id === classId)
    if (!selectedClass) return

    handledAttendanceRouteState.current = true

    const openReport = async () => {
      setActiveClass(selectedClass)
      await hydrateAttendanceData(selectedClass, {
        preferredSessionId: routeState.attendanceSessionId || routeState.sessionId || null,
        refreshHistory: true,
      })
    }

    openReport()
  }, [classes, location.state])

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
          // 404 or similar errors likely mean the class has ended
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            console.log('[TeacherDashboard] Class appears to be finished, clearing live engagement')
            setLiveEngagement(null)
            setLiveError(null)
          } else {
            // Only show non-404 errors
            setLiveError(error.message || 'Unable to fetch live engagement')
          }
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
        {/* ── Welcome Banner ── Redesigned for professional look */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-8" />

          <div className="relative">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Welcome, {user?.name || 'Teacher'}!
            </h1>
            <p className="text-blue-100 text-base sm:text-lg font-medium">
              Manage your classes and monitor student engagement in real-time.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={handleStartClass} className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
                <Play className="w-5 h-5" /> Start Class
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Classes', value: classes.length, icon: BarChart3, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
            { label: 'Active Now', value: classes.filter(c => c.is_active).length, icon: Video, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
            { label: 'Total Students', value: totalStudents, icon: Users, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
            { label: 'Avg Engagement', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, a) => s + (a.engagement_percentage || 0), 0) / attendanceData.length) + '%' : '0%', icon: BarChart3, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-lg ${stat.iconBg} dark:${stat.iconBg.replace('100', '900/20')} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN - Classes & Announcements */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Your Classes Section ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  Your Classes
                </h2>
                <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold text-sm">View All</a>
              </div>

              {classes.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No classes created yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.slice(0, 3).map((cls) => {
                    const scheduleTime = cls.schedule_time ? new Date(cls.schedule_time) : null
                    return (
                      <div
                        key={cls.class_id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => navigate(`/classroom/${cls.class_id}`)}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{cls.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {scheduleTime ? scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {cls.enrolled_students?.length || 0} students
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                          cls.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                          {cls.is_active ? '● Live' : 'Scheduled'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Announcements Section ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-6 h-6 text-blue-600" />
                  Announcements
                </h2>
                <button className="text-teal-600 hover:text-teal-700 dark:text-teal-400 text-lg">
                  +
                </button>
              </div>

              {announcements && announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((announcement, i) => (
                    <div key={i} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{announcement}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No announcements yet</p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Updates for your classes will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Quick Links */}
          <div className="space-y-6">

            {/* ── Quick Links ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Links</h2>
              <div className="space-y-3">
                {[
                  { icon: FileText, label: 'Resources', href: '#' },
                  { icon: BarChart3, label: 'Assignments', href: '#' },
                  { icon: BarChart3, label: 'Reports', href: '#' },
                  { icon: Users, label: 'Settings', href: '#' },
                ].map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white font-medium text-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <link.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* ── Class Statistics ── */}
            {activeClass && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Session Stats</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Present</span>
                    <span className="font-bold text-gray-900 dark:text-white">{attendanceData.filter(a => a.attendance_status === 'present').length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Absent</span>
                    <span className="font-bold text-gray-900 dark:text-white">{attendanceData.filter(a => a.attendance_status !== 'present').length}</span>
                  </div>
                </div>
              </div>
            )}
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
    </>
  )
}

export default TeacherDashboard

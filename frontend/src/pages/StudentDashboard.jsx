import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Video, Clock, BookOpen, Search, ArrowRight, Download, Eye,
  Play, Calendar, Bell, Star, FileText, ChevronRight, Users, CheckCircle
} from 'lucide-react'
import { classAPI } from '../services/api'
import { notifyClassEvent, notifySuccess } from '../services/notifications'
import DashboardLayout from '../layouts/DashboardLayout'
import StudentClassesTab from '../components/tabs/StudentClassesTab'
import StudentNotesTab from '../components/tabs/StudentNotesTab'
import StudentRecordingsTab from '../components/tabs/StudentRecordingsTab'
import StudentChatTab from '../components/tabs/StudentChatTab'
import StudentCalendarTab from '../components/tabs/StudentCalendarTab'

// Storage keys (matching other components)
const NOTES_STORAGE_KEY = 'student_notes'
const RECORDINGS_STORAGE_KEY = 'class_recordings'
const NOTIFICATIONS_STORAGE_KEY = 'student_notifications'

function StudentDashboard({ user, onLogout, onUserUpdate }) {
  const navigate = useNavigate()
  const [enrolledClasses, setEnrolledClasses] = useState([])
  const [classToJoin, setClassToJoin] = useState('')
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState([])
  const [recordings, setRecordings] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    loadEnrolledClasses()
    // Load data from localStorage
    try {
      const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY)
      if (savedNotes) setNotes(JSON.parse(savedNotes))
      
      const savedRecordings = localStorage.getItem(RECORDINGS_STORAGE_KEY)
      if (savedRecordings) setRecordings(JSON.parse(savedRecordings))
      
      const savedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
    } catch (e) {
      console.error('Error loading data from localStorage:', e)
    }
  }, [])

  const loadEnrolledClasses = async () => {
    try {
      setLoading(true)
      const classes = await classAPI.getStudentClasses()
      setEnrolledClasses(classes)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleJoinClass = async (classId) => {
    if (!classId) { const id = prompt('Enter Class ID to join:'); if (!id) return; classId = id }
    setLoading(true)
    try {
      try { 
        await classAPI.join(classId)
        // Notify on successful enrollment
        notifyClassEvent('Class Joined', `You have successfully enrolled in the class!`)
      } catch (e) { 
        if (!e.message?.includes('Already enrolled')) throw e 
      }
      notifySuccess('Joining Class', 'Connecting to classroom...')
      navigate(`/classroom/${classId}`)
    } catch (error) { alert('Failed to join class: ' + error.message) } finally { setLoading(false) }
  }

  const handleJoinByClassId = async () => {
    if (!classToJoin.trim()) return alert('Please enter a Class ID')
    await handleJoinClass(classToJoin); setClassToJoin('')
  }

  const colorMap = {
    primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400', dot: 'bg-primary-500' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  }

  const renderTabContent = (activeTab) => {
    switch (activeTab) {
      case 'classes':
        return <StudentClassesTab onJoinClass={handleJoinClass} />
      case 'notes':
        return <StudentNotesTab />
      case 'recordings':
        return <StudentRecordingsTab />
      case 'chat':
        return <StudentChatTab />
      case 'calendar':
        return <StudentCalendarTab classes={enrolledClasses} />
      default:
        return renderDashboard()
    }
  }

  const renderDashboard = () => (
    <div className="space-y-6">

        {/* ── Welcome Section ── */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-white/5 rounded-full translate-y-8" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back, {user?.name || 'Student'}! 
              </h1>
              <p className="text-primary-200 mt-1 text-sm sm:text-base">Ready to continue learning?</p>
              <span className="inline-block mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold tracking-wide uppercase">
                Student
              </span>
            </div>
            {/* Quick join */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-xl p-1.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  value={classToJoin}
                  onChange={e => setClassToJoin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoinByClassId()}
                  placeholder="Enter Class ID..."
                  className="pl-9 pr-3 py-2.5 bg-transparent text-white placeholder:text-white/50 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 w-44 sm:w-52"
                />
              </div>
              <button onClick={handleJoinByClassId} disabled={loading} className="px-4 py-2.5 bg-white text-primary-700 font-semibold text-sm rounded-lg hover:bg-white/90 transition flex items-center gap-1.5">
                <Video className="w-4 h-4" />
                Join
              </button>
            </div>
          </div>
        </div>

        {/* ── Main grid: 2 cols on desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Upcoming Classes ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  Upcoming Classes
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  {enrolledClasses.length} classes
                </span>
              </div>
              <div className="p-5 space-y-3">
                {enrolledClasses.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No classes enrolled yet</p>
                ) : enrolledClasses.map((cls, i) => {
                  const c = colorMap[cls.color] || colorMap.primary
                  const scheduleDate = cls.schedule_time ? new Date(cls.schedule_time) : null
                  return (
                    <div key={cls.class_id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-sm transition-all group cursor-pointer"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                        <BookOpen className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cls.title}</h3>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {cls.teacher_name} &middot; {cls.subject || 'General'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          {scheduleDate && (
                            <>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{scheduleDate.toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.enrolled_count || 0}</span>
                        </div>
                      </div>
                      <button onClick={() => handleJoinClass(cls.class_id)} className="px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        Join <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Class Schedule (Enrolled Classes) ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                  Class Schedule
                </h2>
              </div>
              <div className="p-5">
                {enrolledClasses.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No scheduled classes</p>
                ) : (
                  <div className="space-y-2">
                    {enrolledClasses.map((cls, i) => {
                      const c = colorMap.primary
                      const scheduleDate = cls.schedule_time ? new Date(cls.schedule_time) : null
                      const dayName = scheduleDate ? scheduleDate.toLocaleDateString('en-US', { weekday: 'short' }) : 'TBD'
                      const time = scheduleDate ? scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'
                      return (
                        <div key={cls.class_id} className={`p-3 rounded-lg border border-gray-100 dark:border-gray-800 ${c.bg} transition-all hover:scale-[1.01]`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{cls.title}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{cls.teacher_name}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-[11px] font-bold ${c.text}`}>{dayName}</p>
                              <p className="text-[10px] text-gray-400">{time}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* ── Notes Section ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" />
                  Notes
                </h2>
              </div>
              <div className="p-5 space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No notes available</p>
                ) : notes.slice(0, 3).map(note => {
                  const c = colorMap[note.color] || colorMap.primary
                  return (
                    <div key={note.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all">
                      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <FileText className={`w-4 h-4 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{note.title}</h3>
                          {note.isImportant && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {note.subject} &middot; {note.teacher}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{note.content}</p>
                        {note.attachments?.length > 0 && (
                          <div className="flex items-center gap-2 mt-2.5">
                            {note.attachments.map((file, i) => (
                              <button key={i} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                <Download className="w-3 h-3" />
                                {file}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition flex-shrink-0">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Recorded Sessions ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-500" />
                  Recorded Sessions
                </h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recordings.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 col-span-full">No recordings available</p>
                ) : recordings.slice(0, 3).map(rec => {
                  const c = colorMap[rec.color] || colorMap.primary
                  return (
                    <div key={rec.id} className="group rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all">
                      {/* Thumbnail placeholder */}
                      <div className={`relative h-28 ${c.bg} flex items-center justify-center`}>
                        <div className="w-12 h-12 bg-white/30 dark:bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className={`w-6 h-6 ${c.text} fill-current`} />
                        </div>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded">
                          {rec.duration}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rec.className}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rec.teacher}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-gray-400">{rec.date}</span>
                          <button className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (1/3) */}
          <div className="space-y-6">

            {/* ── Notifications / Announcements ── */}
            <section className="card-interactive overflow-hidden lg:sticky lg:top-24">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Notifications
                </h2>
                <span className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold cursor-pointer hover:underline">
                  View All
                </span>
              </div>
              <div className="p-5 space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No notifications</p>
                ) : notifications.map(notif => (
                  <div key={notif.id} className={`p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                    notif.isRead
                      ? 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                      : 'border-primary-100 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-900/10'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        notif.type === 'announcement' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        notif.type === 'reminder' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        <Bell className={`w-3.5 h-3.5 ${
                          notif.type === 'announcement' ? 'text-blue-600' :
                          notif.type === 'reminder' ? 'text-amber-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{notif.title}</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{notif.time}</p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Enrolled Classes (from API) ── */}
            <section className="card-interactive overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  My Enrolled Classes
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {enrolledClasses.length}
                </span>
              </div>
              <div className="p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  </div>
                ) : enrolledClasses.length > 0 ? (
                  <div className="space-y-2">
                    {enrolledClasses.map(cls => (
                      <button
                        key={cls.class_id}
                        onClick={() => handleJoinClass(cls.class_id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          cls.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Video className={`w-4 h-4 ${cls.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{cls.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{cls.class_id}</p>
                        </div>
                        {cls.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold rounded-full">Live</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No enrolled classes</p>
                    <p className="text-xs text-gray-400 mt-1">Use Quick Join above</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
    </div>
  )

  return (
    <DashboardLayout user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} title="Dashboard">
      {({ activeTab }) => (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
          {renderTabContent(activeTab)}
        </div>
      )}
    </DashboardLayout>
  )
}

export default StudentDashboard

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Video, VideoOff, MessageSquare, Phone,
  HelpCircle, Users, Monitor, Loader2, Clock, GraduationCap
} from 'lucide-react'
import { mockMessages, mockDoubts } from '../data/mockData'
import { classAPI, attendanceAPI, createWebSocket, webcamUtils } from '../services/api'
import EngagementList from '../components/EngagementList'
import ChatPanel from '../components/ChatPanel'
import DoubtsPanel from '../components/DoubtsPanel'

// ─── Waiting Room ───────────────────────────────────────────────────────────
function WaitingRoom({ classData, onClassStarted, onLeave }) {
  const [dots, setDots] = useState('')

  // Animate the waiting dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 600)
    return () => clearInterval(t)
  }, [])

  // Poll every 5 s to check if the teacher activated the class
  useEffect(() => {
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const data = await classAPI.get(classData.class_id)
          if (data.is_active) {
            onClassStarted(data)
            return
          }
        } catch {
          /* ignore network blips */
        }
        await new Promise(r => setTimeout(r, 5000))
      }
    }
    poll()
    return () => { active = false }
  }, [classData.class_id, onClassStarted])

  const scheduleDate = classData.schedule_time
    ? new Date(classData.schedule_time)
    : null

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="max-w-lg w-full mx-4 text-center">
        {/* Pulsing icon */}
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
          <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
            <GraduationCap className="w-14 h-14 text-white" />
          </div>
        </div>

        <h1 className="text-white text-3xl font-bold mb-2">
          {classData.title}
        </h1>
        <p className="text-gray-400 mb-1">
          Teacher: <span className="text-gray-300 font-medium">{classData.teacher_name}</span>
        </p>

        {scheduleDate && (
          <p className="text-gray-500 text-sm flex items-center justify-center gap-1 mb-8">
            <Clock className="w-4 h-4" />
            Scheduled: {scheduleDate.toLocaleDateString()} at{' '}
            {scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Status card */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-8 mb-6">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">
            Waiting for the teacher to start{dots}
          </h2>
          <p className="text-gray-400 text-sm">
            You&apos;ll be connected automatically once the session begins.
            <br />
            Your camera and microphone will be requested when the class starts.
          </p>
        </div>

        <button
          onClick={onLeave}
          className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition font-medium"
        >
          Leave Waiting Room
        </button>
      </div>
    </div>
  )
}

// ─── Live Classroom ─────────────────────────────────────────────────────────
function LiveClassroom({ classData, user, onLeave }) {
  const [micOn, setMicOn] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showEngagement, setShowEngagement] = useState(true)
  const [showDoubts, setShowDoubts] = useState(false)
  const [messages, setMessages] = useState(mockMessages)
  const [doubts, setDoubts] = useState(mockDoubts)
  const [students, setStudents] = useState([])
  const [attendanceId, setAttendanceId] = useState(null)

  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const frameIntervalRef = useRef(null)

  // ── Start / replace media stream ──
  const startMedia = useCallback(async ({ video, audio }) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio: audio,
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      stream.getAudioTracks().forEach(t => { t.enabled = audio })
      stream.getVideoTracks().forEach(t => { t.enabled = video })
      return stream
    } catch (err) {
      console.error('Media access error:', err)
      alert('Could not access camera/microphone. Please check browser permissions.')
      return null
    }
  }, [])

  // ── On mount: request media + start attendance ──
  useEffect(() => {
    const init = async () => {
      const stream = await startMedia({ video: true, audio: true })
      if (stream) {
        setVideoOn(true)
        setMicOn(true)
      }
      if (user?.role === 'student') {
        try {
          const resp = await attendanceAPI.start(classData.class_id)
          setAttendanceId(resp.attendance_id)
        } catch (err) {
          console.error('Failed to start attendance:', err)
        }
      }
    }
    init()
    return () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop())
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  // ── Toggle video track ──
  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const vt = stream.getVideoTracks()
    if (vt.length > 0) {
      vt.forEach(t => { t.enabled = videoOn })
    } else if (videoOn) {
      startMedia({ video: true, audio: micOn })
    }
  }, [videoOn])

  // ── Toggle audio track ──
  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const at = stream.getAudioTracks()
    if (at.length > 0) {
      at.forEach(t => { t.enabled = micOn })
    } else if (micOn) {
      startMedia({ video: videoOn, audio: true })
    }
  }, [micOn])

  // ── Student: send frames for attendance ──
  useEffect(() => {
    if (user?.role !== 'student' || !attendanceId) return
    if (videoOn) {
      frameIntervalRef.current = setInterval(async () => {
        if (canvasRef.current && localVideoRef.current) {
          try {
            const frame = webcamUtils.captureFrame(localVideoRef.current, canvasRef.current)
            await attendanceAPI.submitFrame(attendanceId, frame)
          } catch { /* silent */ }
        }
      }, 3000)
    } else if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
    }
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current) }
  }, [videoOn, attendanceId])

  // ── Teacher: WebSocket for live engagement ──
  useEffect(() => {
    if (user?.role !== 'teacher' || !classData?.class_id) return
    const ws = createWebSocket(classData.class_id)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'engagement_update') {
        setStudents(prev => {
          const idx = prev.findIndex(s => s.id === data.student_id)
          const entry = {
            id: data.student_id,
            name: data.student_name || 'Student',
            engagement: Math.round(data.engagement_percentage),
            status: data.face_detected ? 'active' : 'inactive',
            lookingAtScreen: data.looking_at_screen,
          }
          if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], ...entry }; return u }
          return [...prev, entry]
        })
      }
    }
    wsRef.current = ws
    return () => ws.close()
  }, [classData])

  // ── Handlers ──
  const handleLeaveClass = async () => {
    if (!window.confirm('Leave the classroom?')) return
    if (user?.role === 'student' && attendanceId) {
      try { await attendanceAPI.end(attendanceId) } catch { /* ok */ }
    }
    if (user?.role === 'teacher') {
      try { await classAPI.deactivate(classData.class_id) } catch { /* ok */ }
    }
    onLeave()
  }

  const handleRaiseDoubt = () => {
    const q = prompt('Enter your doubt:')
    if (q?.trim()) {
      setDoubts(prev => [...prev, {
        id: Date.now(), studentName: user.name, question: q.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'pending',
      }])
    }
  }

  const handleSendMessage = (message) => {
    setMessages(prev => [...prev, {
      id: Date.now(), sender: user.name, message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: user.role,
    }])
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-blue-400" />
            <div>
              <h1 className="text-white text-lg font-semibold">{classData?.title || 'Classroom'}</h1>
              <p className="text-gray-400 text-sm">{classData?.teacher_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 border border-green-600/40 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Live</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm font-medium">
                {students.filter(s => s.status !== 'absent').length} Present
              </span>
            </div>
            <button
              onClick={handleLeaveClass}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Engagement (teacher only) */}
        {showEngagement && user?.role === 'teacher' && (
          <div className="w-72 bg-gray-800 border-r border-gray-700 overflow-hidden">
            <EngagementList students={students} />
          </div>
        )}

        {/* Centre — Video area */}
        <div className="flex-1 relative overflow-hidden">
          {videoOn ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay playsInline muted
                className="max-w-full max-h-full object-contain"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-4 right-4">
                <div className={`${user?.role === 'student' ? 'bg-green-600/90 border-green-500' : 'bg-blue-600/90 border-blue-500'} px-4 py-2 rounded-lg border backdrop-blur`}>
                  <p className="text-white text-sm font-medium">
                    {user?.role === 'student' ? '✓ Attendance Active' : '📹 Camera On'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-40 h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <span className="text-white text-5xl font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </span>
                </div>
                <p className="text-white text-2xl font-semibold mb-1">{user?.name}</p>
                <p className="text-gray-400 text-sm uppercase tracking-wide mb-4">{user?.role}</p>
                {user?.role === 'student' && (
                  <p className="text-yellow-400 text-sm">Turn on camera to mark attendance</p>
                )}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${videoOn ? 'bg-green-600' : 'bg-red-600'}`}>
                    Camera Off
                  </span>
                  <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${micOn ? 'bg-green-600' : 'bg-red-600'}`}>
                    {micOn ? 'Mic On' : 'Mic Off'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800/95 border-t border-gray-700 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Left */}
              <div className="flex items-center gap-3">
                {user?.role === 'teacher' && (
                  <button
                    onClick={() => setShowEngagement(v => !v)}
                    className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition"
                    title="Toggle Engagement Panel"
                  >
                    <Users className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Centre */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMicOn(v => !v)}
                  className={`p-4 rounded-full transition ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
                </button>

                <button
                  onClick={() => setVideoOn(v => !v)}
                  className={`p-4 rounded-full transition ${videoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                  title={videoOn ? 'Stop Camera' : 'Start Camera'}
                >
                  {videoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
                </button>

                <button
                  onClick={() => { setShowChat(v => !v); setShowDoubts(false) }}
                  className={`p-4 rounded-full transition relative ${showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title="Chat"
                >
                  <MessageSquare className="w-6 h-6 text-white" />
                  {messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                      {messages.length}
                    </span>
                  )}
                </button>

                {user?.role === 'student' && (
                  <button
                    onClick={handleRaiseDoubt}
                    className="px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 transition flex items-center gap-2"
                  >
                    <HelpCircle className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">Raise Doubt</span>
                  </button>
                )}

                {user?.role === 'teacher' && (
                  <button
                    onClick={() => { setShowDoubts(v => !v); setShowChat(false) }}
                    className={`px-6 py-3 rounded-full transition flex items-center gap-2 relative ${showDoubts ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    <HelpCircle className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">Doubts</span>
                    {doubts.filter(d => d.status === 'pending').length > 0 && (
                      <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                        {doubts.filter(d => d.status === 'pending').length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLeaveClass}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition"
                  title="Leave Classroom"
                >
                  <Phone className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar — Chat / Doubts */}
        {(showChat || showDoubts) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-hidden">
            {showChat && (
              <ChatPanel messages={messages} onSendMessage={handleSendMessage} currentUser={user} />
            )}
            {showDoubts && user?.role === 'teacher' && (
              <DoubtsPanel
                doubts={doubts}
                onResolve={(id) => setDoubts(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d))}
                onDismiss={(id) => setDoubts(prev => prev.filter(d => d.id !== id))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Classroom Component ───────────────────────────────────────────────
function Classroom({ user, onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const data = await classAPI.get(id)
        setClassData(data)
        setIsLive(data.is_active)
      } catch (err) {
        alert('Class not found: ' + err.message)
        navigate(user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchClass()
  }, [id])

  const handleLeave = () => {
    navigate(user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')
  }

  const handleClassStarted = useCallback((updatedData) => {
    setClassData(updatedData)
    setIsLive(true)
  }, [])

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (!classData) return null

  // Teacher always goes straight to live classroom
  if (user.role === 'teacher') {
    return <LiveClassroom classData={classData} user={user} onLeave={handleLeave} />
  }

  // Student: show waiting room until the teacher activates the class
  if (!isLive) {
    return (
      <WaitingRoom
        classData={classData}
        onClassStarted={handleClassStarted}
        onLeave={handleLeave}
      />
    )
  }

  return <LiveClassroom classData={classData} user={user} onLeave={handleLeave} />
}

export default Classroom

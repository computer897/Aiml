import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, MessageSquare, Phone, HelpCircle, Users, Monitor, X } from 'lucide-react'
import { mockMessages, mockDoubts } from '../data/mockData'
import { classAPI, attendanceAPI, createWebSocket, webcamUtils } from '../services/api'
import EngagementList from '../components/EngagementList'
import ChatPanel from '../components/ChatPanel'
import DoubtsPanel from '../components/DoubtsPanel'

function Classroom({ user, onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [micOn, setMicOn] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showEngagement, setShowEngagement] = useState(true)
  const [showDoubts, setShowDoubts] = useState(false)
  const [messages, setMessages] = useState(mockMessages)
  const [doubts, setDoubts] = useState(mockDoubts)
  
  // Backend integration state
  const [classData, setClassData] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [attendanceId, setAttendanceId] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const frameIntervalRef = useRef(null)

  // Load class data and start session
  useEffect(() => {
    loadClassData()
    
    // Cleanup on unmount
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (user?.role === 'student' && attendanceId) {
        handleEndAttendance()
      }
      if (videoRef.current && videoRef.current.srcObject) {
        webcamUtils.stopWebcam(videoRef.current.srcObject)
      }
    }
  }, [id])

  // Start webcam for students
  useEffect(() => {
    if (videoOn && videoRef.current) {
      startWebcam()
    } else if (!videoOn && videoRef.current && videoRef.current.srcObject) {
      webcamUtils.stopWebcam(videoRef.current.srcObject)
      videoRef.current.srcObject = null
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
    }
  }, [videoOn])

  // WebSocket for teacher real-time updates
  useEffect(() => {
    if (user?.role === 'teacher' && classData) {
      connectWebSocket()
    }
  }, [classData])

  const loadClassData = async () => {
    try {
      setLoading(true)
      const data = await classAPI.get(id)
      setClassData(data)
      
      if (user?.role === 'student') {
        await startAttendance()
      }
    } catch (error) {
      console.error('Failed to load class:', error)
    } finally {
      setLoading(false)
    }
  }

  const startAttendance = async () => {
    try {
      const response = await attendanceAPI.start(id)
      setAttendanceId(response.attendance_id)
    } catch (error) {
      console.error('Failed to start attendance:', error)
    }
  }

  const startWebcam = async () => {
    try {
      const stream = await webcamUtils.startWebcam()
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      // Only students send frames for attendance tracking
      if (user?.role === 'student') {
        frameIntervalRef.current = setInterval(async () => {
          if (canvasRef.current && videoRef.current && attendanceId) {
            const frameData = webcamUtils.captureFrame(videoRef.current, canvasRef.current)
            try {
              await attendanceAPI.submitFrame(attendanceId, frameData)
            } catch (error) {
              console.error('Failed to submit frame:', error)
            }
          }
        }, 3000)
      }
    } catch (error) {
      console.error('Failed to start webcam:', error)
      alert('Failed to access webcam. Please check permissions.')
      setVideoOn(false)
    }
  }

  const handleEndAttendance = async () => {
    if (attendanceId) {
      try {
        await attendanceAPI.end(attendanceId)
      } catch (error) {
        console.error('Failed to end attendance:', error)
      }
    }
  }

  const connectWebSocket = () => {
    if (!classData?.class_id) return
    
    const ws = createWebSocket(classData.class_id)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'engagement_update') {
        updateStudentEngagement(data)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
    
    wsRef.current = ws
  }

  const updateStudentEngagement = (data) => {
    setStudents(prevStudents => {
      const studentIndex = prevStudents.findIndex(s => s.id === data.student_id)
      if (studentIndex >= 0) {
        const updated = [...prevStudents]
        updated[studentIndex] = {
          ...updated[studentIndex],
          engagement: Math.round(data.engagement_percentage),
          status: data.face_detected ? 'active' : 'inactive',
          lookingAtScreen: data.looking_at_screen
        }
        return updated
      } else {
        // Add new student
        return [...prevStudents, {
          id: data.student_id,
          name: data.student_name || 'Student',
          engagement: Math.round(data.engagement_percentage),
          status: data.face_detected ? 'active' : 'inactive',
          lookingAtScreen: data.looking_at_screen
        }]
      }
    })
  }

  const handleLeaveClass = async () => {
    if (window.confirm('Are you sure you want to leave the classroom?')) {
      if (user?.role === 'student' && attendanceId) {
        await handleEndAttendance()
      }
      navigate(user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')
    }
  }

  const handleRaiseDoubt = () => {
    const question = prompt('Enter your doubt:')
    if (question && question.trim()) {
      const newDoubt = {
        id: Date.now(),
        studentName: user.name,
        question: question.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'pending'
      }
      setDoubts([...doubts, newDoubt])
      alert('Your doubt has been sent to the teacher!')
    }
  }

  const handleSendMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      sender: user.name,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: user.role
    }
    setMessages([...messages, newMessage])
  }

  const handleResolveDoubt = (doubtId) => {
    setDoubts(doubts.map(d => 
      d.id === doubtId ? { ...d, status: 'resolved' } : d
    ))
  }

  const handleDismissDoubt = (doubtId) => {
    setDoubts(doubts.filter(d => d.id !== doubtId))
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-blue-400" />
            <div>
              <h1 className="text-white text-lg font-semibold">
                {loading ? 'Loading...' : classData?.title || 'Classroom'}
              </h1>
              <p className="text-gray-400 text-sm">
                {classData?.teacher_name || 'Teacher'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm font-medium">
                {students.filter(s => s.status !== 'absent').length} Present
              </span>
            </div>
            <button
              onClick={handleLeaveClass}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Engagement */}
        {showEngagement && user?.role === 'teacher' && (
          <div className="w-72 bg-gray-800 border-r border-gray-700 overflow-hidden">
            <EngagementList students={students} />
          </div>
        )}

        {/* Central Video Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Video Feed (when camera on) */}
            {videoOn ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-w-full max-h-full object-contain mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  <div className={`${user?.role === 'student' ? 'bg-green-600/90 border-green-500' : 'bg-blue-600/90 border-blue-500'} px-4 py-2 rounded-lg border`}>
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
                      {user?.name?.split(' ').map(n => n[0]).join('') || user?.role?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white text-2xl font-semibold mb-2">{user?.name}</p>
                  <p className="text-gray-400 text-sm uppercase tracking-wide">{user?.role}</p>
                  {user?.role === 'student' && (
                    <p className="text-yellow-400 text-sm mt-4">Turn on camera to mark attendance</p>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div className={`px-3 py-1 rounded-full ${videoOn ? 'bg-green-600' : 'bg-red-600'}`}>
                      <span className="text-white text-xs font-medium">
                        {videoOn ? 'Camera On' : 'Camera Off'}
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${micOn ? 'bg-green-600' : 'bg-red-600'}`}>
                      <span className="text-white text-xs font-medium">
                        {micOn ? 'Mic On' : 'Mic Off'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Screen Share Indicator */}
            {user?.role === 'teacher' && (
              <div className="absolute top-4 left-4">
                <div className="bg-gray-800/90 px-4 py-2 rounded-lg border border-gray-700">
                  <p className="text-white text-sm font-medium">📺 Shared Screen</p>
                </div>
              </div>
            )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                {user?.role === 'teacher' && (
                  <button
                    onClick={() => setShowEngagement(!showEngagement)}
                    className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
                    title="Toggle Engagement Panel"
                  >
                    <Users className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMicOn(!micOn)}
                  className={`p-4 rounded-full transition-all ${
                    micOn 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? (
                    <Mic className="w-6 h-6 text-white" />
                  ) : (
                    <MicOff className="w-6 h-6 text-white" />
                  )}
                </button>

                <button
                  onClick={() => setVideoOn(!videoOn)}
                  className={`p-4 rounded-full transition-all ${
                    videoOn 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={videoOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {videoOn ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-white" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowChat(!showChat)
                    if (showDoubts) setShowDoubts(false)
                  }}
                  className={`p-4 rounded-full transition-all relative ${
                    showChat 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
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
                    className="px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    <HelpCircle className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">Raise Doubt</span>
                  </button>
                )}

                {user?.role === 'teacher' && (
                  <button
                    onClick={() => {
                      setShowDoubts(!showDoubts)
                      if (showChat) setShowChat(false)
                    }}
                    className={`px-6 py-3 rounded-full transition-all flex items-center gap-2 relative ${
                      showDoubts 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
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

              <div className="flex items-center gap-3">
                <button
                  onClick={handleLeaveClass}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all"
                  title="Leave Classroom"
                >
                  <Phone className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Chat or Doubts */}
        {(showChat || showDoubts) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-hidden">
            {showChat && (
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUser={user}
              />
            )}
            {showDoubts && user?.role === 'teacher' && (
              <DoubtsPanel
                doubts={doubts}
                onResolve={handleResolveDoubt}
                onDismiss={handleDismissDoubt}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Classroom

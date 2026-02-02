import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, MessageSquare, Phone, HelpCircle, Users, Monitor, X } from 'lucide-react'
import { mockStudents, mockMessages, mockDoubts } from '../data/mockData'
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

  const handleLeaveClass = () => {
    if (window.confirm('Are you sure you want to leave the classroom?')) {
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
              <h1 className="text-white text-lg font-semibold">Advanced Mathematics - Integration</h1>
              <p className="text-gray-400 text-sm">Dr. Sarah Johnson</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm font-medium">
                {mockStudents.filter(s => s.status !== 'absent').length} Present
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Engagement */}
        {showEngagement && (
          <div className="w-72 bg-gray-800 border-r border-gray-700 overflow-hidden">
            <EngagementList students={mockStudents} />
          </div>
        )}

        {/* Center - Main Video Area */}
        <div className="flex-1 flex flex-col bg-black">
          {/* Video Grid / Presenter */}
          <div className="flex-1 relative flex items-center justify-center">
            {/* Presenter Screen */}
            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-40 h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <span className="text-white text-5xl font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('') || user?.role?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-2xl font-semibold mb-2">{user?.name}</p>
                <p className="text-gray-400 text-sm uppercase tracking-wide">{user?.role}</p>
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

            {/* Screen Share Indicator */}
            <div className="absolute top-4 left-4">
              <div className="bg-gray-800/90 px-4 py-2 rounded-lg border border-gray-700">
                <p className="text-white text-sm font-medium">📺 Shared Screen</p>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEngagement(!showEngagement)}
                  className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
                  title="Toggle Engagement Panel"
                >
                  <Users className="w-5 h-5 text-white" />
                </button>
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

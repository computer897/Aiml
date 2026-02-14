import { useState, useRef, useEffect } from 'react'
import { Send, Search, MessageSquare, Users, Loader2 } from 'lucide-react'
import { classAPI } from '../../services/api'

// Local storage key for chat messages
const CHAT_STORAGE_KEY = 'class_chat_messages'

function StudentChatTab() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [searchClasses, setSearchClasses] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedClass) {
      loadMessages(selectedClass.class_id)
    }
  }, [selectedClass])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const enrolledClasses = await classAPI.getStudentClasses()
      // Transform classes for chat display
      const classesForChat = enrolledClasses.map(cls => ({
        id: cls.class_id,
        name: cls.title,
        teacher: cls.teacher_name,
        avatar: cls.title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        online: cls.is_active,
        lastMsg: 'Start a conversation',
        time: cls.schedule_time ? new Date(cls.schedule_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
      }))
      setClasses(classesForChat)
      if (classesForChat.length > 0) {
        setSelectedClass(classesForChat[0])
      }
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = (classId) => {
    const storedMessages = localStorage.getItem(`${CHAT_STORAGE_KEY}_${classId}`)
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages))
    } else {
      setMessages([])
    }
  }

  const saveMessages = (classId, msgs) => {
    localStorage.setItem(`${CHAT_STORAGE_KEY}_${classId}`, JSON.stringify(msgs))
  }

  const handleSend = () => {
    if (!message.trim() || !selectedClass) return
    
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const newMsg = {
      id: Date.now(),
      sender: user.name || 'You',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true
    }
    
    const updatedMessages = [...messages, newMsg]
    setMessages(updatedMessages)
    saveMessages(selectedClass.id, updatedMessages)
    setMessage('')
  }

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(searchClasses.toLowerCase()) ||
    c.teacher.toLowerCase().includes(searchClasses.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chat with teachers and classmates</p>
        </div>
        <div className="text-center py-12 card-interactive">
          <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No classes joined yet</p>
          <p className="text-xs text-gray-400 mt-1">Join a class to start chatting with your teachers and classmates</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chat with teachers and classmates</p>
      </div>

      <div className="card-interactive overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className="flex h-full">
          {/* Class list */}
          <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-200 dark:border-gray-800`}>
            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchClasses} onChange={e => setSearchClasses(e.target.value)}
                  placeholder="Search classes..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Class items */}
            <div className="flex-1 overflow-y-auto">
              {filteredClasses.map(cls => (
                <button key={cls.id}
                  onClick={() => { setSelectedClass(cls); setShowMobileChat(true) }}
                  className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
                    selectedClass?.id === cls.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {cls.avatar}
                    </div>
                    {cls.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cls.name}</h4>
                      {cls.online && <span className="text-[10px] text-green-500 font-semibold">LIVE</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{cls.teacher}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {selectedClass ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedClass.avatar}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{selectedClass.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedClass.teacher}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>Class Chat</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start a conversation with your class</p>
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${msg.isMine ? 'order-last' : ''}`}>
                          {!msg.isMine && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">{msg.sender}</p>}
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            msg.isMine
                              ? 'bg-primary-600 text-white rounded-br-md'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                          }`}>
                            <p className="text-sm">{msg.text}</p>
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-1 ${msg.isMine ? 'text-right mr-1' : 'ml-1'}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                    />
                    <button onClick={handleSend} disabled={!message.trim()}
                      className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Select a class to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentChatTab

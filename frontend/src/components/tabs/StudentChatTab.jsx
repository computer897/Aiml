import { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip, Search, Phone, VideoIcon, MoreVertical, Check, CheckCheck } from 'lucide-react'
import { mockMessages } from '../../data/mockData'

const contacts = [
  { id: 1, name: 'Dr. Sarah Johnson', role: 'Mathematics', avatar: 'SJ', online: true, lastMsg: 'Sure, let me go over it once more', time: '10:18 AM', unread: 0 },
  { id: 2, name: 'Prof. Michael Chen', role: 'Computer Science', avatar: 'MC', online: true, lastMsg: 'Great work on the assignment!', time: '9:45 AM', unread: 2 },
  { id: 3, name: 'Dr. Emily Parker', role: 'Physics', avatar: 'EP', online: false, lastMsg: 'See you in class tomorrow', time: 'Yesterday', unread: 0 },
  { id: 4, name: 'Prof. James Wilson', role: 'English Literature', avatar: 'JW', online: false, lastMsg: 'Please review Act 3', time: 'Yesterday', unread: 1 },
  { id: 5, name: 'Study Group - CS101', role: 'Group Chat', avatar: 'CS', online: true, lastMsg: 'Alice: Can someone share the notes?', time: '8:30 AM', unread: 5 },
]

const chatMessages = [
  { id: 1, sender: 'Dr. Sarah Johnson', text: 'Good morning class! Today we will cover integration by parts.', time: '10:00 AM', isMine: false },
  { id: 2, sender: 'You', text: 'Good morning! Looking forward to it.', time: '10:01 AM', isMine: true },
  { id: 3, sender: 'Alice Johnson', text: 'Great explanation!', time: '10:15 AM', isMine: false },
  { id: 4, sender: 'Dr. Sarah Johnson', text: 'Thank you! Any questions?', time: '10:16 AM', isMine: false },
  { id: 5, sender: 'You', text: 'Yes, can you explain step 3 again? I\'m a bit confused about the substitution part.', time: '10:17 AM', isMine: true },
  { id: 6, sender: 'Dr. Sarah Johnson', text: 'Sure, let me go over it once more. The key is to identify u and dv correctly.', time: '10:18 AM', isMine: false },
  { id: 7, sender: 'Dr. Sarah Johnson', text: 'Remember: choose u as the function that becomes simpler when differentiated.', time: '10:19 AM', isMine: false },
  { id: 8, sender: 'You', text: 'Oh that makes sense now! Thank you so much!', time: '10:20 AM', isMine: true },
]

function StudentChatTab() {
  const [selectedContact, setSelectedContact] = useState(contacts[0])
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(chatMessages)
  const [searchContacts, setSearchContacts] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      sender: 'You',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true
    }])
    setMessage('')
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchContacts.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chat with teachers and classmates</p>
      </div>

      <div className="card-interactive overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className="flex h-full">
          {/* Contact list */}
          <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-200 dark:border-gray-800`}>
            {/* Search contacts */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchContacts} onChange={e => setSearchContacts(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Contact items */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map(contact => (
                <button key={contact.id}
                  onClick={() => { setSelectedContact(contact); setShowMobileChat(true) }}
                  className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
                    selectedContact?.id === contact.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {contact.avatar}
                    </div>
                    {contact.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{contact.name}</h4>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{contact.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{contact.lastMsg}</p>
                  </div>
                  {contact.unread > 0 && (
                    <span className="w-5 h-5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {contact.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-3.5 border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {selectedContact?.avatar}
                </div>
                {selectedContact?.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedContact?.name}</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{selectedContact?.online ? 'Online' : 'Offline'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                  <Phone className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                  <VideoIcon className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${msg.isMine ? 'order-2' : ''}`}>
                    {!msg.isMine && (
                      <p className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender}</p>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl ${
                      msg.isMine
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-700'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${msg.isMine ? 'justify-end mr-1' : 'ml-1'}`}>
                      <span className="text-[10px] text-gray-400">{msg.time}</span>
                      {msg.isMine && <CheckCheck className="w-3 h-3 text-primary-400" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition flex-shrink-0">
                  <Paperclip className="w-4.5 h-4.5 text-gray-400" />
                </button>
                <div className="relative flex-1">
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
                    <Smile className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button onClick={handleSend}
                  className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition flex-shrink-0 disabled:opacity-40"
                  disabled={!message.trim()}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentChatTab

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

function ChatPanel({ messages, onSendMessage, currentUser }) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">In-call messages</h3>
        <p className="text-xs text-gray-400 mt-1">Messages are only visible to people in the call</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        )}
        {messages.map((msg) => {
          const isCurrentUser = msg.sender === currentUser?.name
          return (
            <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">{isCurrentUser ? 'You' : msg.sender}</span>
                <span className="text-xs text-gray-500">{msg.time}</span>
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                isCurrentUser
                  ? 'bg-primary-600 text-white'
                  : msg.role === 'teacher'
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-600/30'
                  : 'bg-gray-700 text-gray-200'
              }`}>
                {msg.message}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 px-3 py-2.5 bg-gray-700 text-white placeholder:text-gray-400 rounded-xl border border-gray-600 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel

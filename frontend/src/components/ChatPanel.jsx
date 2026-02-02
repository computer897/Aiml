import { useState } from 'react'
import { Send, X } from 'lucide-react'

function ChatPanel({ messages, onSendMessage, currentUser }) {
  const [newMessage, setNewMessage] = useState('')

  const handleSend = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      onSendMessage(newMessage)
      setNewMessage('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isCurrentUser = msg.sender === currentUser?.name
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-600">{msg.sender}</span>
                <span className="text-xs text-gray-400">{msg.time}</span>
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : msg.role === 'teacher'
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel

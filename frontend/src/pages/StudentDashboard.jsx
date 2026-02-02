import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Video, GraduationCap, LogOut, Bell, BookOpen, Clock, MessageSquare } from 'lucide-react'
import { scheduledClasses, teacherNotes } from '../data/mockData'
import ClassCard from '../components/ClassCard'
import NoteCard from '../components/NoteCard'

function StudentDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [messageText, setMessageText] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')

  const handleJoinClass = (classId) => {
    navigate(`/classroom/${classId}`)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (messageText && selectedTeacher) {
      alert(`Message sent to ${selectedTeacher}`)
      setMessageText('')
      setSelectedTeacher('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Settings className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Virtual Classroom</span>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition relative">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'ST'}
                  </span>
                </div>
                <button 
                  onClick={onLogout}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p className="text-gray-600">Ready to join your virtual classroom?</p>
        </div>

        <div className="mb-8">
          <button
            onClick={() => handleJoinClass('class-1')}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            <Video className="w-6 h-6" />
            Join Classroom
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-600" />
                  Scheduled Classes
                </h2>
              </div>

              <div className="space-y-4">
                {scheduledClasses.map((classItem) => (
                  <ClassCard 
                    key={classItem.id} 
                    classItem={classItem} 
                    onJoin={handleJoinClass} 
                  />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  Notes & Topics
                </h2>
              </div>

              <div className="space-y-3">
                {teacherNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Message Teacher</h2>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Teacher
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Choose a teacher</option>
                    <option value="Dr. Sarah Johnson">Dr. Sarah Johnson</option>
                    <option value="Prof. Michael Chen">Prof. Michael Chen</option>
                    <option value="Dr. Emily Parker">Dr. Emily Parker</option>
                    <option value="Prof. James Wilson">Prof. James Wilson</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Question/Message
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your question or doubt here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  Send Message
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 text-sm mb-2">Quick Tips</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Be specific about your question</li>
                  <li>• Include the topic if possible</li>
                  <li>• Teachers usually respond within 24 hours</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Plus, Trash2, Users, ChevronDown, ChevronUp, Clock,
  AlertCircle, AlertTriangle, Info, Loader2, X, ArrowLeft
} from 'lucide-react'
import { announcementAPI, classAPI } from '../services/api'

function AnnouncementsPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSeenByModal, setShowSeenByModal] = useState(null)
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    content: '',
    priority: 'normal',
  })
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  
  // Fetch classes and announcements
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    setLoading(true)
    try {
      // Get teacher's classes
      const classesData = await classAPI.getTeacherClasses()
      setClasses(classesData)
      
      // Get announcements for all classes
      const allAnnouncements = []
      for (const cls of classesData) {
        try {
          const classAnnouncements = await announcementAPI.getByClass(cls._id)
          allAnnouncements.push(...classAnnouncements.map(a => ({
            ...a,
            className: cls.title
          })))
        } catch (err) {
          console.error(`Error fetching announcements for class ${cls._id}:`, err)
        }
      }
      
      // Sort by date desc
      allAnnouncements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setAnnouncements(allAnnouncements)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    
    if (!formData.classId || !formData.title || !formData.content) {
      setFormError('Please fill in all required fields')
      return
    }
    
    setCreating(true)
    try {
      await announcementAPI.create(
        formData.classId,
        formData.title,
        formData.content,
        formData.priority
      )
      setShowCreateModal(false)
      setFormData({ classId: '', title: '', content: '', priority: 'normal' })
      fetchData()
    } catch (error) {
      setFormError(error.message || 'Failed to create announcement')
    } finally {
      setCreating(false)
    }
  }
  
  const handleDelete = async (announcementId) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    
    try {
      await announcementAPI.delete(announcementId)
      setAnnouncements(prev => prev.filter(a => a._id !== announcementId))
    } catch (error) {
      console.error('Error deleting announcement:', error)
    }
  }
  
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'important':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }
  
  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      important: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    }
    return styles[priority] || styles.normal
  }
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage announcements for your classes
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>
        
        {/* Announcements List */}
        {announcements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No announcements yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first announcement to notify your students
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Announcement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement._id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getPriorityIcon(announcement.priority)}
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {announcement.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityBadge(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                        {announcement.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(announcement.created_at)}
                        </span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {announcement.className}
                        </span>
                        <button
                          onClick={() => setShowSeenByModal(announcement)}
                          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Seen by {announcement.seen_count}/{announcement.total_students}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedAnnouncement(
                          expandedAnnouncement === announcement._id ? null : announcement._id
                        )}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {expandedAnnouncement === announcement._id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(announcement._id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded content */}
                {expandedAnnouncement === announcement._id && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-gray-700">
                    <div className="pt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Message</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Announcement</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Class *
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Assignment Due Date"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Message *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your announcement here..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Priority
                </label>
                <div className="flex gap-3">
                  {['normal', 'important', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium capitalize transition-colors ${
                        formData.priority === p
                          ? getPriorityBadge(p)
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Announcement'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Seen By Modal */}
      {showSeenByModal && (
        <SeenByModal
          announcement={showSeenByModal}
          onClose={() => setShowSeenByModal(null)}
        />
      )}
    </div>
  )
}

// Seen By Modal Component
function SeenByModal({ announcement, onClose }) {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  
  useEffect(() => {
    fetchSeenBy()
  }, [])
  
  const fetchSeenBy = async () => {
    try {
      const data = await announcementAPI.getSeenBy(announcement._id)
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching seen by:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Seen By ({students.length})
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No students have seen this announcement yet
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium text-sm">
                  {student.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {student.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {student.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AnnouncementsPage

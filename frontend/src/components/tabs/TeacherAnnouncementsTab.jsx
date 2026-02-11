import { useState } from 'react'
import { Megaphone, Plus, Send, Trash2, Edit, AlertCircle, Clock, X, Users, CheckCircle } from 'lucide-react'
import { teacherAnnouncements } from '../../data/mockData'

function TeacherAnnouncementsTab() {
  const [announcements, setAnnouncements] = useState(teacherAnnouncements)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal', targetClass: 'all' })

  const handleCreate = () => {
    if (!form.title || !form.message) return alert('Please fill in title and message.')
    const newAnn = {
      id: 'ta-' + (announcements.length + 1),
      title: form.title,
      message: form.message,
      date: new Date().toISOString().split('T')[0],
      priority: form.priority,
    }
    setAnnouncements([newAnn, ...announcements])
    setForm({ title: '', message: '', priority: 'normal', targetClass: 'all' })
    setShowCreate(false)
  }

  const handleDelete = (id) => {
    setAnnouncements(announcements.filter(a => a.id !== id))
  }

  const priorityConfig = {
    high: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: 'text-red-600', dot: 'bg-red-500', label: 'High Priority' },
    medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-600', dot: 'bg-amber-500', label: 'Medium' },
    normal: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-600', dot: 'bg-blue-500', label: 'Normal' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage announcements for your students</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition flex items-center gap-2">
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'New Announcement'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: announcements.length, color: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
          { label: 'High Priority', value: announcements.filter(a => a.priority === 'high').length, color: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
          { label: 'Medium', value: announcements.filter(a => a.priority === 'medium').length, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
          { label: 'Normal', value: announcements.filter(a => a.priority === 'normal').length, color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className="card-interactive p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card-interactive p-6 border-2 border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary-600" /> Create Announcement
          </h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Announcement title..." className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder="Write your announcement..." rows={3} className="input-base resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="input-base">
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Target</label>
              <select value={form.targetClass} onChange={e => setForm({ ...form, targetClass: e.target.value })}
                className="input-base">
                <option value="all">All Students</option>
                <option value="math">Mathematics Class</option>
                <option value="cs">Computer Science Class</option>
                <option value="physics">Physics Class</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate}
              className="px-5 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition flex items-center gap-2">
              <Send className="w-4 h-4" /> Publish
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      <div className="space-y-3">
        {announcements.map(ann => {
          const pc = priorityConfig[ann.priority] || priorityConfig.normal
          return (
            <div key={ann.id} className="card-interactive p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${pc.bg} flex items-center justify-center flex-shrink-0`}>
                  {ann.priority === 'high' ? <AlertCircle className={`w-5 h-5 ${pc.icon}`} /> :
                   <Megaphone className={`w-5 h-5 ${pc.icon}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{ann.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${pc.bg} ${pc.text}`}>
                      {pc.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.message}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ann.date}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />All Students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition" title="Edit">
                        <Edit className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(ann.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {announcements.length === 0 && (
        <div className="text-center py-12 card-interactive">
          <Megaphone className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No announcements yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first announcement to notify students</p>
        </div>
      )}
    </div>
  )
}

export default TeacherAnnouncementsTab

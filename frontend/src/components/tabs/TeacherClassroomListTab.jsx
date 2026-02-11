import { useState } from 'react'
import {
  Search, Video, Users, Clock, MoreVertical, Play, Trash2,
  Edit, Copy, ExternalLink, BookOpen, ChevronRight, Filter
} from 'lucide-react'
import { todayClasses } from '../../data/mockData'

const colorMap = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
}

function TeacherClassroomListTab({ classes = [], onNavigate, onStartClass, onCreateClass }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | active | scheduled | completed
  const [menuOpen, setMenuOpen] = useState(null)

  // Combine API classes with mock data for a richer display
  const allClasses = [
    ...classes.map(c => ({
      id: c.class_id,
      title: c.title,
      batch: c.description || 'Virtual Classroom',
      time: c.schedule_time ? new Date(c.schedule_time).toLocaleString() : 'Flexible',
      studentCount: c.student_count || 0,
      status: c.is_active ? 'active' : 'scheduled',
      color: 'primary',
      isAPI: true,
    })),
    ...todayClasses.map(c => ({
      id: c.id,
      title: c.className,
      batch: c.batch,
      time: c.time,
      studentCount: c.studentCount,
      status: c.status,
      color: c.color,
      isAPI: false,
    }))
  ]

  const filtered = allClasses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.batch.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const statusCounts = {
    all: allClasses.length,
    active: allClasses.filter(c => c.status === 'active').length,
    scheduled: allClasses.filter(c => c.status === 'scheduled' || c.status === 'upcoming').length,
    completed: allClasses.filter(c => c.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Classroom List</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all your virtual classrooms</p>
        </div>
        <button onClick={onCreateClass}
          className="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition flex items-center gap-2">
          <Video className="w-4 h-4" /> New Classroom
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: statusCounts.all, color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' },
          { label: 'Active', value: statusCounts.active, color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
          { label: 'Scheduled', value: statusCounts.scheduled, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
          { label: 'Completed', value: statusCounts.completed, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
        ].map((s, i) => (
          <div key={i} className="card-interactive p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classrooms..."
            className="input-base pl-10" />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'scheduled', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition capitalize ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Classroom list */}
      <div className="space-y-3">
        {filtered.map(cls => {
          const c = colorMap[cls.color] || colorMap.primary
          return (
            <div key={cls.id} className="card-interactive p-5 hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                  <BookOpen className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{cls.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      cls.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      cls.status === 'completed' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {cls.status === 'active' ? '● Live' : cls.status === 'completed' ? 'Done' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cls.batch}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.time}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.studentCount} students</span>
                    {cls.isAPI && <span className="flex items-center gap-1 text-primary-500"><ExternalLink className="w-3 h-3" />ID: {cls.id}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cls.status !== 'completed' && (
                    <button onClick={() => cls.isAPI ? onStartClass?.(cls.id) : null}
                      className="px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Play className="w-3.5 h-3.5" /> {cls.status === 'active' ? 'Join' : 'Start'}
                    </button>
                  )}
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === cls.id ? null : cls.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === cls.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-10 py-1" onMouseLeave={() => setMenuOpen(null)}>
                        <button className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5" /> Copy ID
                        </button>
                        <button className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 card-interactive">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No classrooms found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new classroom</p>
        </div>
      )}
    </div>
  )
}

export default TeacherClassroomListTab

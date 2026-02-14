import { useState, useEffect } from 'react'
import { Search, Users, Filter, Download, Mail, BarChart3, Eye, ChevronDown, UserCheck, UserX, Clock, RefreshCw } from 'lucide-react'
import { classAPI } from '../../services/api'

function TeacherAttendingStudentsTab({ classes = [] }) {
  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)

  // Load students for the selected class
  useEffect(() => {
    const loadStudents = async () => {
      if (selectedClass === 'all') {
        // Load all students from all classes
        setLoading(true)
        try {
          const allStudents = []
          for (const cls of classes) {
            try {
              const classStudents = await classAPI.getStudents(cls.class_id)
              classStudents.forEach(s => {
                // Avoid duplicates
                if (!allStudents.find(existing => existing.id === s.id)) {
                  allStudents.push({
                    ...s,
                    className: cls.title,
                    classId: cls.class_id,
                    status: 'enrolled',
                    engagement: 0
                  })
                }
              })
            } catch { /* ignore errors for individual class */ }
          }
          setStudents(allStudents)
        } catch (error) {
          console.error('Failed to load students:', error)
        } finally {
          setLoading(false)
        }
      } else {
        // Load students for specific class
        setLoading(true)
        try {
          const classStudents = await classAPI.getStudents(selectedClass)
          const cls = classes.find(c => c.class_id === selectedClass)
          setStudents(classStudents.map(s => ({
            ...s,
            className: cls?.title || selectedClass,
            classId: selectedClass,
            status: 'enrolled',
            engagement: 0
          })))
        } catch (error) {
          console.error('Failed to load students:', error)
          setStudents([])
        } finally {
          setLoading(false)
        }
      }
    }

    if (classes.length > 0) {
      loadStudents()
    }
  }, [selectedClass, classes])

  const filtered = students.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
    if (sortBy === 'engagement') return (b.engagement || 0) - (a.engagement || 0)
    return (a.status || '').localeCompare(b.status || '')
  })

  const totalCount = students.length
  const avgEngagement = students.length > 0 
    ? Math.round(students.reduce((sum, st) => sum + (st.engagement || 0), 0) / students.length) 
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Enrolled Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View students enrolled in your classes</p>
        </div>
        <button 
          onClick={() => setStudents([])}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Enrolled', value: totalCount, icon: Users, color: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
          { label: 'Classes', value: classes.length, icon: UserCheck, color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
          { label: 'Active Classes', value: classes.filter(c => c.is_active).length, icon: UserX, color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
          { label: 'Avg Engagement', value: avgEngagement + '%', icon: BarChart3, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="card-interactive p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
            className="input-base pl-10" />
        </div>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="input-base w-auto">
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.title}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="input-base w-auto">
          <option value="name">Sort by Name</option>
          <option value="engagement">Sort by Engagement</option>
        </select>
      </div>

      {/* Student table */}
      <div className="card-interactive overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Loading students...</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {student.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{student.className}</span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Enrolled
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="View profile">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Send message">
                          <Mail className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No students found</p>
            <p className="text-xs text-gray-400 mt-1">
              {classes.length === 0 
                ? 'Create a class first to have students enroll' 
                : 'Students will appear here when they join your classes'}
            </p>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="card-interactive p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>Showing {filtered.length} of {students.length} students</span>
        <span className="text-primary-500">Real-time engagement data available during live classes</span>
      </div>
    </div>
  )
}

export default TeacherAttendingStudentsTab

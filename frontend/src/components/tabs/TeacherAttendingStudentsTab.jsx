import { useState } from 'react'
import { Search, Users, Filter, Download, Mail, BarChart3, Eye, ChevronDown, UserCheck, UserX, Clock } from 'lucide-react'
import { mockStudents, mockAttendance, todayClasses } from '../../data/mockData'

function TeacherAttendingStudentsTab() {
  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name') // name | engagement | status

  const filtered = mockStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'engagement') return b.engagement - a.engagement
    return a.status.localeCompare(b.status)
  })

  const totalPresent = mockStudents.filter(s => s.status !== 'absent').length
  const totalAbsent = mockStudents.filter(s => s.status === 'absent').length
  const avgEngagement = Math.round(mockStudents.reduce((s, st) => s + st.engagement, 0) / mockStudents.length)
  const highEngagement = mockStudents.filter(s => s.engagement >= 70).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Attending Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor student attendance and engagement</p>
        </div>
        <button className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: mockStudents.length, icon: Users, color: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
          { label: 'Present', value: totalPresent, icon: UserCheck, color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
          { label: 'Absent', value: totalAbsent, icon: UserX, color: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
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
          {todayClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="input-base w-auto">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="distracted">Distracted</option>
          <option value="absent">Absent</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="input-base w-auto">
          <option value="name">Sort by Name</option>
          <option value="engagement">Sort by Engagement</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      {/* Student table */}
      <div className="card-interactive overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Join Time</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Engagement</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(student => {
                const attendance = mockAttendance.find(a => a.id === student.id) || {}
                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {student.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        student.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        student.status === 'distracted' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          student.status === 'active' ? 'bg-green-500' :
                          student.status === 'distracted' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`} />
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {attendance.joinTime || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              student.engagement >= 70 ? 'bg-green-500' :
                              student.engagement >= 40 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${student.engagement}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${
                          student.engagement >= 70 ? 'text-green-600' :
                          student.engagement >= 40 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>{student.engagement}%</span>
                      </div>
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
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No students found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="card-interactive p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>Showing {filtered.length} of {mockStudents.length} students</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> High ({highEngagement})</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Low ({mockStudents.filter(s => s.engagement >= 40 && s.engagement < 70).length})</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical ({mockStudents.filter(s => s.engagement < 40).length})</span>
        </div>
      </div>
    </div>
  )
}

export default TeacherAttendingStudentsTab

import { useState } from 'react'
import {
  BookOpen, Clock, Users, Calendar, ArrowRight, Video,
  Search, Filter, ChevronRight, Star
} from 'lucide-react'
import { scheduledClasses, weeklySchedule } from '../../data/mockData'

const colorMap = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400', dot: 'bg-primary-500', border: 'border-primary-200 dark:border-primary-700' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-700' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500', border: 'border-cyan-200 dark:border-cyan-700' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-700' },
}

function StudentClassesTab({ onJoinClass }) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list') // 'list' | 'schedule'

  const filtered = scheduledClasses.filter(c =>
    c.subject.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Classes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and join your upcoming classes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
          >List View</button>
          <button
            onClick={() => setView('schedule')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${view === 'schedule' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
          >Schedule</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by subject or teacher..."
          className="input-base pl-10"
        />
      </div>

      {view === 'list' ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Classes', value: scheduledClasses.length, icon: BookOpen, color: 'primary' },
              { label: 'Today', value: scheduledClasses.filter(c => c.date === '2026-02-11').length, icon: Calendar, color: 'cyan' },
              { label: 'Teachers', value: [...new Set(scheduledClasses.map(c => c.teacher))].length, icon: Users, color: 'purple' },
              { label: 'This Week', value: scheduledClasses.length, icon: Clock, color: 'amber' },
            ].map((stat, i) => {
              const c = colorMap[stat.color]
              return (
                <div key={i} className="card-interactive p-4">
                  <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
                    <stat.icon className={`w-4 h-4 ${c.text}`} />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Class cards */}
          <div className="space-y-3">
            {filtered.map(cls => {
              const c = colorMap[cls.color] || colorMap.primary
              return (
                <div key={cls.id} className="card-interactive p-5 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <BookOpen className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{cls.subject}</h3>
                        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cls.topic}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">by {cls.teacher}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{cls.date}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{cls.time}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{cls.studentCount} students</span>
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[11px] font-semibold">{cls.duration}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onJoinClass?.(cls.id)}
                      className="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
                    >
                      <Video className="w-4 h-4" />
                      Join
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 card-interactive">
                <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No classes found</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Weekly timetable */
        <div className="card-interactive p-5 overflow-x-auto">
          <div className="min-w-[650px]">
            <div className="grid grid-cols-5 gap-3">
              {weeklySchedule.map(day => (
                <div key={day.day} className="space-y-2">
                  <div className="text-center py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{day.day}</span>
                  </div>
                  {day.slots.map((slot, i) => {
                    const c = colorMap[slot.color] || colorMap.primary
                    return (
                      <div key={i} className={`p-3 rounded-xl ${c.bg} border ${c.border} cursor-pointer hover:scale-[1.03] transition-transform`}>
                        <p className={`text-[11px] font-bold ${c.text}`}>{slot.time}</p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white mt-1">{slot.subject}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{slot.teacher}</p>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentClassesTab

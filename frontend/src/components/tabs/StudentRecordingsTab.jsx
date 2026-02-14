import { useState, useEffect } from 'react'
import { Video, Play, Eye, Clock, Search, Calendar, Download, BookOpen, Loader2 } from 'lucide-react'
import { classAPI } from '../../services/api'

const colorMap = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
}

const colors = ['primary', 'purple', 'cyan', 'amber']

// Local storage key for recordings
const RECORDINGS_STORAGE_KEY = 'class_recordings'

function StudentRecordingsTab() {
  const [search, setSearch] = useState('')
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      // Load enrolled classes
      const enrolledClasses = await classAPI.getStudentClasses()
      const enrolledClassIds = enrolledClasses.map(c => c.class_id)

      // Load recordings from localStorage
      const storedRecordings = localStorage.getItem(RECORDINGS_STORAGE_KEY)
      if (storedRecordings) {
        const allRecordings = JSON.parse(storedRecordings)
        // Filter to only show recordings for enrolled classes
        const relevantRecordings = allRecordings.filter(rec => 
          enrolledClassIds.includes(rec.classId)
        )
        setRecordings(relevantRecordings)
      }
    } catch (error) {
      console.error('Failed to load recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = recordings.filter(r =>
    (r.className || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.teacher || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.subject || '').toLowerCase().includes(search.toLowerCase())
  )

  // Calculate total duration
  const totalDuration = recordings.reduce((sum, r) => {
    const match = (r.duration || '').match(/(\d+)/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0)

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Recorded Sessions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Watch past lectures and sessions anytime</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recordings..." className="input-base pl-10" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Recordings', value: recordings.length, icon: Video, color: 'primary' },
          { label: 'Total Duration', value: formatDuration(totalDuration), icon: Clock, color: 'purple' },
          { label: 'Subjects', value: [...new Set(recordings.map(r => r.subject).filter(Boolean))].length, icon: BookOpen, color: 'cyan' },
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

      {/* Recordings grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rec, idx) => {
            const c = colorMap[colors[idx % colors.length]]
            return (
              <div key={rec.id} className="card-interactive overflow-hidden group hover:shadow-md transition-all">
                {/* Thumbnail */}
                <div className={`relative h-36 ${c.bg} flex items-center justify-center`}>
                  <div className="w-14 h-14 bg-white/30 dark:bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer">
                    <Play className={`w-7 h-7 ${c.text} fill-current`} />
                  </div>
                  <span className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/60 text-white text-xs font-medium rounded-lg">
                    {rec.duration}
                  </span>
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-900/90 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-lg">
                    {rec.subject}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{rec.className}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rec.teacher}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {rec.date}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition" title="Download">
                        <Download className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Watch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 card-interactive">
          <Video className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No recordings available</p>
          <p className="text-xs text-gray-400 mt-1">Recordings from past sessions will appear here</p>
        </div>
      )}
    </div>
  )
}

export default StudentRecordingsTab

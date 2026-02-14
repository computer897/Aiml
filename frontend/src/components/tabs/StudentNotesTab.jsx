import { useState, useEffect } from 'react'
import { FileText, Download, Eye, Star, Search, BookOpen, Loader2 } from 'lucide-react'
import { classAPI } from '../../services/api'

const colorMap = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
}

const colors = ['primary', 'purple', 'cyan', 'amber']

// Local storage key for notes
const NOTES_STORAGE_KEY = 'student_notes'

function StudentNotesTab() {
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [notes, setNotes] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load enrolled classes
      const enrolledClasses = await classAPI.getStudentClasses()
      setClasses(enrolledClasses)

      // Load notes from localStorage (shared by teachers)
      const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY)
      if (storedNotes) {
        const allNotes = JSON.parse(storedNotes)
        // Filter notes to only show those for enrolled classes
        const enrolledClassIds = enrolledClasses.map(c => c.class_id)
        const relevantNotes = allNotes.filter(note => 
          enrolledClassIds.includes(note.classId) || !note.classId
        )
        setNotes(relevantNotes)
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const subjects = ['all', ...new Set(notes.map(n => n.subject).filter(Boolean))]
  
  const filtered = notes.filter(n => {
    const matchSearch = (n.title || '').toLowerCase().includes(search.toLowerCase()) || 
                       (n.subject || '').toLowerCase().includes(search.toLowerCase())
    const matchSubject = selectedSubject === 'all' || n.subject === selectedSubject
    return matchSearch && matchSubject
  })

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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Notes & Materials</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Study materials shared by your teachers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="input-base pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                selectedSubject === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >{s === 'all' ? 'All Subjects' : s}</button>
          ))}
        </div>
      </div>

      {/* Notes grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((note, idx) => {
            const c = colorMap[colors[idx % colors.length]]
            return (
              <div key={note.id} className="card-interactive p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                    <FileText className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{note.title}</h3>
                      {note.isImportant && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{note.subject} &middot; {note.topic}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">by {note.teacher}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{note.content}</p>

                    {/* Attachments */}
                    {note.attachments?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {note.attachments.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">{file}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
                                <Download className="w-3.5 h-3.5 text-primary-600" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[11px] text-gray-400">{note.date}</span>
                      <button className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View Full
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
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No notes available</p>
          <p className="text-xs text-gray-400 mt-1">Notes shared by your teachers will appear here</p>
        </div>
      )}
    </div>
  )
}

export default StudentNotesTab

import { useState, useEffect } from 'react'
import { FileText, Upload, Download, Eye, Trash2, Search, FolderOpen, File, Image, Video, MoreVertical, Plus, X } from 'lucide-react'

const NOTES_STORAGE_KEY = 'teacher_notes_materials'

const colorMap = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
}

const fileTypeIcon = (filename) => {
  if (filename.endsWith('.pdf')) return <FileText className="w-4 h-4 text-red-500" />
  if (filename.endsWith('.zip')) return <FolderOpen className="w-4 h-4 text-amber-500" />
  if (filename.match(/\.(png|jpg|jpeg|gif)$/)) return <Image className="w-4 h-4 text-green-500" />
  if (filename.match(/\.(mp4|avi|mov)$/)) return <Video className="w-4 h-4 text-purple-500" />
  return <File className="w-4 h-4 text-gray-500" />
}

function TeacherNotesMaterialsTab() {
  const [notes, setNotes] = useState([])
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: '', subject: '', topic: '', description: '', isImportant: false })
  const [dragOver, setDragOver] = useState(false)

  // Load notes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(NOTES_STORAGE_KEY)
    if (saved) {
      try {
        setNotes(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading notes:', e)
      }
    }
  }, [])

  // Save notes to localStorage when changed
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
    }
  }, [notes])

  const subjects = ['all', ...new Set(notes.map(n => n.subject))]

  const filtered = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.topic.toLowerCase().includes(search.toLowerCase())
    const matchSubject = selectedSubject === 'all' || n.subject === selectedSubject
    return matchSearch && matchSubject
  })

  // Count all attachments
  const totalFiles = notes.reduce((sum, n) => sum + (n.attachments?.length || 0), 0)

  const handleUpload = () => {
    if (!uploadForm.title || !uploadForm.subject || !uploadForm.topic) {
      alert('Please fill in title, subject and topic.')
      return
    }
    const newNote = {
      id: 'note-' + Date.now(),
      title: uploadForm.title,
      subject: uploadForm.subject,
      topic: uploadForm.topic,
      content: uploadForm.description,
      isImportant: uploadForm.isImportant,
      date: new Date().toLocaleDateString(),
      color: ['primary', 'purple', 'cyan', 'amber'][Math.floor(Math.random() * 4)],
      attachments: []
    }
    setNotes([newNote, ...notes])
    setUploadForm({ title: '', subject: '', topic: '', description: '', isImportant: false })
    setShowUpload(false)
  }

  const handleDelete = (id) => {
    if (confirm('Delete this note?')) {
      setNotes(notes.filter(n => n.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Notes & Materials</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload and manage study materials for your students</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition flex items-center gap-2">
          {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {showUpload ? 'Cancel' : 'Upload Material'}
        </button>
      </div>

      {/* Upload section */}
      {showUpload && (
        <div className="card-interactive p-6 border-2 border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-600" /> Upload New Material
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title</label>
              <input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Material title" className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Subject</label>
              <select value={uploadForm.subject} onChange={e => setUploadForm({ ...uploadForm, subject: e.target.value })}
                className="input-base">
                <option value="">Select subject</option>
                <option>Mathematics</option>
                <option>Computer Science</option>
                <option>Physics</option>
                <option>English Literature</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Topic</label>
              <input value={uploadForm.topic} onChange={e => setUploadForm({ ...uploadForm, topic: e.target.value })}
                placeholder="Topic name" className="input-base" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={uploadForm.isImportant}
                  onChange={e => setUploadForm({ ...uploadForm, isImportant: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as important</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Brief description..." rows={2} className="input-base resize-none" />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false) }}
            className={`p-8 border-2 border-dashed rounded-xl text-center transition-colors ${
              dragOver
                ? 'border-primary-500 bg-primary-100/50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Drag & drop files here, or <span className="text-primary-600 cursor-pointer hover:underline">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOC, PPT, ZIP, Images up to 50MB</p>
          </div>

          <button onClick={handleUpload} className="px-5 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Notes', value: notes.length, icon: FileText, color: 'primary' },
          { label: 'Total Files', value: totalFiles, icon: FolderOpen, color: 'purple' },
          { label: 'Subjects', value: subjects.length - 1, icon: File, color: 'cyan' },
          { label: 'Important', value: notes.filter(n => n.isImportant).length, icon: FileText, color: 'amber' },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
            className="input-base pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjects.map(s => (
            <button key={s} onClick={() => setSelectedSubject(s)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                selectedSubject === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>{s === 'all' ? 'All' : s}</button>
          ))}
        </div>
      </div>

      {/* Materials list */}
      <div className="space-y-3">
        {filtered.map(note => {
          const c = colorMap[note.color] || colorMap.primary
          return (
            <div key={note.id} className="card-interactive p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                  <FileText className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{note.title}</h3>
                    {note.isImportant && (
                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 text-[10px] font-bold rounded">Important</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{note.subject} &middot; {note.topic}</p>
                  <p className="text-xs text-gray-400 mt-1">{note.content}</p>

                  {note.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {note.attachments.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          {fileTypeIcon(file)}
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{file}</span>
                          <button className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition">
                            <Download className="w-3 h-3 text-primary-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] text-gray-400">{note.date}</span>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition" title="Edit">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete">
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

      {filtered.length === 0 && (
        <div className="text-center py-12 card-interactive">
          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No materials found</p>
          <p className="text-xs text-gray-400 mt-1">Upload your first study material</p>
        </div>
      )}
    </div>
  )
}

export default TeacherNotesMaterialsTab

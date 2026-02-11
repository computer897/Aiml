import { useState } from 'react'
import { PlusSquare, Calendar, Clock, FileText, Users, Sparkles, AlertCircle } from 'lucide-react'

function TeacherCreateClassroomTab({ onCreateClass }) {
  const [form, setForm] = useState({
    classId: '',
    title: '',
    description: '',
    subject: '',
    scheduleDate: '',
    scheduleTime: '',
    duration: '60',
    maxStudents: '50',
    enableRecording: true,
    enableChat: true,
    enableAI: true,
  })
  const [creating, setCreating] = useState(false)

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.classId || !form.title || !form.scheduleDate || !form.scheduleTime) {
      return alert('Please fill in all required fields.')
    }
    setCreating(true)
    try {
      await onCreateClass?.({
        classId: form.classId,
        title: form.title,
        description: form.description,
        scheduleTime: `${form.scheduleDate}T${form.scheduleTime}`,
        duration: form.duration,
      })
      setForm({ classId: '', title: '', description: '', subject: '', scheduleDate: '', scheduleTime: '', duration: '60', maxStudents: '50', enableRecording: true, enableChat: true, enableAI: true })
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally { setCreating(false) }
  }

  const generateClassId = () => {
    const id = 'CLS-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    handleChange('classId', id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Create Classroom</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up a new virtual classroom session</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card-interactive p-6 space-y-5">
            {/* Class ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Class ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input required value={form.classId} onChange={e => handleChange('classId', e.target.value)}
                  placeholder="e.g. CLS-ABC123"
                  className="input-base flex-1" />
                <button type="button" onClick={generateClassId}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition whitespace-nowrap flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Generate
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Class Title <span className="text-red-500">*</span>
              </label>
              <input required value={form.title} onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g. Advanced Mathematics - Integration"
                className="input-base" />
            </div>

            {/* Subject + Duration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Subject</label>
                <select value={form.subject} onChange={e => handleChange('subject', e.target.value)}
                  className="input-base">
                  <option value="">Select subject</option>
                  <option>Mathematics</option>
                  <option>Computer Science</option>
                  <option>Physics</option>
                  <option>English Literature</option>
                  <option>Chemistry</option>
                  <option>Biology</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Duration (min)</label>
                <select value={form.duration} onChange={e => handleChange('duration', e.target.value)}
                  className="input-base">
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="75">75 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input type="date" required value={form.scheduleDate} onChange={e => handleChange('scheduleDate', e.target.value)}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <input type="time" required value={form.scheduleTime} onChange={e => handleChange('scheduleTime', e.target.value)}
                  className="input-base" />
              </div>
            </div>

            {/* Max students */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max Students</label>
              <input type="number" value={form.maxStudents} onChange={e => handleChange('maxStudents', e.target.value)}
                min="1" max="500" className="input-base w-32" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe the class content, prerequisites, and what students should prepare..."
                rows={4} className="input-base resize-none" />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Class Settings</h3>
              {[
                { key: 'enableRecording', label: 'Enable Recording', desc: 'Automatically record the session' },
                { key: 'enableChat', label: 'Enable Chat', desc: 'Allow students to chat during class' },
                { key: 'enableAI', label: 'AI Monitoring', desc: 'Enable AI engagement tracking' },
              ].map(toggle => (
                <label key={toggle.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{toggle.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{toggle.desc}</p>
                  </div>
                  <button type="button" onClick={() => handleChange(toggle.key, !form[toggle.key])}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form[toggle.key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[toggle.key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>

            {/* Submit */}
            <button type="submit" disabled={creating}
              className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
              <PlusSquare className="w-5 h-5" />
              {creating ? 'Creating...' : 'Create Classroom'}
            </button>
          </form>
        </div>

        {/* Sidebar tips */}
        <div className="space-y-4">
          <div className="card-interactive p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary-500" />
              Quick Tips
            </h3>
            <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                Use a unique Class ID — students will use it to join
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                Set the correct date and time for scheduling
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                Enable AI monitoring for engagement insights
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                Share the class ID with your students after creation
              </li>
            </ul>
          </div>

          {/* Preview card */}
          {form.title && (
            <div className="card-interactive p-5 border-l-4 border-primary-500">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Preview</h3>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{form.title}</h4>
              {form.classId && <p className="text-xs text-gray-500 mt-1">ID: {form.classId}</p>}
              {form.subject && <p className="text-xs text-gray-500 mt-0.5">{form.subject}</p>}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                {form.scheduleDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{form.scheduleDate}</span>}
                {form.scheduleTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{form.scheduleTime}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{form.duration}m</span>
              </div>
              {form.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{form.description}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherCreateClassroomTab

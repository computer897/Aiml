import { useState } from 'react'
import { Copy, CheckCircle, AlertCircle, Zap } from 'lucide-react'

function TeacherCreateClassroomTab({ onCreateClass, onBack }) {
  const [form, setForm] = useState({
    classId: '',
    title: '',
    description: '',
    subject: '',
    scheduleDate: '',
    scheduleTime: '',
    duration: '45',
    maxStudents: '50',
  })
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

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
      setForm({ classId: '', title: '', description: '', subject: '', scheduleDate: '', scheduleTime: '', duration: '45', maxStudents: '50' })
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally { setCreating(false) }
  }

  const generateClassId = () => {
    const year = new Date().getFullYear().toString().slice(-2)
    const id = `CLASS_${year}24-${Math.floor(Math.random() * 100)}`
    handleChange('classId', id)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(form.classId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={onBack} className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm">
            ← Back
          </button>
          <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        {/* Main Form Card - Premium Design */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6 border border-blue-100">
          <h1 className="text-3xl font-bold text-gray-900">Create Classroom</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Class ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Class ID
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-300 hover:border-blue-300 transition">
                  <span className="text-sm font-mono font-semibold text-gray-900">{form.classId || 'CLASS_XXXX-XX'}</span>
                </div>
                {form.classId ? (
                  <button type="button" onClick={copyToClipboard}
                    className={`px-5 py-3 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : (
                  <button type="button" onClick={generateClassId}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-2">
                    Generate
                  </button>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Class Title
              </label>
              <input required value={form.title} onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g., Advanced European History"
                className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 placeholder-gray-500 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
            </div>

            {/* Subject & Duration Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Subject
                </label>
                <select value={form.subject} onChange={e => handleChange('subject', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration
                </label>
                <select value={form.duration} onChange={e => handleChange('duration', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                  <option value="75">75 Minutes</option>
                  <option value="90">90 Minutes</option>
                  <option value="120">120 Minutes</option>
                </select>
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input type="date" required value={form.scheduleDate} onChange={e => handleChange('scheduleDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time
                </label>
                <input type="time" required value={form.scheduleTime} onChange={e => handleChange('scheduleTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
            </div>

            {/* Max Students */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Max Students
              </label>
              <input type="number" value={form.maxStudents} onChange={e => handleChange('maxStudents', e.target.value)}
                min="1" max="500"
                className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea value={form.description} onChange={e => handleChange('description', e.target.value)}
                placeholder="Briefly describe the classroom objectives..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl text-gray-900 placeholder-gray-500 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none" />
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={creating || !form.classId}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-lg shadow-md hover:shadow-lg">
              {creating ? 'Creating...' : 'Create Classroom'}
            </button>
          </form>
        </div>

        {/* Quick Tips Section */}
        <div className="mt-8 bg-white rounded-3xl shadow-lg p-8 border border-blue-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quick Tips</h2>
          </div>

          <div className="space-y-3 mb-6">
            {[
              'Generate a unique Class ID so students can easily join your classroom',
              'Use the current date and time to schedule your classroom sessions',
              'Add a title to help students identify the subject and topic',
              'Set the maximum students limit to control classroom capacity',
            ].map((tip, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>

          {/* Illustrative Image Placeholder */}
          <div className="mt-6 w-full bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl h-48 flex items-center justify-center border-2 border-dashed border-blue-300">
            <div className="text-center">
              <Zap className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-blue-600 font-medium">Interactive Classroom Experience</p>
              <p className="text-xs text-blue-500 mt-1">Real-time engagement with advanced monitoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherCreateClassroomTab

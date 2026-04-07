import { useState, useMemo } from 'react'
import { X, Upload, Calendar, Clock, AlertCircle, BookOpen } from 'lucide-react'

function CreateClassModal({ isOpen, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    topic: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: '60',
    notes: ''
  })

  // Calculate end time based on start time and duration
  const calculatedEndTime = useMemo(() => {
    if (!formData.startTime || !formData.duration) return ''
    const [hours, minutes] = formData.startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + parseInt(formData.duration)
    const endHours = Math.floor(endMinutes / 60) % 24
    const endMins = endMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  }, [formData.startTime, formData.duration])

  // Calculate class duration in minutes from start and end time
  const classDurationMinutes = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return parseInt(formData.duration) || 60
    const [startH, startM] = formData.startTime.split(':').map(Number)
    const [endH, endM] = formData.endTime.split(':').map(Number)
    let duration = (endH * 60 + endM) - (startH * 60 + startM)
    if (duration <= 0) duration += 24 * 60 // Handle overnight classes
    return duration
  }, [formData.startTime, formData.endTime, formData.duration])

  // Attendance requirement (70% of class time)
  const attendanceRequirement = Math.ceil(classDurationMinutes * 0.7)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Combine date and start time into ISO datetime string
    const scheduleTime = `${formData.date}T${formData.startTime}:00`
    onCreate({
      classId: formData.classId,
      title: formData.title,
      description: formData.topic + (formData.notes ? ' - ' + formData.notes : ''),
      scheduleTime: scheduleTime,
      duration: classDurationMinutes.toString(),
      endTime: formData.endTime || calculatedEndTime
    })
    setFormData({
      classId: '',
      title: '',
      topic: '',
      date: '',
      startTime: '',
      endTime: '',
      duration: '60',
      notes: ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up shadow-2xl">
        {/* Professional Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-2xl sm:rounded-t-2xl px-4 sm:px-6 py-6 sm:py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Create New Classroom</h2>
                <p className="text-blue-100 text-sm">Set up a new class session for your students</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">

          {/* Section 1: Class Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">1</span>
              Class Information
            </h3>
            <div className="space-y-4">
              {/* Class ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Class ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  placeholder="e.g., CS101-2026"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 transition"
                />
              </div>

              {/* Class Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Class Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Advanced Mathematics"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 transition"
                />
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Calculus - Integration Techniques"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Section 2: Schedule */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">2</span>
              Schedule
            </h3>
            <div className="space-y-4">
              {/* Date and Time Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition"
                    />
                  </div>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition"
                    />
                  </div>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="time"
                      value={formData.endTime || calculatedEndTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Preset */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Quick Duration
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value, endTime: '' })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes (Default)</option>
                  <option value="75">75 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Select a preset to auto-calculate end time
                </p>
              </div>
            </div>
          </div>

          {/* Class Details Info Box */}
          {formData.startTime && (formData.endTime || calculatedEndTime) && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Session Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-400">Duration</p>
                      <p className="font-bold text-blue-900 dark:text-blue-200">{classDurationMinutes} min</p>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-400">Attendance Req.</p>
                      <p className="font-bold text-blue-900 dark:text-blue-200">{attendanceRequirement} min (70%)</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-3 leading-relaxed">
                    ℹ️ Students must be present (face detected) for at least <span className="font-semibold">{attendanceRequirement} minutes</span> to be marked as "Present"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Section 3: Additional Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">3</span>
              Additional Details
            </h3>
            <div className="space-y-4">
              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Class Notes <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add instructions, learning objectives, or any additional notes for students..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 transition"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Attach Materials <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, DOC, PPT (Max 10MB)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg"
            >
              Create Classroom
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateClassModal

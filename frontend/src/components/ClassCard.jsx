import { Clock, User } from 'lucide-react'

function ClassCard({ classItem, onJoin }) {
  const scheduleDate = classItem.schedule_time ? new Date(classItem.schedule_time) : null
  const dateStr = scheduleDate ? scheduleDate.toLocaleDateString() : ''
  const timeStr = scheduleDate ? scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={() => onJoin(classItem.class_id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {classItem.title}
          </h3>
          <p className="text-gray-600 text-sm">{classItem.description || classItem.class_id}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          classItem.is_active 
            ? 'bg-green-100 text-green-700 animate-pulse' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {classItem.is_active ? '● Live Now' : 'Upcoming'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span>{classItem.teacher_name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{timeStr}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span>{dateStr}</span>
          <span className="ml-3">Duration: {classItem.duration_minutes || 60} min</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(classItem.class_id) }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
            classItem.is_active
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {classItem.is_active ? 'Join Live' : 'Enter Class'}
        </button>
      </div>
    </div>
  )
}

export default ClassCard

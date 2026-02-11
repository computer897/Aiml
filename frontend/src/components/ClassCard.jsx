import { Clock, User, ArrowRight } from 'lucide-react'

function ClassCard({ classItem, onJoin }) {
  const scheduleDate = classItem.schedule_time ? new Date(classItem.schedule_time) : null
  const dateStr = scheduleDate ? scheduleDate.toLocaleDateString() : ''
  const timeStr = scheduleDate ? scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div
      className="group border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-card-hover transition-all cursor-pointer bg-white dark:bg-gray-800/50"
      onClick={() => onJoin(classItem.class_id)}
    >
      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-0.5 truncate">
            {classItem.title}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">{classItem.description || classItem.class_id}</p>
        </div>
        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0 ${
          classItem.is_active
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        }`}>
          {classItem.is_active ? '● Live' : 'Upcoming'}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{classItem.teacher_name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeStr}</span>
        </div>
      </div>

      <div className="pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="text-[10px] sm:text-xs text-gray-400">
          <span>{dateStr}</span>
          <span className="ml-2 sm:ml-3">{classItem.duration_minutes || 60} min</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(classItem.class_id) }}
          className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
            classItem.is_active
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {classItem.is_active ? 'Join Live' : 'Enter'}
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}

export default ClassCard

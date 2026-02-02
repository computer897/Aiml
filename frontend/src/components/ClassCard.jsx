import { Clock, User } from 'lucide-react'

function ClassCard({ classItem, onJoin }) {
  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={() => onJoin(classItem.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {classItem.subject}
          </h3>
          <p className="text-gray-600 text-sm">{classItem.topic}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          {classItem.status || 'Upcoming'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span>{classItem.teacher}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{classItem.time}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{classItem.date}</span>
          <span>Duration: {classItem.duration || '60 min'}</span>
        </div>
      </div>
    </div>
  )
}

export default ClassCard

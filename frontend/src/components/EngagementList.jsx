import { AlertCircle, CheckCircle, X } from 'lucide-react'

function EngagementList({ students, onSelectStudent }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'border-green-500 bg-green-50'
      case 'distracted':
        return 'border-yellow-500 bg-yellow-50'
      case 'absent':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-300 bg-white'
    }
  }

  const getEngagementColor = (engagement) => {
    if (engagement >= 80) return 'text-green-600'
    if (engagement >= 50) return 'text-yellow-600'
    if (engagement > 0) return 'text-red-600'
    return 'text-gray-400'
  }

  const sortedStudents = [...students].sort((a, b) => {
    if (a.status === 'distracted' && b.status !== 'distracted') return -1
    if (a.status !== 'distracted' && b.status === 'distracted') return 1
    return b.engagement - a.engagement
  })

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Student Engagement</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Distracted</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Absent</span>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedStudents.map((student) => (
          <div
            key={student.id}
            className={`border-l-4 rounded-lg p-3 transition cursor-pointer hover:shadow-md ${getStatusColor(student.status)}`}
            onClick={() => onSelectStudent && onSelectStudent(student)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {student.avatar || student.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">{student.name}</span>
              </div>
              {student.status === 'distracted' && (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              )}
              {student.status === 'active' && student.engagement >= 80 && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${getEngagementColor(student.engagement)}`}>
                {student.engagement}% engaged
              </span>
              <span className="text-xs text-gray-500 capitalize">{student.status}</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  student.engagement >= 80
                    ? 'bg-green-500'
                    : student.engagement >= 50
                    ? 'bg-yellow-500'
                    : student.engagement > 0
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
                style={{ width: `${student.engagement}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EngagementList

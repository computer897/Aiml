import { TrendingUp, Users, UserX } from 'lucide-react'

function EngagementStats({ stats }) {
  const {
    averageEngagement = 0,
    presentStudents = 0,
    absentStudents = 0,
    totalStudents = 0
  } = stats || {}

  const attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Average Engagement */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Avg. Engagement</h3>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900">{averageEngagement}%</span>
          <span className={`text-sm font-medium mb-1 ${averageEngagement >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
            {averageEngagement >= 70 ? '↑ Good' : '↓ Low'}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${averageEngagement >= 70 ? 'bg-green-500' : 'bg-orange-500'}`}
            style={{ width: `${averageEngagement}%` }}
          />
        </div>
      </div>

      {/* Present Students */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Present Students</h3>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900">{presentStudents}</span>
          <span className="text-sm text-gray-500 mb-1">/ {totalStudents}</span>
        </div>
        <p className="text-sm text-green-600 font-medium mt-2">
          {attendanceRate}% Attendance Rate
        </p>
      </div>

      {/* Absent Students */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Absent Students</h3>
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <UserX className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900">{absentStudents}</span>
          <span className="text-sm text-gray-500 mb-1">students</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {absentStudents === 0 ? 'Perfect attendance!' : 'Need follow-up'}
        </p>
      </div>
    </div>
  )
}

export default EngagementStats

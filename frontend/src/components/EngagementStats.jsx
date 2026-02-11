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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
      {/* Average Engagement */}
      <div className="card-interactive p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Engagement</h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{averageEngagement}%</span>
          <span className={`text-xs sm:text-sm font-medium mb-1 ${averageEngagement >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
            {averageEngagement >= 70 ? '↑ Good' : '↓ Low'}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
          <div
            className={`h-1.5 sm:h-2 rounded-full transition-all ${averageEngagement >= 70 ? 'bg-green-500' : 'bg-orange-500'}`}
            style={{ width: `${averageEngagement}%` }}
          />
        </div>
      </div>

      {/* Present */}
      <div className="card-interactive p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Present</h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{presentStudents}</span>
          <span className="text-xs sm:text-sm text-gray-500 mb-1">/ {totalStudents}</span>
        </div>
        <p className="text-xs sm:text-sm text-green-600 font-medium mt-2">{attendanceRate}% Rate</p>
      </div>

      {/* Absent */}
      <div className="card-interactive p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Absent</h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{absentStudents}</span>
          <span className="text-xs sm:text-sm text-gray-500 mb-1">students</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
          {absentStudents === 0 ? 'Perfect!' : 'Follow-up needed'}
        </p>
      </div>
    </div>
  )
}

export default EngagementStats

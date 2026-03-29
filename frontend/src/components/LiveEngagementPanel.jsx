import { useState, useEffect } from 'react'
import { Users, Radio, Eye, EyeOff, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

/**
 * LiveEngagementPanel - Real-time student engagement monitoring
 * Shows green/red status dots based on face detection
 *
 * Status logic:
 *   - Green dot: Face detected AND looking at screen
 *   - Amber dot: Face detected but NOT looking at screen
 *   - Red dot: No face detected
 *   - Gray dot: Student inactive/disconnected
 */
function LiveEngagementPanel({
  students = [],
  isActive = false,
  onRefresh,
  lastUpdated,
  error
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.section?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate summary stats
  const totalStudents = students.length
  const presentCount = students.filter(s => s.face_detected).length
  const engagedCount = students.filter(s => s.face_detected && s.looking_at_screen).length
  const absentCount = totalStudents - presentCount

  // Get status dot color and label
  const getStatusInfo = (student) => {
    if (!student.is_active) {
      return {
        dotColor: 'bg-gray-400',
        ringColor: 'ring-gray-200',
        label: 'Disconnected',
        textColor: 'text-gray-500'
      }
    }
    if (student.face_detected && student.looking_at_screen) {
      return {
        dotColor: 'bg-green-500',
        ringColor: 'ring-green-200',
        label: 'Engaged',
        textColor: 'text-green-600'
      }
    }
    if (student.face_detected) {
      return {
        dotColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
        label: 'Present',
        textColor: 'text-amber-600'
      }
    }
    return {
      dotColor: 'bg-red-500',
      ringColor: 'ring-red-200',
      label: 'Not Detected',
      textColor: 'text-red-600'
    }
  }

  if (!isActive) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Live Engagement</h3>
            <p className="text-sm text-gray-500">No active class session</p>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
          Start a class session to see real-time student engagement
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-green-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Live Engagement</h3>
              <p className="text-xs text-gray-500">
                {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Connecting...'}
              </p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalStudents}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-lg font-bold text-green-600">{engagedCount}</p>
            <p className="text-[10px] text-green-600">Engaged</p>
          </div>
          <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-lg font-bold text-amber-600">{presentCount - engagedCount}</p>
            <p className="text-[10px] text-amber-600">Present</p>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-lg font-bold text-red-600">{absentCount}</p>
            <p className="text-[10px] text-red-600">No Face</p>
          </div>
        </div>

        {/* Search */}
        {totalStudents > 5 && (
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
          />
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Student List */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchQuery ? 'No students match your search' : 'Waiting for students to join...'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const status = getStatusInfo(student)
              return (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Dot with pulse animation for active students */}
                    <div className="relative">
                      <span className={`w-3 h-3 rounded-full ${status.dotColor} block`} />
                      {student.face_detected && student.is_active && (
                        <span className={`absolute inset-0 w-3 h-3 rounded-full ${status.dotColor} animate-ping opacity-75`} />
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {student.student_name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {student.section || 'No section'} · {status.label}
                      </p>
                    </div>
                  </div>

                  {/* Engagement Percentage */}
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${status.textColor}`}>
                      {Math.round(student.engagement_percentage || 0)}%
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {student.looking_at_screen ? (
                        <Eye className="w-3 h-3 text-green-500" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                      )}
                      {student.multiple_faces && (
                        <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                          Multiple
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Engaged</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>No Face</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveEngagementPanel

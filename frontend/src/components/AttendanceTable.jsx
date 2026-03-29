import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { attendanceAPI } from '../services/api'

function AttendanceTable({ attendanceData, classId, sessionId, loading = false }) {
  const [downloading, setDownloading] = useState(false)
  
  const handleDownload = async () => {
    if (!classId || !sessionId) {
      alert('Cannot download: Missing class or session information')
      return
    }
    
    setDownloading(true)
    try {
      const blob = await attendanceAPI.exportCsv(classId, sessionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${classId}_${sessionId}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(error.message || 'Failed to download attendance report')
    } finally {
      setDownloading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700'
      case 'absent':
        return 'bg-red-100 text-red-700'
      case 'late':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getEngagementColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score > 0) return 'text-red-600'
    return 'text-gray-400'
  }

  const canDownload = Boolean(classId && sessionId && !loading)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">Attendance Report</h2>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating…
            </div>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading || !canDownload}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-primary-400 transition-all text-xs sm:text-sm font-medium"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Engagement Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Engagement
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                  {loading ? 'Loading latest attendance data…' : 'No attendance data recorded yet.'}
                </td>
              </tr>
            ) : (
              attendanceData.map((student) => (
                <tr key={student.student_id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-semibold">
                          {student.student_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{student.student_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.section || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.attendance_status)}`}>
                      {student.attendance_status.charAt(0).toUpperCase() + student.attendance_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.engagement_time_label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getEngagementColor(student.engagement_percentage)}`}>
                        {Math.round(student.engagement_percentage)}%
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            student.engagement_percentage >= 80
                              ? 'bg-green-500'
                              : student.engagement_percentage >= 60
                              ? 'bg-yellow-500'
                              : student.engagement_percentage > 0
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${student.engagement_percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AttendanceTable

import { useEffect, useState } from 'react'
import { X, Download, Users, CheckCircle, AlertCircle, Percent } from 'lucide-react'
import { attendanceAPI, downloadBlob } from '../services/api'

/**
 * Shows the finalized attendance report after the teacher ends the class.
 * - Summary: Total Students | Present | Absent | Attendance Rate
 * - Table: Student Name | Section | Engagement Time | Status
 * - "Download CSV" button
 * Props:
 *   report   – array of attendance entries from server
 *   endTime  – ISO string of when the class ended
 *   classTitle – display name of the class
 *   classId  – classroom id for CSV export
 *   sessionId – finalized session id for CSV export
 *   onClose  – called when the user dismisses the modal
 *   autoDownload – (optional) if true, automatically download CSV when modal appears
 */
function AttendanceReportModal({ report = [], endTime, classTitle, classId, sessionId, onClose, autoDownload = false }) {
  const endDate = endTime ? new Date(endTime) : new Date()
  const [downloading, setDownloading] = useState(false)
  const handleClose = (event) => {
    event?.preventDefault?.()
    onClose?.()
  }

  // ── Summary stats ──
  const total = report.length
  const presentCount = report.filter(r => r.attendance_status === 'present').length
  const absentCount = report.filter(r => r.attendance_status === 'absent').length
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0

  // ── Engagement badge styling ──
  const engagementStyle = (status) => {
    switch (status) {
      case 'present': return 'bg-green-900/40 text-green-400'
      case 'absent': return 'bg-red-900/40 text-red-400'
      default: return 'bg-gray-700 text-gray-400'
    }
  }

  // ── Download CSV ──
  const handleDownloadCSV = async () => {
    if (!classId) {
      alert('Class ID is missing. Cannot export.')
      return
    }
    if (!sessionId) {
      alert('Session ID is missing. Cannot export.')
      return
    }

    setDownloading(true)
    try {
      console.log('[AttendanceReportModal] Exporting CSV:', { classId, sessionId })
      const blob = await attendanceAPI.exportCsv(classId, sessionId)
      downloadBlob(blob, `attendance_${classId}_${sessionId}.csv`)
      console.log('[AttendanceReportModal] CSV export successful')
    } catch (error) {
      console.error('[AttendanceReportModal] Export error:', error)
      alert(error.message || 'Failed to download attendance report. Please check your connection and try again.')
    } finally {
      setDownloading(false)
    }
  }

  // ── Auto-download CSV on modal appearance ──
  useEffect(() => {
    if (autoDownload && classId && sessionId) {
      handleDownloadCSV()
    }
  }, [autoDownload, classId, sessionId])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(event) => event.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-white text-lg font-bold">Attendance Report</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {classTitle && <span className="font-medium text-gray-300">{classTitle} · </span>}
              Class ended at {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {endDate.toLocaleDateString()}
            </p>
          </div>
          <button type="button" onClick={handleClose} onTouchEnd={handleClose} className="p-2 hover:bg-gray-700 rounded-full transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ── Summary Stats ── */}
        <div className="px-6 py-4 border-b border-gray-700 flex-shrink-0">
          {/* Main Attendance Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Students', value: total,            color: 'text-white',        icon: Users },
              { label: 'Present',        value: presentCount,     color: 'text-green-400',    icon: CheckCircle },
              { label: 'Absent',         value: absentCount,      color: 'text-red-400',      icon: AlertCircle },
              { label: 'Attendance Rate', value: `${attendanceRate}%`, color: 'text-primary-400', icon: Percent },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-[10px]">{label}</p>
              </div>
            ))}
          </div>

          {/* Attendance Rate Bar */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Overall Attendance</span>
              <span className={`text-sm font-bold ${attendanceRate >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                {attendanceRate}%
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${attendanceRate >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {presentCount} of {total} students met the 70% presence requirement
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {report.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No attendance data recorded for this session.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-700">
                  <th className="text-left pb-3 pr-4">Student Name</th>
                  <th className="text-left pb-3 pr-4">Engagement Time</th>
                  <th className="text-left pb-3 pr-4">Attendance %</th>
                  <th className="text-left pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {report.map((entry, idx) => (
                  <tr key={entry.student_id || idx} className="hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">
                            {(entry.student_name || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium truncate">{entry.student_name || 'Student'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">
                      {entry.engagement_time_label || '0s'}
                    </td>
                    <td className="py-3 pr-4 text-gray-300 font-semibold">
                      {Math.round(entry.engagement_percentage || 0)}%
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${engagementStyle(entry.attendance_status)}`}>
                        {(entry.attendance_status || 'absent').charAt(0).toUpperCase() + (entry.attendance_status || 'absent').slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 flex-shrink-0 bg-gray-800/50">
          <button
            type="button"
            onClick={handleClose}
            onTouchEnd={handleClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition shadow-lg shadow-primary-600/25"
          >
            {downloading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AttendanceReportModal

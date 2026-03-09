import { X, Download, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react'

/**
 * Shows the final attendance report after the teacher ends the class.
 * - Table: Student Name | Join Time | Leave Time | Duration | Engagement
 * - "Download CSV" button
 * Props:
 *   report   – array of attendance entries from server
 *   endTime  – ISO string of when the class ended
 *   classTitle – display name of the class
 *   onClose  – called when the user dismisses the modal
 */
function AttendanceReportModal({ report = [], endTime, classTitle, onClose }) {
  const endDate = endTime ? new Date(endTime) : new Date()

  // ── Summary stats ──
  const total     = report.length
  const attentive = report.filter(r => r.engagementStatus === 'Attentive').length
  const notPresent  = report.filter(r => r.engagementStatus === 'Not Present').length
  const avgDuration = total > 0
    ? Math.round(report.reduce((s, r) => s + (r.totalDuration || 0), 0) / total)
    : 0

  // ── Engagement badge styling ──
  const engagementStyle = (status) => {
    switch (status) {
      case 'Attentive':   return 'bg-green-900/40 text-green-400'
      case 'Distracted':  return 'bg-yellow-900/40 text-yellow-400'
      default:            return 'bg-gray-700 text-gray-400'
    }
  }

  // ── Download CSV ──
  const handleDownloadCSV = () => {
    const header = ['Student Name', 'Join Time', 'Leave Time', 'Duration (min)', 'Engagement Status']
    const rows = report.map(r => [
      `"${r.name || ''}"`,
      r.joinTimeLabel  || r.joinTime  || '',
      r.leaveTimeLabel || r.leaveTime || '',
      r.totalDuration  ?? '',
      r.engagementStatus || 'Not Present',
    ])

    const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `attendance_${classTitle?.replace(/\s+/g, '_') || 'class'}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-white text-lg font-bold">Attendance Report</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {classTitle && <span className="font-medium text-gray-300">{classTitle} · </span>}
              Class ended at {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {endDate.toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-gray-700 flex-shrink-0">
          {[
            { label: 'Total Students', value: total,       color: 'text-white',        icon: Users },
            { label: 'Attentive',      value: attentive,   color: 'text-green-400',    icon: CheckCircle },
            { label: 'Not Present',    value: notPresent,  color: 'text-red-400',      icon: AlertCircle },
            { label: 'Avg Duration',   value: `${avgDuration}m`, color: 'text-primary-400', icon: Clock },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-gray-500 text-[10px]">{label}</p>
            </div>
          ))}
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
                  <th className="text-left pb-3 pr-4">Join Time</th>
                  <th className="text-left pb-3 pr-4">Leave Time</th>
                  <th className="text-left pb-3 pr-4">Duration</th>
                  <th className="text-left pb-3">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {report.map((entry, idx) => (
                  <tr key={entry.socketId || idx} className="hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">
                            {(entry.name || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium truncate">{entry.name || 'Student'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">
                      {entry.joinTimeLabel || (entry.joinTime ? new Date(entry.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">
                      {entry.leaveTimeLabel || (entry.leaveTime ? new Date(entry.leaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">
                      {entry.durationLabel || (entry.totalDuration != null ? `${entry.totalDuration} min` : '—')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${engagementStyle(entry.engagementStatus)}`}>
                        {entry.engagementStatus || 'Not Present'}
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
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition"
          >
            Close
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={report.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition shadow-lg shadow-primary-600/25"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}

export default AttendanceReportModal

import { Radio, Download, Users, FileText } from 'lucide-react'
import { attendanceAPI } from '../services/api'

function EngagementList({ students, onSelectStudent, classId, sessionId }) {
  const sortedStudents = [...students].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const totalStudents = sortedStudents.length
  const presentStudents = sortedStudents.filter((s) => s.isPresent !== false && s.status !== 'inactive').length
  const absentStudents = totalStudents - presentStudents

  // Export attendance to CSV
  const handleExportCSV = async () => {
    if (!classId || !sessionId) {
      alert('Session information not available for export')
      return
    }

    try {
      const blob = await attendanceAPI.exportCSV(classId, sessionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${classId}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export CSV:', err)
      alert('Failed to export attendance CSV. Please try again.')
    }
  }

  // Export attendance to Excel
  const handleExportExcel = async () => {
    if (!classId || !sessionId) {
      alert('Session information not available for export')
      return
    }

    try {
      const blob = await attendanceAPI.exportExcel(classId, sessionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${classId}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export Excel:', err)
      alert('Failed to export attendance Excel file. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 overflow-hidden">
      {/* Header Section */}
      <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-blue-900/20 to-cyan-900/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <h3 className="font-bold text-white text-lg">Live Attendance</h3>
          </div>
          {classId && sessionId && (
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                title="Export as CSV"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleExportExcel}
                className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                title="Export as Excel"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">TOTAL</p>
            <p className="text-white text-2xl font-bold">{totalStudents}</p>
          </div>
          <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 text-center">
            <p className="text-green-400 text-xs mb-1">PRESENT</p>
            <p className="text-green-400 text-2xl font-bold">{presentStudents}</p>
          </div>
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 text-center">
            <p className="text-red-400 text-xs mb-1">ABSENT</p>
            <p className="text-red-400 text-2xl font-bold">{absentStudents}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-700 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-400">Face detected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-gray-400">No face</span>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedStudents.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <Users className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No students yet</p>
            <p className="text-gray-500 text-xs mt-1">Waiting for students to join...</p>
          </div>
        ) : (
          sortedStudents.map((student) => {
            const isPresent = student.isPresent !== false && student.status !== 'inactive'
            return (
              <div
                key={student.id}
                className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 transition hover:bg-gray-900/60 cursor-pointer group"
                onClick={() => onSelectStudent && onSelectStudent(student)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {student.avatar || student.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{student.name}</p>
                      {student.joinTime && (
                        <p className="text-[11px] text-gray-500">Joined {student.joinTime}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                      isPresent
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default EngagementList

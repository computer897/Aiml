import { Radio, Download, Users } from 'lucide-react'
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
      console.error('Failed to export:', err)
      alert('Failed to export attendance. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Live Attendance</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600/20 border border-green-600/40 rounded-full">
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] font-semibold">LIVE</span>
            </div>
            {classId && sessionId && (
              <button
                onClick={handleExportCSV}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition"
                title="Export attendance CSV"
              >
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3 h-3 text-primary-400" />
            </div>
            <p className="text-white text-sm font-bold">{totalStudents}</p>
            <p className="text-gray-500 text-[10px]">Total</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1" />
            <p className="text-green-400 text-sm font-bold">{presentStudents}</p>
            <p className="text-gray-500 text-[10px]">Present</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-1" />
            <p className="text-red-400 text-sm font-bold">{absentStudents}</p>
            <p className="text-gray-500 text-[10px]">Absent</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Face detected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-400">Face not detected</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No students connected yet</p>
            <p className="text-gray-600 text-xs mt-1">Engagement data will appear when students join</p>
          </div>
        ) : (
          sortedStudents.map((student) => (
            <div
              key={student.id}
              className="border border-gray-700 rounded-lg p-3 transition cursor-pointer hover:bg-gray-700/50"
              onClick={() => onSelectStudent && onSelectStudent(student)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {student.avatar || student.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </span>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${student.isPresent !== false && student.status !== 'inactive' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium text-white">{student.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${student.isPresent !== false && student.status !== 'inactive' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {student.isPresent !== false && student.status !== 'inactive' ? 'Present' : 'Not Present'}
                </span>
              </div>

              {student.joinTime && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Joined {student.joinTime}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default EngagementList

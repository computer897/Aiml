import { HelpCircle, CheckCircle, Clock } from 'lucide-react'

function DoubtsPanel({ doubts, onResolve, onDismiss }) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Student Doubts</h3>
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {doubts.filter(d => d.status === 'pending').length} pending
          </span>
        </div>
      </div>

      {/* Doubts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {doubts.length === 0 ? (
          <div className="text-center py-8">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No doubts raised yet</p>
          </div>
        ) : (
          doubts.map((doubt) => (
            <div
              key={doubt.id}
              className={`border rounded-lg p-3 ${
                doubt.status === 'pending'
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className={`w-4 h-4 ${doubt.status === 'pending' ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-900">{doubt.studentName}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{doubt.time}</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{doubt.question}</p>

              {doubt.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onResolve(doubt.id)}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => onDismiss(doubt.id)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Resolved</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default DoubtsPanel

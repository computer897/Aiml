import { Shield, Eye, Camera, CheckCircle, X } from 'lucide-react'

/**
 * Simplified Consent Modal - Google Meet Style
 * Quick confirmation to join with camera/mic on or off
 */
function ConsentModal({ onAccept, onDecline, classTitle }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600/20 rounded-full flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Ready to join?</h2>
              <p className="text-gray-400 text-sm">{classTitle || 'Class Session'}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Attendance is tracked during this session</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Your camera stays private - no video is recorded</span>
            </div>
          </div>

          <p className="text-gray-500 text-xs mb-6 text-center">
            By joining, you agree to attendance monitoring for this class session.
          </p>

          {/* Action Buttons - Google Meet style */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-full font-semibold transition-all duration-200 shadow-lg shadow-primary-600/25"
            >
              Join now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsentModal

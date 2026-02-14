import { Shield, Eye, Camera, CheckCircle, X, AlertTriangle } from 'lucide-react'

/**
 * Consent Modal for AI-based Face Attendance Tracking
 * 
 * Displays transparent information about:
 * - What data is collected (face detection metadata only)
 * - How it's used (attendance tracking)
 * - User's rights (can decline, must consent)
 * 
 * Required for GDPR/privacy compliance and ethical AI usage.
 */
function ConsentModal({ onAccept, onDecline, classTitle }) {
  const privacyPoints = [
    {
      icon: Camera,
      title: 'Camera Access',
      description: 'Your camera will be used to detect face presence for attendance verification.'
    },
    {
      icon: Eye,
      title: 'Local Processing',
      description: 'Face detection runs locally in your browser. No video is sent to servers.'
    },
    {
      icon: Shield,
      title: 'Metadata Only',
      description: 'Only attendance metadata is transmitted: face detected (yes/no), timestamp, engagement score.'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600/20 to-blue-600/20 px-6 py-5 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">AI Attendance Tracking</h2>
              <p className="text-gray-400 text-sm">Privacy consent required to join</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Notice Banner */}
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 text-sm font-medium">Important Notice</p>
                <p className="text-amber-200/70 text-xs mt-1">
                  This class uses AI-based face attendance tracking. Your explicit consent is required to participate.
                </p>
              </div>
            </div>
          </div>

          {/* Class info */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm">You are joining:</p>
            <p className="text-white font-semibold text-lg">{classTitle || 'Class Session'}</p>
          </div>

          {/* Privacy Points */}
          <div className="space-y-4 mb-6">
            <p className="text-gray-300 text-sm font-medium">What this means for you:</p>
            {privacyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl">
                <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <point.icon className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{point.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{point.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* What we DON'T do */}
          <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
            <p className="text-gray-300 text-sm font-medium mb-3">We do NOT:</p>
            <ul className="space-y-2">
              {[
                'Store or transmit any video footage',
                'Save facial images or biometric data',
                'Share data with third parties',
                'Track you outside of class sessions'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <X className="w-3.5 h-3.5 text-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Consent Text */}
          <p className="text-gray-500 text-xs mb-6 leading-relaxed">
            By clicking "Accept & Join", you consent to AI-based face attendance monitoring for this class session only. 
            You can leave the class at any time. Attendance tracking will stop when you leave or turn off your camera 
            (attendance will be marked as "camera off" during that time).
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onDecline}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Accept & Join
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700/50">
          <p className="text-gray-500 text-[10px] text-center">
            Your privacy is important to us. If you have concerns, please contact your instructor.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ConsentModal

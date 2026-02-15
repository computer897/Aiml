import { useState } from 'react'
import { Shield, Camera, Mic, CheckCircle, X, AlertTriangle, Eye } from 'lucide-react'

/**
 * Terms & Conditions Acceptance Screen
 * Shown only on first app load before user can access the app
 */
function TermsAcceptance({ onAccept, onDecline }) {
  const [step, setStep] = useState('terms') // 'terms' | 'permissions'
  const [permissionsGranted, setPermissionsGranted] = useState({
    camera: false,
    microphone: false
  })
  const [loading, setLoading] = useState(false)

  const handleAcceptTerms = () => {
    setStep('permissions')
  }

  const requestPermissions = async () => {
    setLoading(true)
    try {
      // Request both camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      // Permissions granted - stop the stream immediately
      stream.getTracks().forEach(track => track.stop())
      
      setPermissionsGranted({ camera: true, microphone: true })
      
      // Save acceptance and proceed
      localStorage.setItem('terms_accepted', 'true')
      localStorage.setItem('terms_accepted_at', new Date().toISOString())
      localStorage.setItem('permissions_granted', 'true')
      
      // Small delay to show success state
      setTimeout(() => {
        onAccept()
      }, 500)
      
    } catch (error) {
      console.error('Permission denied:', error)
      // Still allow app access but note they denied permissions
      localStorage.setItem('terms_accepted', 'true')
      localStorage.setItem('terms_accepted_at', new Date().toISOString())
      localStorage.setItem('permissions_granted', 'false')
      
      setTimeout(() => {
        onAccept()
      }, 500)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipPermissions = () => {
    localStorage.setItem('terms_accepted', 'true')
    localStorage.setItem('terms_accepted_at', new Date().toISOString())
    localStorage.setItem('permissions_granted', 'false')
    onAccept()
  }

  if (step === 'permissions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600/20 to-blue-600/20 px-6 py-6 text-center border-b border-gray-700/50">
              <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-white font-bold text-xl">Enable Camera & Microphone</h2>
              <p className="text-gray-400 text-sm mt-2">Required for virtual classroom participation</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${permissionsGranted.camera ? 'bg-green-600/20' : 'bg-gray-600/50'}`}>
                    <Camera className={`w-5 h-5 ${permissionsGranted.camera ? 'text-green-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Camera</p>
                    <p className="text-gray-400 text-sm">For video calls and AI attendance</p>
                  </div>
                  {permissionsGranted.camera && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${permissionsGranted.microphone ? 'bg-green-600/20' : 'bg-gray-600/50'}`}>
                    <Mic className={`w-5 h-5 ${permissionsGranted.microphone ? 'text-green-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Microphone</p>
                    <p className="text-gray-400 text-sm">For speaking in class</p>
                  </div>
                  {permissionsGranted.microphone && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>

              <p className="text-gray-500 text-xs text-center">
                You can change these settings later in your browser or device settings.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={requestPermissions}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Allow Access
                    </>
                  )}
                </button>
                <button
                  onClick={handleSkipPermissions}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600/20 to-blue-600/20 px-6 py-6 text-center border-b border-gray-700/50">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl p-2">
              <img src="/logo.png" alt="VC Room" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-white font-bold text-2xl">VC Room</h1>
            <p className="text-primary-300 text-sm mt-1">Virtual Classroom</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <h2 className="text-white font-semibold text-lg mb-4 text-center">Terms & Conditions</h2>

            {/* Terms Box */}
            <div className="bg-gray-700/30 rounded-xl p-4 max-h-64 overflow-y-auto mb-6 text-sm text-gray-300 space-y-3">
              <p className="font-medium text-white">Welcome to VC Room Virtual Classroom</p>
              
              <p>By using this application, you agree to the following terms:</p>

              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-primary-400 font-bold">1.</span>
                  <span><strong>AI-Based Attendance:</strong> This platform uses AI-powered face detection to track attendance during class sessions. Face detection runs locally in your browser.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary-400 font-bold">2.</span>
                  <span><strong>Data Collection:</strong> We collect attendance metadata (timestamps, engagement scores) but do NOT store video footage or facial images on our servers.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary-400 font-bold">3.</span>
                  <span><strong>Camera & Microphone:</strong> You will need to grant camera and microphone access to participate in virtual classes.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary-400 font-bold">4.</span>
                  <span><strong>Appropriate Use:</strong> You agree to use this platform for educational purposes only and maintain appropriate conduct during class sessions.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary-400 font-bold">5.</span>
                  <span><strong>Privacy:</strong> Your personal information is protected according to our privacy policy. College/department data is used only to organize class access.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary-400 font-bold">6.</span>
                  <span><strong>Consent:</strong> By accepting, you consent to AI-based attendance monitoring when joining classes.</span>
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 text-sm font-medium">Important</p>
                  <p className="text-amber-200/70 text-xs mt-1">
                    You must accept these terms to use the application. If you decline, you cannot access the platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onDecline}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
              <button
                onClick={handleAcceptTerms}
                className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Accept & Continue
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700/50">
            <p className="text-gray-500 text-xs text-center">
              By clicking "Accept & Continue", you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsAcceptance

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Mic, MicOff, Video, VideoOff, MessageSquare, Phone,
  HelpCircle, Users, Monitor, Loader2, Clock,
  Shield, AlertCircle, MonitorUp, Hand, X, UserX, Eye
} from 'lucide-react'
import { classAPI, attendanceAPI, createWebSocket, webcamUtils } from '../services/api'
import { createWebRTCManager } from '../services/webrtc'
import { createFaceTracker, generateAttendanceMetadata, loadFaceDetectionModels } from '../services/faceDetection'
import EngagementList from '../components/EngagementList'
import ChatPanel from '../components/ChatPanel'
import DoubtsPanel from '../components/DoubtsPanel'
// import ConsentModal from '../components/ConsentModal'
import AttendanceReportModal from '../components/AttendanceReportModal'
import { useEngagementDetection } from '../hooks/useEngagementDetection'

// ─── Permission Dialog (Google Meet Style) ─────────────────────────────────
function PermissionDialog({ onAllow, onDeny }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-gray-700">
        <div className="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">
          Allow camera and microphone access
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          To participate in this meeting, you need to allow access to your camera and microphone.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onDeny} className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition font-medium">
            Deny
          </button>
          <button onClick={onAllow} className="px-6 py-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition font-medium">
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pre-Join Screen (Google Meet Style) ────────────────────────────────────
function PreJoinScreen({ classData, user, onJoin, onLeave }) {
  const [micOn, setMicOn] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [stream, setStream] = useState(null)
  const [permissionState, setPermissionState] = useState('prompt')
  const [showPermissionDialog, setShowPermissionDialog] = useState(true)
  // const [showConsentModal, setShowConsentModal] = useState(false)
  // const [consentGiven, setConsentGiven] = useState(false)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef(null)

  const requestPermissions = async () => {
    setLoading(true)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      })
      setStream(mediaStream)
      setPermissionState('granted')
      setShowPermissionDialog(false)
      setMicOn(true)
      setVideoOn(true)
    } catch {
      setPermissionState('denied')
      setShowPermissionDialog(false)
    }
    setLoading(false)
  }

  const denyPermissions = () => {
    setPermissionState('denied')
    setShowPermissionDialog(false)
  }

  // Attach or detach stream based on videoOn state
  useEffect(() => {
    if (!videoRef.current) return
    
    if (stream && videoOn) {
      // Attach stream when video should be on
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
    } else {
      // Detach stream when video should be off
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream, videoOn])

  useEffect(() => {
    if (stream) stream.getAudioTracks().forEach(t => { t.enabled = micOn })
  }, [micOn, stream])

  useEffect(() => {
    if (stream) stream.getVideoTracks().forEach(t => { t.enabled = videoOn })
  }, [videoOn, stream])

  useEffect(() => {
    return () => {
      // Don't stop stream here - it gets passed to LiveClassroom
    }
  }, [])

  const handleJoin = () => {
    // Consent logic removed; students join directly
    onJoin({ micOn, videoOn, stream })
  }

  const showVideo = permissionState === 'granted' && videoOn

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {showPermissionDialog && <PermissionDialog onAllow={requestPermissions} onDeny={denyPermissions} />}
      <div className="max-w-2xl w-full flex flex-col items-center justify-center">
        {/* Video Preview Only */}
        <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video w-full max-w-md mb-8">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${showVideo ? '' : 'hidden'}`} 
            style={{ transform: 'scaleX(-1)' }} 
          />
          {!showVideo && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {user?.name?.split(' ').map(n => n[0]).join('') || '?'}
                </span>
              </div>
            </div>
          )}
          {permissionState === 'denied' && (
            <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
              <div className="text-center p-4">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <p className="text-white font-medium mb-2">Camera access blocked</p>
                <p className="text-gray-400 text-sm">Click the camera icon in your browser&apos;s address bar to enable</p>
                <button onClick={requestPermissions} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm">
                  Try Again
                </button>
              </div>
            </div>
          )}
          {permissionState === 'granted' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button onClick={() => setMicOn(v => !v)} className={`p-3 rounded-full transition ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>
              <button onClick={() => setVideoOn(v => !v)} className={`p-3 rounded-full transition ${videoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                {videoOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
              </button>
            </div>
          )}
        </div>
        {/* Simple Join/Cancel Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <button onClick={handleJoin} disabled={loading} className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition font-semibold disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : user?.role === 'teacher' ? 'Start Meeting' : 'Join Now'}
          </button>
          <button onClick={onLeave} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiting Room ───────────────────────────────────────────────────────────
function WaitingRoom({ classData, onClassStarted, onLeave }) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const data = await classAPI.get(classData.class_id)
          if (data.is_active) {
            onClassStarted(data)
            return
          }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 5000))
      }
    }
    poll()
    return () => { active = false }
  }, [classData.class_id, onClassStarted])

  const scheduleDate = classData.schedule_time ? new Date(classData.schedule_time) : null

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 safe-bottom">
      <div className="max-w-lg w-full text-center">
        <div className="relative inline-flex mb-6 sm:mb-8">
          <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping" />
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 bg-white/10 backdrop-blur rounded-full flex items-center justify-center shadow-2xl p-3">
            <img src="/logo.png" alt="VC Room" className="w-full h-full object-contain" />
          </div>
        </div>

        <h1 className="text-white text-xl sm:text-3xl font-bold mb-2">{classData.title}</h1>
        <p className="text-gray-400 mb-1 text-sm sm:text-base">
          Teacher: <span className="text-gray-300 font-medium">{classData.teacher_name}</span>
        </p>

        {scheduleDate && (
          <p className="text-gray-500 text-xs sm:text-sm flex items-center justify-center gap-1 mb-6 sm:mb-8">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {scheduleDate.toLocaleDateString()} at {scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-5 sm:p-8 mb-6">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary-400 animate-spin mx-auto mb-4" />
          <h2 className="text-white text-base sm:text-xl font-semibold mb-2">Waiting for the teacher{dots}</h2>
          <p className="text-gray-400 text-xs sm:text-sm">You&apos;ll be connected automatically once the session begins.</p>
        </div>

        <button onClick={onLeave} className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition font-medium text-sm">
          Leave
        </button>
      </div>
    </div>
  )
}

// ─── Waiting For Approval Screen (Google Meet style) ────────────────────────
function WaitingForApprovalScreen({ classData, onLeave, connectionState }) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 600)
    return () => clearInterval(t)
  }, [])

  const isConnecting = connectionState === 'connecting'
  const hasError = connectionState === 'error'

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 safe-bottom">
      <div className="max-w-lg w-full text-center">
        <div className="relative inline-flex mb-6 sm:mb-8">
          <div className={`absolute inset-0 ${hasError ? 'bg-red-500/20' : 'bg-yellow-500/20'} rounded-full animate-pulse`} />
          <div className={`relative w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br ${hasError ? 'from-red-600 to-red-700' : 'from-yellow-600 to-orange-600'} rounded-full flex items-center justify-center shadow-2xl`}>
            {hasError ? <AlertCircle className="w-10 h-10 sm:w-14 sm:h-14 text-white" /> : <Clock className="w-10 h-10 sm:w-14 sm:h-14 text-white" />}
          </div>
        </div>

        <h1 className="text-white text-xl sm:text-3xl font-bold mb-2">{classData.title}</h1>
        <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
          Teacher: <span className="text-gray-300 font-medium">{classData.teacher_name}</span>
        </p>

        <div className={`bg-gray-800/80 border ${hasError ? 'border-red-600/30' : 'border-yellow-600/30'} rounded-2xl p-5 sm:p-8 mb-6`}>
          {hasError ? (
            <>
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mx-auto mb-4" />
              <h2 className="text-white text-base sm:text-xl font-semibold mb-2">Connection Error</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4">
                Unable to connect to the classroom server. Please check your internet connection and try again.
              </p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm">
                Retry
              </button>
            </>
          ) : isConnecting ? (
            <>
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary-400 animate-spin mx-auto mb-4" />
              <h2 className="text-white text-base sm:text-xl font-semibold mb-2">Connecting{dots}</h2>
              <p className="text-gray-400 text-xs sm:text-sm">
                Establishing connection to the classroom...
              </p>
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 animate-spin mx-auto mb-4" />
              <h2 className="text-white text-base sm:text-xl font-semibold mb-2">Waiting for approval{dots}</h2>
              <p className="text-gray-400 text-xs sm:text-sm">
                The host will let you in soon. Please wait.
              </p>
            </>
          )}
        </div>

        <button onClick={onLeave} className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition font-medium text-sm">
          Leave
        </button>
      </div>
    </div>
  )
}

// ─── Join Rejected Screen ────────────────────────────────────────────────────
function JoinRejectedScreen({ classData, onLeave }) {
  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 safe-bottom">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6">
          <UserX className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
        </div>

        <h1 className="text-white text-xl sm:text-3xl font-bold mb-2">Request Denied</h1>
        <p className="text-gray-400 mb-6 text-sm sm:text-base">
          The host has denied your request to join this meeting.
        </p>

        <button onClick={onLeave} className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium">
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}

// ─── Join Request Modal (Teacher sees this - Centered Professional Design) ──
function JoinRequestModal({ requests, onAccept, onReject, onAcceptAll, onRejectAll }) {
  if (!requests || requests.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[70dvh] sm:max-h-[85dvh] animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 px-4 py-3 border-b border-gray-700/50 flex-shrink-0">
          {/* Drag handle (mobile) */}
          <div className="w-8 h-1 bg-gray-600 rounded-full mx-auto mb-2 sm:hidden" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base leading-tight">Waiting Room</h2>
              <p className="text-gray-400 text-xs">{requests.length} {requests.length === 1 ? 'person' : 'people'} waiting</p>
            </div>
          </div>
        </div>

        {/* Participant List — scrolls independently so footer always visible */}
        <div className="flex-1 overflow-y-auto">
          {requests.map((req, index) => (
            <div
              key={req.socketId}
              className={`px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700/30 transition-colors ${index !== requests.length - 1 ? 'border-b border-gray-700/30' : ''}`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">
                    {(req.userName || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
                  <Clock className="w-2 h-2 text-gray-900" />
                </div>
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{req.userName || 'Student'}</p>
                <p className="text-gray-500 text-xs">Requesting to join</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onReject(req.socketId)}
                  className="p-2 rounded-full bg-gray-700 hover:bg-red-600/80 text-gray-400 hover:text-white transition-all duration-200"
                  title="Deny"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAccept(req.socketId)}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-full text-xs font-semibold transition-all duration-200 shadow-md"
                >
                  Admit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        {requests.length > 1 && (
          <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700/50 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => requests.forEach(r => onReject(r.socketId))}
              className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-xs font-medium transition-all duration-200"
            >
              Deny all
            </button>
            <button
              onClick={() => requests.forEach(r => onAccept(r.socketId))}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl text-xs font-medium transition-all duration-200 shadow-md"
            >
              Admit all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Class Finished Screen ───────────────────────────────────────────────────
function ClassFinishedScreen({ classData, onLeave }) {
  const endTime = classData?.ended_at ? new Date(classData.ended_at) : new Date()
  
  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with icon */}
          <div className="relative px-8 pt-10 pb-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-green-600/10 to-transparent" />
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-green-500/25">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">Class Ended</h1>
              <p className="text-gray-400">This session has been completed</p>
            </div>
          </div>

          {/* Class Details */}
          <div className="px-8 pb-6">
            <div className="bg-gray-800/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center p-2">
                  <img src="/logo.png" alt="VC Room" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Class</p>
                  <p className="text-white font-medium">{classData?.title || 'Class Session'}</p>
                </div>
              </div>
              
              <div className="h-px bg-gray-700/50" />
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Teacher</p>
                  <p className="text-white font-medium">{classData?.teacher_name || 'Instructor'}</p>
                </div>
              </div>
              
              <div className="h-px bg-gray-700/50" />
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Ended at</p>
                  <p className="text-white font-medium">
                    {endTime.toLocaleDateString()} at {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="px-8 pb-8">
            <button
              onClick={onLeave}
              className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-gray-600 text-sm mt-6">
          Thank you for participating in this class
        </p>
      </div>
    </div>
  )
}

// ─── Teacher Left Banner ─────────────────────────────────────────────────────
function TeacherLeftBanner({ onLeave }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center border border-gray-700">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">The teacher has left</h2>
        <p className="text-gray-400 text-sm mb-6">The host ended the meeting. You will be redirected to the dashboard.</p>
        <button onClick={onLeave} className="px-6 py-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition font-medium">
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}

// ─── Removed From Room Banner ────────────────────────────────────────────────
function RemovedBanner({ onLeave }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center border border-gray-700">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserX className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">You&apos;ve been removed</h2>
        <p className="text-gray-400 text-sm mb-6">The host has removed you from this meeting.</p>
        <button onClick={onLeave} className="px-6 py-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition font-medium">
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}

// ─── Video Tile (Reusable) ───────────────────────────────────────────────────
function VideoTile({ stream, name, role, isLocal, videoOn, size = 'normal', micOn, mirror = isLocal, fit = 'cover', isScreenShare = false }) {
  const videoRef = useRef(null)
  const showVideo = stream && videoOn === true

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream
        // Log audio track state for debugging
        const audioTracks = stream.getAudioTracks()
        console.log(`[VideoTile] ${isLocal ? 'LOCAL' : 'REMOTE'} (${name}) stream attached — audio tracks:`, audioTracks.length, audioTracks.map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })))
        console.log(`[VideoTile] <video> element muted=${isLocal} for ${name}`)
        el.play().catch(err => console.warn(`[VideoTile] play() failed for ${name}:`, err))
      }
    } else {
      if (el.srcObject) {
        el.srcObject = null
      }
    }
  }, [stream, isLocal, name])

  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'
  const isSmall = size === 'small'
  const avatarSize = isSmall ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-16 h-16 sm:w-24 sm:h-24'
  const textSize = isSmall ? 'text-sm' : 'text-2xl sm:text-4xl'
  const badgeText = isSmall ? 'text-[10px]' : 'text-xs'

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden group transition-all duration-300">
      {/* Video element — muted ONLY for local preview (isLocal), unmuted for remote so audio plays */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${fit === 'contain' ? 'screen-share-video object-contain bg-black' : 'object-cover'} ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={mirror ? { transform: 'scaleX(-1)' } : undefined}
      />
      {/* Avatar fallback when camera is off */}
      {!showVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
          <div className={`${avatarSize} ${role === 'teacher' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'} rounded-full flex items-center justify-center shadow-xl`}>
            <span className={`text-white ${textSize} font-bold`}>{initials}</span>
          </div>
        </div>
      )}
      {/* Name badge */}
      <div className={`absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 ${isScreenShare ? 'z-20' : ''}`}>
        <div className={`px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/60 backdrop-blur-sm rounded-md text-white ${badgeText} font-medium max-w-[100px] sm:max-w-[140px] truncate flex items-center gap-1`}>
          {isLocal ? 'You' : name || 'Participant'}
          {role === 'teacher' && !isSmall && ' (Host)'}
          {micOn === false && <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400 flex-shrink-0" />}
        </div>
      </div>
      {/* Pin indicator for teacher */}
      {role === 'teacher' && !isSmall && !isScreenShare && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600/80 backdrop-blur-sm rounded-md text-white text-[10px] font-semibold uppercase tracking-wider">
          Host
        </div>
      )}
    </div>
  )
}

// ─── Remote Audio Player ─────────────────────────────────────────────────────
// Dedicated <audio> elements for each remote peer — guarantees audio playback
// Elements MUST be appended to the DOM for autoplay to work in all browsers.
function RemoteAudioPlayer({ remoteStreams }) {
  const audioRefs = useRef({})
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    Object.entries(remoteStreams).forEach(([socketId, { stream }]) => {
      if (!stream) return
      const audioTracks = stream.getAudioTracks()
      console.log(`[RemoteAudioPlayer] Peer ${socketId} — audio tracks:`, audioTracks.length, audioTracks.map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })))
      if (audioTracks.length === 0) return

      let audio = audioRefs.current[socketId]
      if (!audio) {
        audio = document.createElement('audio')
        audio.autoplay = true
        audio.playsInline = true
        // Append to DOM — required for autoplay in some browsers
        container.appendChild(audio)
        audioRefs.current[socketId] = audio
        console.log(`[RemoteAudioPlayer] Created <audio> element for peer ${socketId}`)
      }
      if (audio.srcObject !== stream) {
        audio.srcObject = stream
        audio.play().then(() => {
          console.log(`[RemoteAudioPlayer] Audio playing for peer ${socketId}`)
        }).catch(err => {
          console.warn(`[RemoteAudioPlayer] play() failed for peer ${socketId}:`, err)
        })
      }
    })

    // Cleanup removed peers
    Object.keys(audioRefs.current).forEach(socketId => {
      if (!remoteStreams[socketId]) {
        const audio = audioRefs.current[socketId]
        if (audio) {
          audio.srcObject = null
          audio.remove()
          console.log(`[RemoteAudioPlayer] Removed <audio> element for peer ${socketId}`)
        }
        delete audioRefs.current[socketId]
      }
    })
  }, [remoteStreams])

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(a => { if (a) { a.srcObject = null; a.remove() } })
      audioRefs.current = {}
    }
  }, [])

  // Hidden container div so audio elements are in the DOM
  return <div ref={containerRef} style={{ display: 'none' }} />
}

// ─── Google Meet Video Grid ─────────────────────────────────────────────────
// LAYOUT RULES:
// 1. MULTI-USER GRID  (3+ cameras ON) → responsive grid (2x2, 3x2, 3x3…)
// 2. TWO-USER SPLIT   (teacher + 1 student cameras ON) → 50/50 split
// 3. TEACHER PRIORITY  (teacher camera ON, students mixed) → main + bottom row
// 4. SCREEN SHARE      (teacher sharing screen) → main screen + thumbnail row
// 5. CAMERA OFF        → tile removed from visible grid, audio still plays
// 6. MOBILE            → teacher fullscreen + horizontal scroll thumbnails
function VideoGrid({ localStream, localVideoOn, localMicOn, remoteStreams, remoteCameraStatus, user, canvasRef, isScreenSharing, screenShareStream }) {
  // ─── Build sorted participant list (teacher first) ───
  const buildParticipants = () => {
    const isTeacher = user?.role === 'teacher'
    const all = []

    // Local user
    all.push({
      key: 'local',
      stream: localStream,
      name: user?.name,
      role: user?.role,
      isLocal: true,
      videoOn: localVideoOn,
      micOn: localMicOn,
      isTeacher,
    })

    // Remote participants
    Object.entries(remoteStreams).forEach(([socketId, { stream, userInfo }]) => {
      const remoteRole = userInfo?.role || 'student'
      const remoteCamOn = remoteCameraStatus[socketId] !== false
      all.push({
        key: socketId,
        stream,
        name: userInfo?.userName,
        role: remoteRole,
        isLocal: false,
        videoOn: remoteCamOn,
        isTeacher: remoteRole === 'teacher',
      })
    })

    // Sort: teacher always first
    all.sort((a, b) => (a.role === 'teacher' ? -1 : b.role === 'teacher' ? 1 : 0))
    return all
  }

  const participants = buildParticipants()
  const teacher = participants.find(p => p.role === 'teacher')
  const students = participants.filter(p => p.role !== 'teacher')
  const cameraOnParticipants = participants.filter(p => p.videoOn)
  const cameraOnCount = cameraOnParticipants.length

  // ─── Determine layout mode ───
  const getLayoutMode = () => {
    if (isScreenSharing) return 'screen-share'
    if (cameraOnCount >= 3) return 'grid'
    if (cameraOnCount === 2 && teacher?.videoOn && students.some(s => s.videoOn)) return 'split'
    return 'teacher-priority'
  }

  const layoutMode = getLayoutMode()

  // ─── Grid column calculation for multi-user layout ───
  const getGridStyle = (count) => {
    if (count <= 1) return { gridTemplateColumns: 'repeat(1, 1fr)' }
    if (count === 2) return { gridTemplateColumns: 'repeat(2, 1fr)' }
    if (count <= 4) return { gridTemplateColumns: 'repeat(2, 1fr)' }
    if (count <= 6) return { gridTemplateColumns: 'repeat(3, 1fr)' }
    return { gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }
  }

  // ─── Students with camera ON (for bottom thumbnails) ───
  const studentsWithCamera = students.filter(s => s.videoOn)
  const presentingStream = teacher?.isLocal && screenShareStream ? screenShareStream : teacher?.stream
  const showTeacherCameraThumbnail = Boolean(
    layoutMode === 'screen-share' &&
    teacher?.isLocal &&
    screenShareStream &&
    localVideoOn
  )

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Audio player — always renders for all remote streams */}
      <RemoteAudioPlayer remoteStreams={remoteStreams} />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LAYOUT: SCREEN SHARE MODE                                        */}
      {/* Teacher screen as main, all participants as thumbnails at bottom  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {layoutMode === 'screen-share' && (
        <>
          {/* Main screen share area */}
          <div className="flex-1 min-h-0 p-0 sm:p-2">
            {teacher && (
              <div className="screen-share-container w-full h-full sm:rounded-xl overflow-hidden relative bg-black">
                <VideoTile
                  stream={presentingStream}
                  name={teacher.name}
                  role="teacher"
                  isLocal={teacher.isLocal}
                  videoOn={true}
                  micOn={teacher.micOn}
                  size="normal"
                  mirror={false}
                  fit="contain"
                  isScreenShare={true}
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-red-600/90 backdrop-blur-sm rounded-md text-white text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> Presenting
                </div>
              </div>
            )}
            {teacher?.isLocal && <canvas ref={canvasRef} className="hidden" />}
          </div>
          {/* Bottom thumbnail row */}
          {(studentsWithCamera.length > 0 || showTeacherCameraThumbnail) && (
            <div className="flex-shrink-0 px-1.5 pb-28 sm:pb-32 sm:px-2">
              <div className="flex gap-1.5 overflow-x-auto py-1"
                   style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {showTeacherCameraThumbnail && (
                  <div className="flex-shrink-0 w-24 h-16 sm:w-36 sm:h-24 rounded-lg overflow-hidden border border-purple-500/40">
                    <VideoTile
                      stream={localStream}
                      name={teacher.name}
                      role="teacher"
                      isLocal={true}
                      videoOn={localVideoOn}
                      micOn={localMicOn}
                      size="small"
                    />
                  </div>
                )}
                {students.filter(s => s.videoOn).map(p => (
                  <div key={p.key} className="flex-shrink-0 w-24 h-16 sm:w-36 sm:h-24 rounded-lg overflow-hidden">
                    <VideoTile stream={p.stream} name={p.name} role={p.role} isLocal={p.isLocal} videoOn={p.videoOn} micOn={p.micOn} size="small" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LAYOUT: MULTI-USER GRID (3+ cameras ON)                          */}
      {/* Responsive grid: 2x2, 3x2, 3x3… Only camera-on participants     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {layoutMode === 'grid' && (
        <>
          {/* Mobile: teacher fullscreen + scroll row */}
          <div className="flex-1 min-h-0 flex flex-col sm:hidden p-1.5">
            {/* Teacher main */}
            <div className="flex-1 min-h-0 mb-1.5 rounded-xl overflow-hidden">
              {teacher && (
                <VideoTile stream={teacher.stream} name={teacher.name} role="teacher" isLocal={teacher.isLocal} videoOn={teacher.videoOn} micOn={teacher.micOn} size="normal" />
              )}
              {teacher?.isLocal && <canvas ref={canvasRef} className="hidden" />}
            </div>
            {/* Student horizontal scroll */}
            <div className="flex-shrink-0 flex gap-1.5 overflow-x-auto pb-24 snap-x"
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {studentsWithCamera.map(p => (
                <div key={p.key} className="flex-shrink-0 w-28 h-20 snap-center rounded-lg overflow-hidden">
                  <VideoTile stream={p.stream} name={p.name} role={p.role} isLocal={p.isLocal} videoOn={p.videoOn} micOn={p.micOn} size="small" />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: full responsive grid */}
          <div className="hidden sm:block flex-1 min-h-0 p-2">
            <div className="w-full h-full grid gap-2 auto-rows-fr" style={getGridStyle(cameraOnCount)}>
              {cameraOnParticipants.map(p => (
                <div key={p.key} className="relative min-h-0 rounded-xl overflow-hidden">
                  <VideoTile stream={p.stream} name={p.name} role={p.role} isLocal={p.isLocal} videoOn={p.videoOn} micOn={p.micOn} size="normal" />
                  {p.isLocal && p.role === 'teacher' && <canvas ref={canvasRef} className="hidden" />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LAYOUT: TWO-USER SPLIT (teacher + 1 student, both cameras ON)    */}
      {/* 50/50 side-by-side on desktop, stacked on mobile                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {layoutMode === 'split' && (() => {
        const studentWithCam = students.find(s => s.videoOn)
        return (
          <div className="flex-1 min-h-0 p-1.5 sm:p-2 flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            {/* Teacher — left / top */}
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
              {teacher && (
                <VideoTile stream={teacher.stream} name={teacher.name} role="teacher" isLocal={teacher.isLocal} videoOn={teacher.videoOn} micOn={teacher.micOn} size="normal" />
              )}
              {teacher?.isLocal && <canvas ref={canvasRef} className="hidden" />}
            </div>
            {/* Student — right / bottom */}
            {studentWithCam && (
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
                <VideoTile stream={studentWithCam.stream} name={studentWithCam.name} role={studentWithCam.role} isLocal={studentWithCam.isLocal} videoOn={studentWithCam.videoOn} micOn={studentWithCam.micOn} size="normal" />
              </div>
            )}
          </div>
        )
      })()}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LAYOUT: TEACHER PRIORITY (default)                               */}
      {/* Teacher as main video, students as bottom row thumbnails          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {layoutMode === 'teacher-priority' && (
        <>
          {/* Teacher video fills the entire grid absolutely (Google Meet style) */}
          <div className="absolute inset-0">
            {teacher ? (
              <VideoTile stream={teacher.stream} name={teacher.name} role="teacher" isLocal={teacher.isLocal} videoOn={teacher.videoOn} micOn={teacher.micOn} size="normal" />
            ) : (
              <div className="w-full h-full bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl">
                    <span className="text-white text-3xl font-bold">T</span>
                  </div>
                  <p className="text-gray-400 text-sm">Waiting for teacher...</p>
                </div>
              </div>
            )}
            {teacher?.isLocal && <canvas ref={canvasRef} className="hidden" />}
          </div>

          {/* Student thumbnails – floating bottom-right strip (Google Meet style) */}
          {studentsWithCamera.length > 0 && (
            <div
              className="absolute bottom-24 sm:bottom-28 right-2 sm:right-3 z-10 flex flex-col gap-1.5 sm:gap-2 max-h-[55vh] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {studentsWithCamera.map(p => (
                <div key={p.key} className="flex-shrink-0 w-36 h-24 sm:w-44 sm:h-28 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <VideoTile stream={p.stream} name={p.name} role={p.role} isLocal={p.isLocal} videoOn={p.videoOn} micOn={p.micOn} size="small" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Self-view PIP (students only, like Google Meet) ── */}
      {user?.role !== 'teacher' && layoutMode !== 'grid' && layoutMode !== 'split' && (
        <>
          <div className="absolute bottom-24 sm:bottom-28 right-2 sm:right-3 z-10 w-32 h-20 sm:w-40 sm:h-24 rounded-xl overflow-hidden shadow-2xl border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer">
            <VideoTile
              stream={localStream}
              name={user?.name}
              role={user?.role}
              isLocal={true}
              videoOn={localVideoOn}
              micOn={localMicOn}
              size="small"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Teacher self-view PIP when in teacher-priority mode */}
      {user?.role === 'teacher' && layoutMode === 'teacher-priority' && teacher?.isLocal && (
        <canvas ref={canvasRef} className="hidden" />
      )}

      {/* Empty room state */}
      {Object.keys(remoteStreams).length === 0 && (
        <div className="absolute bottom-28 sm:bottom-32 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-4 py-2 bg-gray-800/90 backdrop-blur-sm rounded-full text-gray-400 text-sm border border-gray-700/50">
            {user?.role === 'teacher' ? 'Waiting for students to join...' : 'Connecting to classroom...'}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Participants Panel ──────────────────────────────────────────────────────
function ParticipantsPanel({ participants, user, onMuteUser, onRemoveUser }) {
  // Calculate total count: teacher (if exists) + approved students
  const totalCount = (participants.teacherName ? 1 : 0) + (participants.students?.length || 0)
  
  // If no server data yet, show at least the current user
  const showSelfOnly = !participants.teacherName && (!participants.students || participants.students.length === 0)
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">People ({showSelfOnly ? 1 : totalCount || 1})</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Show self when no server data */}
        {showSelfOnly && (
          <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50">
            <div className={`w-8 h-8 ${user?.role === 'teacher' ? 'bg-purple-600' : 'bg-primary-600'} rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.name} (You)</p>
              <p className={`text-xs ${user?.role === 'teacher' ? 'text-purple-400' : 'text-gray-400'}`}>
                {user?.role === 'teacher' ? 'Host' : 'Student'}
              </p>
            </div>
          </div>
        )}
        
        {/* Teacher from server data */}
        {participants.teacherName && (
          <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {participants.teacherName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {participants.teacherName}
                {user?.role === 'teacher' && ' (You)'}
              </p>
              <p className="text-xs text-purple-400">Host</p>
            </div>
          </div>
        )}

        {/* Students */}
        {participants.students?.map(student => (
          <div key={student.socketId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50 group">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {(student.userName || '?').split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {student.userName || 'Student'}
                {student.userId === (user?.id || user?._id) && ' (You)'}
              </p>
            </div>
            {/* Teacher controls: mute & remove */}
            {user?.role === 'teacher' && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onMuteUser?.(student.socketId)}
                  className="p-1.5 rounded-full hover:bg-gray-600 transition"
                  title={`Mute ${student.userName}`}
                >
                  <MicOff className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={() => onRemoveUser?.(student.socketId)}
                  className="p-1.5 rounded-full hover:bg-red-600/50 transition"
                  title={`Remove ${student.userName}`}
                >
                  <UserX className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live Classroom ─────────────────────────────────────────────────────────
function LiveClassroom({ classData, user, onLeave, initialSettings, initialSessionId }) {
  const [micOn, setMicOn] = useState(initialSettings?.micOn ?? false)
  const [videoOn, setVideoOn] = useState(initialSettings?.videoOn ?? false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenShareStream, setScreenShareStream] = useState(null)
  const [screenShareBlockedMsg, setScreenShareBlockedMsg] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showEngagement, setShowEngagement] = useState(false)
  const [showDoubts, setShowDoubts] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [messages, setMessages] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [doubts, setDoubts] = useState([])
  const [students, setStudents] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [teacherLeft, setTeacherLeft] = useState(false)
  const [forceMuteNotice, setForceMuteNotice] = useState(false)
  const [removedFromRoom, setRemovedFromRoom] = useState(false)

  // Attendance report (shown after teacher ends class)
  const [attendanceReport, setAttendanceReport] = useState(null)
  const [showAttendanceReport, setShowAttendanceReport] = useState(false)

  // Face detection state (privacy-focused, browser-side only)
  const [faceTrackingActive, setFaceTrackingActive] = useState(false)
  const [lastDetection, setLastDetection] = useState(null)
  const [faceModelsLoading, setFaceModelsLoading] = useState(false)
  
  // Dual-track camera state
  // Track A: WebRTC video (visible to others) - controlled by videoOn
  // Track B: Local attendance video (internal) - keeps running for attendance
  const [attendanceStreamActive, setAttendanceStreamActive] = useState(false)
  // Camera is mandatory for students — treat as consented automatically
  const consentGiven = user?.role === 'student' ? true : (initialSettings?.consentGiven ?? false)

  // Track whether this student has been approved into the room
  const [isStudentApproved, setIsStudentApproved] = useState(user?.role === 'teacher')

  // Waiting room states - Students start in waiting state by default
  const [waitingForApproval, setWaitingForApproval] = useState(user?.role === 'student')
  const [joinRejected, setJoinRejected] = useState(false)
  const [joinRequests, setJoinRequests] = useState([]) // Teacher's waiting list

  // Connection state for debugging
  const [connectionState, setConnectionState] = useState('connecting')

  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState({})
  const [remoteCameraStatus, setRemoteCameraStatus] = useState({}) // { socketId: boolean }
  const [participants, setParticipants] = useState({ teacher: null, students: [], count: 1 })

  const [localStream, setLocalStream] = useState(null)

  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const attendanceVideoRef = useRef(null) // Separate video element for attendance tracking
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const faceTrackerRef = useRef(null) // Face detection tracker
  const webrtcRef = useRef(null)
  const classroomRef = useRef(null)

  useEffect(() => {
    const activeSessionId = classData?.active_session_id || initialSessionId
    if (!sessionId && activeSessionId) {
      setSessionId(activeSessionId)
    }
  }, [classData?.active_session_id, initialSessionId, sessionId])

  // ── Real-time engagement detection hook (students only) ──────────────────
  // Runs face detection every 3 seconds when the student is approved.
  // Sends engagement status to the signaling server → forwarded to teacher.
  const { faceDetected: engagementFaceDetected } = useEngagementDetection({
    videoRef: attendanceVideoRef,
    webrtcRef,
    userId: user?.id || user?._id,
    userName: user?.name,
    isActive: user?.role === 'student' && isStudentApproved,
  })

  // ── Initialize media and WebRTC ──
  useEffect(() => {
    const init = async () => {
      // Get local stream
      let stream = initialSettings?.stream
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
          })
          setVideoOn(true)
          setMicOn(true)
        } catch (err) {
          console.error('Media access error:', err)
        }
      }

      if (stream) {
        localStreamRef.current = stream
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        // Apply initial mic/video settings to the stream
        const initMic = initialSettings?.micOn ?? true
        const initVideo = initialSettings?.videoOn ?? true
        stream.getAudioTracks().forEach(t => { t.enabled = initMic })
        stream.getVideoTracks().forEach(t => { t.enabled = initVideo })
        // Debug: log local stream tracks before passing to WebRTC
        console.log('[Classroom] Local stream ready — audio tracks:', stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })))
        console.log('[Classroom] Local stream ready — video tracks:', stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })))
      }

      // Create fresh WebRTC manager for this session
      const rtc = createWebRTCManager()
      webrtcRef.current = rtc

      // Set callbacks
      rtc.callbacks.onConnectionStateChange = (state) => {
        console.log('[Classroom] Connection state:', state)
        setConnectionState(state)
      }

      rtc.callbacks.onRemoteStream = (socketId, remoteStream, userInfo) => {
        console.log('[Classroom] Remote stream received:', socketId, userInfo)
        console.log('[Classroom] Remote stream audio tracks:', remoteStream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })))
        console.log('[Classroom] Remote stream video tracks:', remoteStream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })))
        setRemoteStreams(prev => ({
          ...prev,
          [socketId]: { stream: remoteStream, userInfo: { ...userInfo, role: userInfo?.role || 'student' } }
        }))
      }

      rtc.callbacks.onRemoteStreamRemoved = (socketId) => {
        setRemoteStreams(prev => {
          const updated = { ...prev }
          delete updated[socketId]
          return updated
        })
        setRemoteCameraStatus(prev => {
          const updated = { ...prev }
          delete updated[socketId]
          return updated
        })
      }

      rtc.callbacks.onParticipantsUpdated = (parts) => {
        console.log('[Classroom] Participants updated:', parts)
        setParticipants(parts)
        // Sync participants with students engagement list
        if (parts.students && parts.students.length > 0) {
          setStudents(prev => {
            const updated = [...prev]
            parts.students.forEach(p => {
              const existingIdx = updated.findIndex(s => s.id === p.userId)
              if (existingIdx < 0 && p.userId) {
                // Add new student with default engagement values + joinTime
                updated.push({
                  id: p.userId,
                  socketId: p.socketId,
                  name: p.userName || 'Student',
                  engagement: 0,
                  status: 'active',
                  lookingAtScreen: false,
                  joinTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                })
              }
            })
            // Remove students no longer in participants
            const participantIds = parts.students.map(p => p.userId).filter(Boolean)
            return updated.filter(s => participantIds.includes(s.id))
          })
        } else {
          setStudents([])
        }
      }

      rtc.callbacks.onTeacherLeft = () => {
        setTeacherLeft(true)
      }

      rtc.callbacks.onChatMessage = (message) => {
        setMessages(prev => [...prev, message])
        // Increment unread if chat panel is closed
        setUnreadMessages(prev => prev + 1)
      }

      rtc.callbacks.onScreenShareStopped = () => {
        setIsScreenSharing(false)
        setScreenShareStream(null)
      }

      rtc.callbacks.onScreenShare = (_socketId, _stream, data) => {
        if (data?.socketId) {
          setIsScreenSharing(true)
        }
      }

      rtc.callbacks.onHandRaised = (data) => {
        setDoubts(prev => [...prev, {
          id: Date.now(),
          studentName: data.userName,
          question: data.question,
          time: new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'pending',
        }])
      }

      // Teacher force-muted this student
      rtc.callbacks.onForceMuted = () => {
        setMicOn(false)
        setForceMuteNotice(true)
        setTimeout(() => setForceMuteNotice(false), 3000)
      }

      // Teacher removed this student from the room
      rtc.callbacks.onForceRemoved = () => {
        setRemovedFromRoom(true)
      }

      // Kicked via spec-defined remove-student / kicked event
      rtc.callbacks.onKicked = () => {
        setRemovedFromRoom(true)
      }

      // Screen share blocked — student attempted screen share
      rtc.callbacks.onScreenShareBlocked = (message) => {
        setScreenShareBlockedMsg(message || 'Only teacher can share the screen')
        setTimeout(() => setScreenShareBlockedMsg(''), 4000)
      }

      // Teacher receives real-time engagement via socket.io (supplements WebSocket backend path)
      rtc.callbacks.onStudentEngagement = (data) => {
        if (user?.role !== 'teacher') return
        setStudents(prev => {
          const idx = prev.findIndex(s => s.id === data.studentId)
          const entry = {
            id: data.studentId || data.socketId,
            socketId: data.socketId,
            name: data.studentName || 'Student',
            engagement: data.status === 'attentive' ? 100 : (data.status === 'distracted' ? 40 : 0),
            status: data.status === 'attentive' ? 'active' : (data.status === 'distracted' ? 'distracted' : 'inactive'),
            lookingAtScreen: data.status === 'attentive',
            cameraOn: data.cameraOn !== false,
            // Preserve existing joinTime or use server-provided one
            joinTime: data.joinTimeLabel || data.joinTime || null,
          }
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], ...entry, joinTime: updated[idx].joinTime || entry.joinTime }
            return updated
          }
          return [...prev, entry]
        })
      }

      // Teacher receives live attendance map updates (join/leave)
      rtc.callbacks.onAttendanceUpdate = (attendanceMap) => {
        if (user?.role !== 'teacher') return
        // Merge join times / leave times into student state
        const entries = Object.values(attendanceMap)
        setStudents(prev => {
          const updated = [...prev]
          entries.forEach(entry => {
            const idx = updated.findIndex(s => s.socketId === entry.socketId || s.id === entry.userId)
            const joinLabel = entry.joinTime
              ? new Date(entry.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], joinTime: updated[idx].joinTime || joinLabel }
            }
          })
          return updated
        })
      }

      // Class ended – show attendance report to teacher
      rtc.callbacks.onClassEnded = () => {}

      // Remote participant toggled camera visibility
      rtc.callbacks.onCameraStatus = (data) => {
        const { socketId, enabled, role: senderRole } = data
        setRemoteCameraStatus(prev => ({ ...prev, [socketId]: enabled }))
        // Also update the role in remoteStreams userInfo if we have it
        if (senderRole) {
          setRemoteStreams(prev => {
            if (!prev[socketId]) return prev
            return {
              ...prev,
              [socketId]: {
                ...prev[socketId],
                userInfo: { ...prev[socketId].userInfo, role: senderRole }
              }
            }
          })
        }
      }

      // ── Waiting Room Callbacks ──
      
      // Student: waiting for teacher approval
      rtc.callbacks.onWaitingForApproval = () => {
        console.log('[Classroom] Waiting for approval')
        setWaitingForApproval(true)
      }

      // Student: approved to join
      rtc.callbacks.onJoinApproved = () => {
        console.log('[Classroom] Join approved!')
        setWaitingForApproval(false)
        setJoinRejected(false)
        // Activate the engagement detection hook
        setIsStudentApproved(true)
        // Start attendance and face tracking after approval (student with consent)
        if (user?.role === 'student' && consentGiven) {
          const activeSessionId = classData?.active_session_id || initialSessionId
          if (!activeSessionId) {
            console.error('Missing active session ID for class attendance tracking')
            return
          }
          setSessionId(activeSessionId)
          
          // Start attendance session on backend
          attendanceAPI.start(classData.class_id, activeSessionId, {
            classTitle: classData?.title,
            teacherName: classData?.teacher_name,
            startedAt: classData?.session_started_at,
          })
            .then(() => {
              console.log('[Classroom] Attendance session started')
              // Initialize face tracking
              initializeFaceTracking(activeSessionId)
            })
            .catch(err => console.error('Failed to start attendance:', err))
        }
      }

      // Initialize face detection for attendance (browser-side only)
      const initializeFaceTracking = async (sessionIdToUse) => {
        if (!consentGiven || user?.role !== 'student') return
        if (!attendanceVideoRef.current || !localStreamRef.current) {
          console.warn('[Classroom] Attendance video/stream unavailable; cannot start face tracking')
          return
        }

        const waitForVideoReady = (videoElement, timeoutMs = 8000) => {
          return new Promise((resolve, reject) => {
            const hasDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0
            if (videoElement.readyState >= 2 && hasDimensions && !videoElement.paused) {
              resolve()
              return
            }

            const cleanup = () => {
              videoElement.removeEventListener('loadedmetadata', handleReady)
              videoElement.removeEventListener('playing', handleReady)
              clearTimeout(timeoutId)
            }

            const handleReady = () => {
              const ready = videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0
              if (!ready) return
              cleanup()
              resolve()
            }

            const timeoutId = setTimeout(() => {
              cleanup()
              reject(new Error(`Attendance video not ready in time (${videoElement.videoWidth}x${videoElement.videoHeight})`))
            }, timeoutMs)

            videoElement.addEventListener('loadedmetadata', handleReady)
            videoElement.addEventListener('playing', handleReady)
          })
        }
        
        setFaceModelsLoading(true)
        try {
          await loadFaceDetectionModels()

          const attendanceVideo = attendanceVideoRef.current
          if (attendanceVideo.srcObject !== localStreamRef.current) {
            attendanceVideo.srcObject = localStreamRef.current
          }

          try {
            await attendanceVideo.play()
          } catch {
          }

          await waitForVideoReady(attendanceVideo)
          setAttendanceStreamActive(true)
          console.log('[Classroom] Attendance video ready:', attendanceVideo.videoWidth, attendanceVideo.videoHeight)

          const tracker = createFaceTracker(
            attendanceVideo,
            async (detection) => {
              const metadata = generateAttendanceMetadata(
                user?.id || user?._id,
                classData.class_id,
                detection
              )
              metadata.session_id = sessionIdToUse

              setLastDetection(detection)

              try {
                await attendanceAPI.submitMetadata(metadata)
              } catch (err) {
                console.error('[FaceTracking] Failed to submit metadata:', err)
              }
            },
            5000
          )

          faceTrackerRef.current = tracker
          await tracker.start()
          setFaceTrackingActive(true)
          console.log('[Classroom] Face tracking started (browser-side)')
        } catch (err) {
          console.error('[Classroom] Failed to initialize face tracking:', err)
        } finally {
          setFaceModelsLoading(false)
        }
      }

      // Student: rejected by teacher
      rtc.callbacks.onJoinRejected = (message) => {
        console.log('[Classroom] Join rejected:', message)
        setWaitingForApproval(false)
        setJoinRejected(true)
      }

      // Teacher: receive join request from student
      rtc.callbacks.onJoinRequest = (data) => {
        console.log('[Classroom] Join request from:', data.userName)
        setJoinRequests(prev => {
          // Avoid duplicates
          if (prev.some(r => r.socketId === data.socketId)) return prev
          return [...prev, data]
        })
      }

      // Join the room
      if (stream) {
        rtc.joinRoom(
          classData.class_id,
          user?.role || 'student',
          user?.id || user?._id,
          user?.name,
          stream
        )
      }

      // Teacher: activate class
      if (user?.role === 'teacher') {
        try {
          await classAPI.activate(classData.class_id)
        } catch (err) {
          console.error('Failed to activate class:', err)
        }
      }

      // Note: For students, attendance is started AFTER approval (see onJoinApproved callback)
    }

    init()

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (faceTrackerRef.current) {
        faceTrackerRef.current.stop()
      }
      if (wsRef.current) wsRef.current.close()
      if (webrtcRef.current) webrtcRef.current.leaveRoom()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle video track ──
  // Students: CAN toggle camera visibility to others. The physical camera stays
  // ON so face detection / engagement tracking continues in the background.
  // When toggling OFF: disable the WebRTC video track (peers see black), broadcast
  // camera-status OFF so other participants hide the tile.
  // When toggling ON: re-enable track, broadcast camera-status ON.
  // Teachers: same behavior.
  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const vt = stream.getVideoTracks()
    if (vt.length === 0) return

    if (user?.role === 'student') {
      // For students: keep the physical video track enabled (for face detection)
      // but use setVideoEnabled to control what peers see
      if (webrtcRef.current && typeof webrtcRef.current.setVideoEnabled === 'function') {
        webrtcRef.current.setVideoEnabled(videoOn).catch(() => {})
      }
      // Broadcast camera status to room
      if (webrtcRef.current && typeof webrtcRef.current.broadcastCameraStatus === 'function') {
        webrtcRef.current.broadcastCameraStatus(videoOn)
      }
      // Keep the local video track always enabled for face detection
      vt.forEach(t => { t.enabled = true })
      // Keep attendance video element visible
      if (attendanceVideoRef.current) {
        attendanceVideoRef.current.style.visibility = 'visible'
      }
    } else {
      // Teachers: normal toggle — disabling track sends black video to all peers
      vt.forEach(t => { t.enabled = videoOn })
      if (webrtcRef.current && typeof webrtcRef.current.setVideoEnabled === 'function') {
        webrtcRef.current.setVideoEnabled(videoOn).catch(() => {})
      }
      // Broadcast camera status to room
      if (webrtcRef.current && typeof webrtcRef.current.broadcastCameraStatus === 'function') {
        webrtcRef.current.broadcastCameraStatus(videoOn)
      }
    }
  }, [videoOn, user?.role])

  // ── Toggle audio track ──
  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const at = stream.getAudioTracks()
    if (at.length > 0) {
      at.forEach(t => { t.enabled = micOn })
    }
    if (webrtcRef.current && typeof webrtcRef.current.setAudioEnabled === 'function') {
      webrtcRef.current.setAudioEnabled(micOn).catch(() => {})
    }
  }, [micOn])

  // ── Teacher engagement WebSocket ──
  useEffect(() => {
    if (user?.role !== 'teacher' || !classData?.class_id) return
    try {
      const ws = createWebSocket(classData.class_id)
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'engagement_update' && msg.data) {
          const d = msg.data
          setStudents(prev => {
            const idx = prev.findIndex(s => s.id === d.student_id)
            const entry = {
              id: d.student_id,
              name: d.student_name || 'Student',
              engagement: Math.round(d.engagement_percentage || 0),
              status: d.is_face_detected ? 'active' : 'inactive',
              lookingAtScreen: d.is_looking_at_screen,
            }
            if (idx >= 0) {
              const u = [...prev]
              u[idx] = { ...u[idx], ...entry }
              return u
            }
            return [...prev, entry]
          })
        }
      }
      wsRef.current = ws
    } catch { /* silent */ }
    return () => wsRef.current?.close()
  }, [classData?.class_id, user?.role])

  // ── Reset unread when chat opens ──
  useEffect(() => {
    if (showChat) setUnreadMessages(0)
  }, [showChat])

  // ── Sync state when user exits native fullscreen via ESC/system UI ──
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = document.fullscreenElement === classroomRef.current
      setIsFullscreen(isNativeFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ── Handlers ──
  const handleLeaveClass = async () => {
    if (!window.confirm('Leave the classroom?')) return
    await _doLeaveClass()
  }

  const handleEndClass = async () => {
    if (user?.role !== 'teacher') return
    if (!window.confirm('End the class for everyone? This will finalize attendance.')) return
    const activeSessionId = sessionId || classData?.active_session_id || initialSessionId
    if (!activeSessionId) {
      alert('Active session information is missing for this class.')
      return
    }

    try {
      const report = await attendanceAPI.end({
        classId: classData.class_id,
        sessionId: activeSessionId,
        endedAt: new Date().toISOString(),
      })
      setAttendanceReport(report)
      setShowAttendanceReport(true)
    } catch (error) {
      alert(error.message || 'Failed to finalize attendance report')
      return
    }

    if (webrtcRef.current && typeof webrtcRef.current.endClass === 'function') {
      webrtcRef.current.endClass()
    }
    try { await classAPI.deactivate(classData.class_id) } catch { /* ok */ }
  }

  const _doLeaveClass = async () => {
    if (faceTrackerRef.current) {
      faceTrackerRef.current.stop()
      setFaceTrackingActive(false)
    }
    
    // End attendance session
    if (user?.role === 'student' && sessionId) {
      try { await attendanceAPI.end(sessionId) } catch { /* ok */ }
    }
    if (user?.role === 'teacher') {
      try { await classAPI.deactivate(classData.class_id) } catch { /* ok */ }
    }
    onLeave()
  }

  // Make leave callable from _doLeaveClass (previously inlined)
  // eslint-disable-next-line no-unused-vars
  const _handleLeaveInner = _doLeaveClass

  const handleSendMessage = (text) => {
    if (webrtcRef.current) {
      webrtcRef.current.sendChatMessage(text)
    }
  }

  const handleRaiseDoubt = () => {
    const q = prompt('Enter your doubt:')
    if (q?.trim() && webrtcRef.current) {
      webrtcRef.current.raiseHand(q.trim())
    }
  }

  const handleMuteUser = (targetSocketId) => {
    if (webrtcRef.current) {
      webrtcRef.current.muteUser(targetSocketId)
    }
  }

  const handleRemoveUser = (targetSocketId) => {
    if (!window.confirm('Remove this student from the meeting?')) return
    if (webrtcRef.current) {
      // Use both paths: legacy remove-user AND spec-defined remove-student (emits "kicked")
      webrtcRef.current.removeUser(targetSocketId)
      webrtcRef.current.kickStudent(targetSocketId)
    }
  }

  // ── Waiting Room Handlers (Teacher) ──
  const handleAcceptStudent = (studentSocketId) => {
    if (webrtcRef.current) {
      webrtcRef.current.acceptStudent(studentSocketId)
      // Remove from local join requests list
      setJoinRequests(prev => prev.filter(r => r.socketId !== studentSocketId))
    }
  }

  const handleRejectStudent = (studentSocketId) => {
    if (webrtcRef.current) {
      webrtcRef.current.rejectStudent(studentSocketId)
      // Remove from local join requests list
      setJoinRequests(prev => prev.filter(r => r.socketId !== studentSocketId))
    }
  }

  const handleScreenShare = async () => {
    // Only teachers are allowed to share screen
    if (user?.role !== 'teacher') {
      setScreenShareBlockedMsg('Only teacher can share the screen')
      setTimeout(() => setScreenShareBlockedMsg(''), 4000)
      return
    }
    if (!webrtcRef.current) return
    if (isScreenSharing) {
      webrtcRef.current.stopScreenShare()
      setIsScreenSharing(false)
      setScreenShareStream(null)
    } else {
      const result = await webrtcRef.current.startScreenShare()
      if (result) {
        setScreenShareStream(result)
        setIsScreenSharing(true)
      }
    }
  }

  const toggleFullscreen = async () => {
    const root = classroomRef.current
    if (!root) {
      setIsFullscreen(v => !v)
      return
    }

    if (!isFullscreen) {
      setShowChat(false)
      setShowDoubts(false)
      setShowEngagement(false)
      setShowParticipants(false)

      if (root.requestFullscreen) {
        try {
          await root.requestFullscreen()
        } catch {
          // Fallback to CSS-only fullscreen mode
        }
      }
      setIsFullscreen(true)
      return
    }

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen()
      } catch {
        // ignore and fallback to state-based fullscreen exit
      }
    }
    setIsFullscreen(false)
  }

  const togglePanel = (panel) => {
    setShowChat(panel === 'chat' ? v => !v : false)
    setShowDoubts(panel === 'doubts' ? v => !v : false)
    setShowEngagement(panel === 'engagement' ? v => !v : false)
    setShowParticipants(panel === 'participants' ? v => !v : false)
  }

  // Determine active side panel
  const activeSidePanel = showChat ? 'chat' : showDoubts ? 'doubts' : showEngagement ? 'engagement' : showParticipants ? 'participants' : null

  // ── Student: Show waiting for approval screen ──
  if (user?.role === 'student' && waitingForApproval) {
    return <WaitingForApprovalScreen classData={classData} onLeave={onLeave} connectionState={connectionState} />
  }

  // ── Student: Show rejected screen ──
  if (user?.role === 'student' && joinRejected) {
    return <JoinRejectedScreen classData={classData} onLeave={onLeave} />
  }

  return (
    <div ref={classroomRef} className="h-[100dvh] bg-gray-950 flex overflow-hidden">
      {/* Teacher Left overlay */}
      {teacherLeft && user?.role === 'student' && <TeacherLeftBanner onLeave={onLeave} />}

      {/* Removed from room overlay */}
      {removedFromRoom && <RemovedBanner onLeave={onLeave} />}

      {/* Attendance Report Modal (teacher sees this after ending class) */}
      {showAttendanceReport && user?.role === 'teacher' && (
        <AttendanceReportModal
          report={attendanceReport?.attendance_records || []}
          endTime={attendanceReport?.ended_at}
          classTitle={classData?.title}
          classId={classData?.class_id}
          sessionId={attendanceReport?.session_id || sessionId}
          onClose={() => {
            setShowAttendanceReport(false)
            onLeave()
          }}
        />
      )}

      {/* Teacher: Join Request Modal for waiting students */}
      {user?.role === 'teacher' && (
        <JoinRequestModal
          requests={joinRequests}
          onAccept={handleAcceptStudent}
          onReject={handleRejectStudent}
        />
      )}

      {/* Force mute toast */}
      {forceMuteNotice && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg shadow-lg flex items-center gap-2">
          <MicOff className="w-4 h-4 text-red-400" />
          <p className="text-white text-sm">You were muted by the host</p>
        </div>
      )}

      {/* Screen share blocked toast */}
      {screenShareBlockedMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 bg-orange-900 border border-orange-600 rounded-lg shadow-lg flex items-center gap-2">
          <MonitorUp className="w-4 h-4 text-orange-400" />
          <p className="text-white text-sm">{screenShareBlockedMsg}</p>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video area – fills full height; header & controls are gradient overlays */}
        <div className="flex-1 relative overflow-hidden bg-gray-950">
          {/* Hidden video element for local stream (needed for canvas capture) */}
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />

          {/* Hidden video element for attendance tracking (separate from WebRTC) */}
          {user?.role === 'student' && (
            <video ref={attendanceVideoRef} autoPlay playsInline muted className="hidden" />
          )}

          {/* ── Top Bar Overlay (Google Meet style – transparent gradient) ── */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/75 via-black/20 to-transparent px-3 sm:px-5 pt-3 sm:pt-4 pb-14 pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <h1 className="text-white text-sm sm:text-base font-semibold truncate drop-shadow-lg">{classData?.title || 'Classroom'}</h1>
                  <p className="text-gray-300/80 text-[11px] sm:text-xs truncate">{classData?.teacher_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white text-xs sm:text-sm font-medium">Live</span>
                </div>
                <button
                  onClick={() => togglePanel('participants')}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm transition ${showParticipants ? 'bg-primary-600/90' : 'bg-black/40 hover:bg-black/60 border border-white/10'}`}
                >
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-medium">{participants.count || 1}</span>
                </button>
                <button onClick={handleLeaveClass} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-600 transition flex items-center gap-1.5 text-xs sm:text-sm">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline font-medium">Leave</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Tracking Active Indicator - shown when camera is off but tracking continues */}
          {user?.role === 'student' && faceTrackingActive && !videoOn && (
            <div className="absolute top-16 sm:top-20 left-4 z-30 flex items-center gap-2 px-3 py-2 bg-primary-600/90 backdrop-blur-sm rounded-lg shadow-lg border border-primary-500/50">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-medium">Attendance Tracking Active</span>
              {lastDetection?.faceDetected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
          )}
          
          {/* Face detection status indicator (for student awareness) */}
          {user?.role === 'student' && faceTrackingActive && videoOn && lastDetection && (
            <div className="absolute top-16 sm:top-20 left-4 z-30 flex items-center gap-2 px-2.5 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-lg">
              <div className={`w-2 h-2 rounded-full ${lastDetection.faceDetected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-300">
                {lastDetection.faceDetected ? 'Face detected' : 'Face not visible'}
              </span>
              {lastDetection.multipleFaces && (
                <span className="text-xs text-yellow-400 ml-1">⚠ Multiple faces</span>
              )}
            </div>
          )}
          
          {/* Face models loading indicator */}
          {user?.role === 'student' && faceModelsLoading && (
            <div className="absolute top-16 sm:top-20 left-4 z-30 flex items-center gap-2 px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg">
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              <span className="text-gray-300 text-xs">Loading face detection...</span>
            </div>
          )}

          {/* Video grid fills the entire area — controls and header are layered above it */}
          <div className="absolute inset-0">
            <VideoGrid
              localStream={localStream}
              localVideoOn={videoOn}
              localMicOn={micOn}
              remoteStreams={remoteStreams}
              remoteCameraStatus={remoteCameraStatus}
              user={user}
              canvasRef={canvasRef}
              isScreenSharing={isScreenSharing}
              screenShareStream={screenShareStream}
            />
          </div>

          {/* ── Bottom Controls (Google Meet style – gradient overlay) ── */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 sm:px-6 py-5 sm:py-7 safe-bottom">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Left side buttons */}
              <div className="flex items-center gap-2">
                {user?.role === 'teacher' && (
                  <button
                    onClick={() => togglePanel('engagement')}
                    className={`p-2.5 sm:p-3 rounded-full transition ${showEngagement ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Engagement"
                  >
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Center controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mic */}
                <button
                  onClick={() => setMicOn(v => !v)}
                  className={`p-3 sm:p-4 rounded-full transition ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                  title={micOn ? 'Turn off microphone' : 'Turn on microphone'}
                >
                  {micOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                </button>

                {/* Video — both teacher and student can toggle camera visibility.
                    For students, the physical camera stays on (for face detection)
                    but video is hidden from other participants. */}
                <button
                  onClick={() => setVideoOn(v => !v)}
                  className={`p-3 sm:p-4 rounded-full transition ${videoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                  title={videoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {videoOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                </button>

                {/* Screen share - Teacher only */}
                {user?.role === 'teacher' && (
                  <button
                    onClick={handleScreenShare}
                    className={`p-3 sm:p-4 rounded-full transition ${isScreenSharing ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title={isScreenSharing ? 'Stop presenting' : 'Present now'}
                  >
                    <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </button>
                )}

                {/* Chat */}
                <button
                  onClick={() => togglePanel('chat')}
                  className={`p-3 sm:p-4 rounded-full transition relative ${showChat ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title="Chat"
                >
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  {unreadMessages > 0 && !showChat && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </button>

                {/* Doubt (student) / Doubts queue (teacher) */}
                {user?.role === 'student' && (
                  <button
                    onClick={handleRaiseDoubt}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-full bg-orange-600 hover:bg-orange-700 transition flex items-center gap-1.5"
                    title="Raise a doubt"
                  >
                    <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span className="text-white font-semibold text-xs hidden sm:inline">Raise Hand</span>
                  </button>
                )}
                {user?.role === 'teacher' && (
                  <button
                    onClick={() => togglePanel('doubts')}
                    className={`p-3 sm:p-4 rounded-full transition relative ${showDoubts ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Student doubts"
                  >
                    <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    {doubts.filter(d => d.status === 'pending').length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                        {doubts.filter(d => d.status === 'pending').length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2">
                {/* End Class — teacher only */}
                {user?.role === 'teacher' && (
                  <button
                    onClick={handleEndClass}
                    className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 transition flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                    title="End class and view attendance report"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    <span className="hidden sm:inline text-white">End Class</span>
                  </button>
                )}
                <button
                  onClick={handleLeaveClass}
                  className="p-2.5 sm:p-3 rounded-full bg-red-600 hover:bg-red-700 transition"
                  title="Leave call"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Side Panel (desktop) ── */}
        {activeSidePanel && (
          <div className="hidden md:flex flex-col w-72 lg:w-80 bg-gray-800 border-l border-gray-700 overflow-hidden relative">
            {/* Close button */}
            <button
              onClick={() => togglePanel(activeSidePanel)}
              className="absolute top-2 right-2 z-10 p-1.5 hover:bg-gray-700 rounded-full transition"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            {showChat && <ChatPanel messages={messages} onSendMessage={handleSendMessage} currentUser={user} />}
            {showDoubts && user?.role === 'teacher' && (
              <DoubtsPanel
                doubts={doubts}
                onResolve={(id) => setDoubts(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d))}
                onDismiss={(id) => setDoubts(prev => prev.filter(d => d.id !== id))}
              />
            )}
            {showEngagement && user?.role === 'teacher' && <EngagementList students={students} classId={classData?.class_id} sessionId={sessionId} />}
            {showParticipants && <ParticipantsPanel participants={participants} user={user} onMuteUser={handleMuteUser} onRemoveUser={handleRemoveUser} />}
          </div>
        )}

        {/* ── Mobile bottom sheet panel ── */}
        {activeSidePanel && (
          <div className="md:hidden absolute inset-x-0 bottom-[80px] top-0 z-10 flex flex-col">
            <div className="flex-1" onClick={() => togglePanel(activeSidePanel)} />
            <div className="bg-gray-800 border-t border-gray-700 rounded-t-2xl h-[60%] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between py-2 px-4 border-b border-gray-700">
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
                <button onClick={() => togglePanel(activeSidePanel)} className="p-1">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showChat && <ChatPanel messages={messages} onSendMessage={handleSendMessage} currentUser={user} />}
                {showDoubts && user?.role === 'teacher' && (
                  <DoubtsPanel
                    doubts={doubts}
                    onResolve={(id) => setDoubts(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d))}
                    onDismiss={(id) => setDoubts(prev => prev.filter(d => d.id !== id))}
                  />
                )}
                {showEngagement && user?.role === 'teacher' && <EngagementList students={students} classId={classData?.class_id} sessionId={sessionId} />}
                {showParticipants && <ParticipantsPanel participants={participants} user={user} onMuteUser={handleMuteUser} onRemoveUser={handleRemoveUser} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Classroom Component ───────────────────────────────────────────────
function Classroom({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [joinSettings, setJoinSettings] = useState(null)

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const data = await classAPI.get(id)
        setClassData(data)
        setIsLive(data.is_active)
        // Check if class has ended (was active but now finished)
        setIsFinished(data.is_finished === true || data.status === 'finished' || data.status === 'ended')
      } catch (err) {
        alert('Class not found: ' + err.message)
        navigate(user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchClass()
  }, [id, navigate, user.role])

  const handleLeave = useCallback(() => {
    navigate(user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')
  }, [navigate, user.role])

  const handleClassStarted = useCallback((updatedData) => {
    setClassData(updatedData)
    setIsLive(true)
    setIsFinished(false)
  }, [])

  const handleJoin = useCallback((settings) => {
    setJoinSettings(settings)
    setHasJoined(true)
  }, [])

  if (loading) {
    return (
      <div className="h-[100dvh] bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading classroom...</p>
        </div>
      </div>
    )
  }

  if (!classData) return null

  // Show finished screen if class has ended
  if (isFinished) {
    return <ClassFinishedScreen classData={classData} onLeave={handleLeave} />
  }

  // Teacher flow: PreJoin -> LiveClassroom
  if (user.role === 'teacher') {
    if (!hasJoined) {
      return <PreJoinScreen classData={classData} user={user} onJoin={handleJoin} onLeave={handleLeave} />
    }
    return <LiveClassroom classData={classData} user={user} onLeave={handleLeave} initialSettings={joinSettings} initialSessionId={location.state?.sessionId} />
  }

  // Student flow: WaitingRoom (if not live) -> PreJoin -> LiveClassroom
  if (!isLive) {
    return <WaitingRoom classData={classData} onClassStarted={handleClassStarted} onLeave={handleLeave} />
  }

  if (!hasJoined) {
    return <PreJoinScreen classData={classData} user={user} onJoin={handleJoin} onLeave={handleLeave} />
  }

  return <LiveClassroom classData={classData} user={user} onLeave={handleLeave} initialSettings={joinSettings} initialSessionId={location.state?.sessionId} />
}

export default Classroom

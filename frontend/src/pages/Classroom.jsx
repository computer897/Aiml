import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import ConsentModal from '../components/ConsentModal'

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
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
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
    // Students must consent to AI attendance tracking before joining
    if (user?.role === 'student' && !consentGiven) {
      setShowConsentModal(true)
      return
    }
    onJoin({ micOn, videoOn, stream, consentGiven })
  }

  const handleConsentAccept = () => {
    setConsentGiven(true)
    setShowConsentModal(false)
    // Auto-join after consent
    onJoin({ micOn, videoOn, stream, consentGiven: true })
  }

  const handleConsentDecline = () => {
    setShowConsentModal(false)
    // Cannot join without consent - return to dashboard
    onLeave()
  }

  const showVideo = permissionState === 'granted' && videoOn

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {showPermissionDialog && <PermissionDialog onAllow={requestPermissions} onDeny={denyPermissions} />}
      
      {/* Consent Modal for AI Attendance - Students only */}
      {showConsentModal && user?.role === 'student' && (
        <ConsentModal 
          classTitle={classData.title}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      )}

      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">{classData.title}</h1>
          <p className="text-gray-400">
            {user?.role === 'teacher' ? 'You are the host' : `Hosted by ${classData.teacher_name}`}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-center">
          {/* Video Preview */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video">
            {/* Always render video element to maintain srcObject reference */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${showVideo ? '' : 'hidden'}`} 
              style={{ transform: 'scaleX(-1)' }} 
            />
            {/* Show avatar when video is off */}
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

          {/* Join Panel */}
          <div className="bg-gray-800/50 rounded-2xl p-6 sm:p-8 border border-gray-700">
            <h2 className="text-white text-xl font-semibold mb-2">Ready to join?</h2>
            <p className="text-gray-400 text-sm mb-6">
              {user?.role === 'teacher'
                ? 'Students will be able to join once you start the meeting.'
                : 'Your teacher will be notified when you join.'}
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${micOn ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-300">{micOn ? 'Microphone is on' : 'Microphone is off'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${videoOn ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-300">{videoOn ? 'Camera is on' : 'Camera is off'}</span>
              </div>
              {user?.role === 'teacher' && (
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-4 h-4 text-primary-400" />
                  <span className="text-gray-300">You have host controls</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleJoin} disabled={loading} className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition font-semibold disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : user?.role === 'teacher' ? 'Start Meeting' : 'Join Now'}
              </button>
              <button onClick={onLeave} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition font-medium">
                Cancel
              </button>
            </div>
          </div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 px-6 py-5 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Waiting Room</h2>
                <p className="text-gray-400 text-sm">{requests.length} {requests.length === 1 ? 'person' : 'people'} waiting to join</p>
              </div>
            </div>
          </div>
        </div>

        {/* Participant List */}
        <div className="max-h-80 overflow-y-auto">
          {requests.map((req, index) => (
            <div 
              key={req.socketId} 
              className={`px-6 py-4 flex items-center gap-4 hover:bg-gray-700/30 transition-colors ${index !== requests.length - 1 ? 'border-b border-gray-700/30' : ''}`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-base font-bold">
                    {(req.userName || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
                  <Clock className="w-2.5 h-2.5 text-gray-900" />
                </div>
              </div>

              {/* Name & Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{req.userName || 'Student'}</p>
                <p className="text-gray-500 text-sm">Requesting to join</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReject(req.socketId)}
                  className="p-2.5 rounded-full bg-gray-700 hover:bg-red-600/80 text-gray-400 hover:text-white transition-all duration-200 group"
                  title="Deny"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAccept(req.socketId)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40"
                >
                  Admit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        {requests.length > 1 && (
          <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700/50 flex items-center justify-between gap-3">
            <button
              onClick={() => requests.forEach(r => onReject(r.socketId))}
              className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition-all duration-200"
            >
              Deny all
            </button>
            <button
              onClick={() => requests.forEach(r => onAccept(r.socketId))}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-primary-600/25"
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

// ─── Video Tile ──────────────────────────────────────────────────────────────
function VideoTile({ stream, muted, mirrored, name, role, isLocal, videoOn }) {
  const videoRef = useRef(null)
  // Use the videoOn prop for both local and remote (VideoGrid now passes it for both)
  const showVideo = stream && videoOn === true

  // Attach or detach stream based on videoOn state for reliable toggle
  useEffect(() => {
    if (!videoRef.current) return
    
    if (stream && showVideo) {
      // Attach stream when video should be on
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
    } else {
      // Detach stream when video should be off (more reliable than CSS hiding)
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream, showVideo])

  const initials = name?.split(' ').map(n => n[0]).join('') || '?'

  return (
    <div className="relative w-full h-full bg-gray-800 rounded-xl overflow-hidden group">
      {/* Video element - only visible when showVideo is true */}
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover"
          style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
        />
      )}
      {/* Avatar shown when video is off */}
      {!showVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl sm:text-2xl font-bold">{initials}</span>
          </div>
        </div>
      )}
      {/* Name label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium">
          {isLocal ? 'You' : name || 'Participant'}
          {role === 'teacher' && ' (Host)'}
        </div>
      </div>
    </div>
  )
}

// ─── Google Meet-style Video Grid ────────────────────────────────────────────
function VideoGrid({ localStream, localVideoOn, remoteStreams, user, canvasRef }) {
  const count = Object.keys(remoteStreams).length + 1 // +1 for local

  // Calculate grid layout based on participant count
  const getGridClass = () => {
    if (count === 1) return 'grid-cols-1 grid-rows-1'
    if (count === 2) return 'grid-cols-2 grid-rows-1'
    if (count <= 4) return 'grid-cols-2 grid-rows-2'
    if (count <= 6) return 'grid-cols-3 grid-rows-2'
    if (count <= 9) return 'grid-cols-3 grid-rows-3'
    return 'grid-cols-4 grid-rows-3'
  }

  return (
    <div className={`w-full h-full grid ${getGridClass()} gap-2 p-2 relative`}>
      {/* Local video */}
      <div className="relative min-h-0">
        <VideoTile
          stream={localStream}
          muted={true}
          mirrored={true}
          name={user?.name}
          role={user?.role}
          isLocal={true}
          videoOn={localVideoOn}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Remote videos */}
      {Object.entries(remoteStreams).map(([socketId, { stream, userInfo }]) => {
        // Check if remote video track is enabled
        const videoTracks = stream?.getVideoTracks() || []
        const remoteVideoOn = videoTracks.length > 0 && videoTracks.some(t => t.enabled && t.readyState === 'live')
        return (
          <div key={socketId} className="relative min-h-0">
            <VideoTile
              stream={stream}
              muted={false}
              mirrored={false}
              name={userInfo?.userName}
              role={userInfo?.role || 'student'}
              isLocal={false}
              videoOn={remoteVideoOn}
            />
          </div>
        )
      })}

      {/* Empty state */}
      {Object.keys(remoteStreams).length === 0 && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-full text-gray-400 text-sm">
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
function LiveClassroom({ classData, user, onLeave, initialSettings }) {
  const [micOn, setMicOn] = useState(initialSettings?.micOn ?? false)
  const [videoOn, setVideoOn] = useState(initialSettings?.videoOn ?? false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
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

  // Face detection state (privacy-focused, browser-side only)
  const [faceTrackingActive, setFaceTrackingActive] = useState(false)
  const [lastDetection, setLastDetection] = useState(null)
  const [faceModelsLoading, setFaceModelsLoading] = useState(false)
  
  // Dual-track camera state
  // Track A: WebRTC video (visible to others) - controlled by videoOn
  // Track B: Local attendance video (internal) - keeps running for attendance
  const [attendanceStreamActive, setAttendanceStreamActive] = useState(false)
  const consentGiven = initialSettings?.consentGiven ?? false

  // Waiting room states - Students start in waiting state by default
  const [waitingForApproval, setWaitingForApproval] = useState(user?.role === 'student')
  const [joinRejected, setJoinRejected] = useState(false)
  const [joinRequests, setJoinRequests] = useState([]) // Teacher's waiting list

  // Connection state for debugging
  const [connectionState, setConnectionState] = useState('connecting')

  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState({})
  const [participants, setParticipants] = useState({ teacher: null, students: [], count: 1 })

  const [localStream, setLocalStream] = useState(null)

  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const attendanceVideoRef = useRef(null) // Separate video element for attendance tracking
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const faceTrackerRef = useRef(null) // Face detection tracker
  const webrtcRef = useRef(null)

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
        console.log('Remote stream received:', socketId, userInfo)
        setRemoteStreams(prev => ({
          ...prev,
          [socketId]: { stream: remoteStream, userInfo }
        }))
      }

      rtc.callbacks.onRemoteStreamRemoved = (socketId) => {
        setRemoteStreams(prev => {
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
                // Add new student with default engagement values
                updated.push({
                  id: p.userId,
                  name: p.userName || 'Student',
                  engagement: 0,
                  status: 'active',
                  lookingAtScreen: false,
                })
              }
            })
            // Remove students no longer in participants
            const participantIds = parts.students.map(p => p.userId).filter(Boolean)
            return updated.filter(s => participantIds.includes(s.id))
          })
        } else {
          // No students in room, clear engagement list
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
        // Start attendance and face tracking after approval (student with consent)
        if (user?.role === 'student' && consentGiven) {
          const newSessionId = `${classData.class_id}_${Date.now()}`
          setSessionId(newSessionId)
          
          // Start attendance session on backend
          attendanceAPI.start(classData.class_id, newSessionId)
            .then(() => {
              console.log('[Classroom] Attendance session started')
              // Initialize face tracking
              initializeFaceTracking(newSessionId)
            })
            .catch(err => console.error('Failed to start attendance:', err))
        }
      }

      // Initialize face detection for attendance (browser-side only)
      const initializeFaceTracking = async (sessionIdToUse) => {
        if (!consentGiven || user?.role !== 'student') return
        
        setFaceModelsLoading(true)
        try {
          await loadFaceDetectionModels()
          
          // Set up the attendance video element (separate from WebRTC video)
          if (attendanceVideoRef.current && localStreamRef.current) {
            attendanceVideoRef.current.srcObject = localStreamRef.current
            setAttendanceStreamActive(true)
            
            // Create face tracker
            const tracker = createFaceTracker(
              attendanceVideoRef.current,
              async (detection) => {
                // Generate metadata (no video/images sent to server)
                const metadata = generateAttendanceMetadata(
                  user?.id || user?._id,
                  classData.class_id,
                  detection
                )
                metadata.session_id = sessionIdToUse
                
                // Update local state for UI feedback
                setLastDetection(detection)
                
                // Send only metadata to backend
                try {
                  await attendanceAPI.submitMetadata(metadata)
                } catch (err) {
                  console.error('[FaceTracking] Failed to submit metadata:', err)
                }
              },
              3000 // Detection interval: every 3 seconds
            )
            
            faceTrackerRef.current = tracker
            await tracker.start()
            setFaceTrackingActive(true)
            console.log('[Classroom] Face tracking started (browser-side)')
          }
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
  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const vt = stream.getVideoTracks()
    if (vt.length > 0) {
      vt.forEach(t => { t.enabled = videoOn })
    }
  }, [videoOn])

  // ── Toggle audio track ──
  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const at = stream.getAudioTracks()
    if (at.length > 0) {
      at.forEach(t => { t.enabled = micOn })
    }
  }, [micOn])

  // ── Dual-Track Camera Logic ──
  // Track A: WebRTC video (controlled by videoOn state) - handled by toggle above
  // Track B: Attendance video (stays active for face tracking even when WebRTC video is off)
  useEffect(() => {
    if (user?.role !== 'student' || !consentGiven || !faceTrackerRef.current) return
    
    // Face tracking continues regardless of WebRTC video state
    // When camera is "off" for peers, attendance tracking still runs locally
    // This is transparent to the student through the UI indicator
    
    // Note: The video track for attendance is never stopped, only WebRTC sending is affected
    // This ensures continuous attendance tracking with user consent
    
  }, [videoOn, user?.role, consentGiven])

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

  // ── Handlers ──
  const handleLeaveClass = async () => {
    if (!window.confirm('Leave the classroom?')) return
    
    // Stop face tracking
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
      webrtcRef.current.removeUser(targetSocketId)
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
    if (!webrtcRef.current) return
    if (isScreenSharing) {
      webrtcRef.current.stopScreenShare()
      setIsScreenSharing(false)
    } else {
      const result = await webrtcRef.current.startScreenShare()
      if (result) setIsScreenSharing(true)
    }
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
    <div className="h-[100dvh] bg-gray-900 flex flex-col overflow-hidden">
      {/* Teacher Left overlay */}
      {teacherLeft && user?.role === 'student' && <TeacherLeftBanner onLeave={onLeave} />}

      {/* Removed from room overlay */}
      {removedFromRoom && <RemovedBanner onLeave={onLeave} />}

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

      {/* ── Top Bar ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 bg-primary-600/20 rounded-lg items-center justify-center hidden sm:flex flex-shrink-0">
              <Monitor className="w-4 h-4 text-primary-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-sm sm:text-lg font-semibold truncate">{classData?.title || 'Classroom'}</h1>
              <p className="text-gray-400 text-[11px] sm:text-sm truncate">{classData?.teacher_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-600/20 border border-green-600/40 rounded-lg">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs sm:text-sm font-medium">Live</span>
            </div>
            <button
              onClick={() => togglePanel('participants')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${showParticipants ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              <Users className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium">{participants.count || 1}</span>
            </button>
            <button onClick={handleLeaveClass} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 text-xs sm:text-sm">
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline font-medium">Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Hidden video element for local stream (needed for canvas capture) */}
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
          
          {/* Hidden video element for attendance tracking (separate from WebRTC) */}
          {user?.role === 'student' && consentGiven && (
            <video ref={attendanceVideoRef} autoPlay playsInline muted className="hidden" />
          )}
          
          {/* Attendance Tracking Active Indicator - shown when camera is off but tracking continues */}
          {user?.role === 'student' && faceTrackingActive && !videoOn && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-primary-600/90 backdrop-blur-sm rounded-lg shadow-lg border border-primary-500/50">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-medium">Attendance Tracking Active</span>
              {lastDetection?.faceDetected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
          )}
          
          {/* Face detection status indicator (for student awareness) */}
          {user?.role === 'student' && faceTrackingActive && videoOn && lastDetection && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-2.5 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-lg">
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
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg">
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              <span className="text-gray-300 text-xs">Loading face detection...</span>
            </div>
          )}

          <VideoGrid
            localStream={localStream}
            localVideoOn={videoOn}
            remoteStreams={remoteStreams}
            user={user}
            canvasRef={canvasRef}
          />

          {/* ── Bottom Controls (Google Meet style) ── */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800/95 border-t border-gray-700 px-3 sm:px-6 py-3 sm:py-4 backdrop-blur safe-bottom">
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

                {/* Video */}
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
                    className={`p-3 sm:p-4 rounded-full transition hidden sm:block ${isScreenSharing ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'}`}
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
          <div className="md:hidden absolute inset-x-0 bottom-[72px] top-0 z-10 flex flex-col">
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
    return <LiveClassroom classData={classData} user={user} onLeave={handleLeave} initialSettings={joinSettings} />
  }

  // Student flow: WaitingRoom (if not live) -> PreJoin -> LiveClassroom
  if (!isLive) {
    return <WaitingRoom classData={classData} onClassStarted={handleClassStarted} onLeave={handleLeave} />
  }

  if (!hasJoined) {
    return <PreJoinScreen classData={classData} user={user} onJoin={handleJoin} onLeave={handleLeave} />
  }

  return <LiveClassroom classData={classData} user={user} onLeave={handleLeave} initialSettings={joinSettings} />
}

export default Classroom

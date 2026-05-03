import { useEffect, useRef, useState, useCallback } from 'react'
import { loadFaceDetectionModels, detectFaces } from '../services/faceDetection'

const ATTENTIVE_SCORE_THRESHOLD = 55

/**
 * useEngagementDetection
 *
 * Runs face detection every 5 seconds and emits engagement status to the
 * signaling server via the WebRTC manager so the teacher dashboard receives
 * real-time student engagement data through the engagement-update event.
 *
 * Logic:
 *   face detected (multiple)                 → engagement = "distracted"
 *   single face + low attention score (<55) → engagement = "distracted"
 *   single face + good attention score       → engagement = "attentive"
 *   no face detected                         → engagement = "not-detected"
 *
 * Fallback (when face-api models fail to load):
 *   treat as not-detected to avoid false present status.
 *
 * @param {object}  videoRef   – React ref pointing to the <video> element
 * @param {object}  webrtcRef  – React ref pointing to the WebRTC manager
 * @param {string}  userId     – Student's user ID
 * @param {string}  userName   – Student's display name
 * @param {boolean} isActive   – Detection only runs while this is true
 *
 * @returns {{ faceDetected: boolean, modelsLoaded: boolean, engagementStatus: string }}
 */
export function useEngagementDetection({ videoRef, webrtcRef, userId, userName, isActive }) {
  const [faceDetected, setFaceDetected]         = useState(false)
  const [modelsLoaded, setModelsLoaded]         = useState(false)
  const [engagementStatus, setEngagementStatus] = useState('not-detected')

  const modelsLoadedRef = useRef(false)
  const intervalRef     = useRef(null)
  const lastVideoWarningRef = useRef(0)
  const lastStatusRef = useRef('not-detected') // Track last emitted status
  const lastCameraOnRef = useRef(null) // Track last emitted camera state

  // ── Load face-api models once on mount ──────────────────────────────────
  useEffect(() => {
    loadFaceDetectionModels().then(loaded => {
      modelsLoadedRef.current = loaded
      setModelsLoaded(loaded)
      if (!loaded) {
        console.warn('[useEngagementDetection] Face models failed to load – using camera fallback')
      }
    })
  }, [])

  // ── Single detection pass ────────────────────────────────────────────────
  const runDetection = useCallback(async () => {
    if (!webrtcRef.current) return

    let status = 'not-detected'
    let faceDetectedThisRound = false

    const videoElement = videoRef.current
    const cameraOn = !!videoElement?.srcObject?.getVideoTracks?.().some(track => track.enabled)
    const videoReady = !!(
      videoElement &&
      videoElement.readyState >= 2 &&
      videoElement.videoWidth > 0 &&
      videoElement.videoHeight > 0 &&
      !videoElement.paused &&
      !videoElement.ended
    )

    if (modelsLoadedRef.current && videoReady) {
      // Primary path: face-api.js detection
      const result = await detectFaces(videoElement)
      faceDetectedThisRound = result.faceDetected
      setFaceDetected(faceDetectedThisRound)

      if (result.multipleFaces) {
        status = 'distracted'
      } else if (faceDetectedThisRound) {
        const attentionScore = typeof result.attentionScore === 'number' ? result.attentionScore : 0
        status = attentionScore >= ATTENTIVE_SCORE_THRESHOLD ? 'attentive' : 'distracted'
      }
    } else {
      if (videoElement && Date.now() - lastVideoWarningRef.current > 8000) {
        console.log('[useEngagementDetection] Video not ready for face detection:', {
          readyState: videoElement?.readyState,
          width: videoElement?.videoWidth,
          height: videoElement?.videoHeight,
          paused: videoElement?.paused,
          ended: videoElement?.ended,
          modelsLoaded: modelsLoadedRef.current,
        })
        lastVideoWarningRef.current = Date.now()
      }

      // Conservative fallback: never mark present without actual face detection.
      setFaceDetected(false)
      status = 'not-detected'
    }

    setEngagementStatus(status)

    // KEY LOGIC: Present based on FACE DETECTION, not camera visibility
    // This ensures students are marked present even if they turn off camera
    // but their face is still detected (e.g., in the background)
    const isPresent = status === 'attentive' && faceDetectedThisRound
    const statusOrCameraChanged = status !== lastStatusRef.current || cameraOn !== lastCameraOnRef.current

    // Emit when either engagement status or camera state changes.
    if (statusOrCameraChanged) {
      const oldStatus = lastStatusRef.current
      lastStatusRef.current = status
      lastCameraOnRef.current = cameraOn

      console.debug('[useEngagementDetection] Status changed:', {
        studentId: userId,
        oldStatus,
        newStatus: status,
        faceDetected: faceDetectedThisRound,
        cameraOn,
        isPresent: isPresent,
      })

      // Emit to signaling server → forwarded to teacher as 'engagement-update'
      // CRITICAL FIELDS:
      // - isPresent: boolean = true when face is attentively detected (camera state independent)
      // - cameraOn: boolean = actual user camera visibility state
      // - status: string = 'attentive'|'distracted'|'not-detected'
      // - faceDetected: boolean = whether face was detected this round
      webrtcRef.current.sendEngagementUpdate(userId, status, userName, cameraOn, isPresent, Date.now())
    }
  }, [userId, userName, videoRef, webrtcRef])

  // ── Start / stop 5-second interval tied to isActive ─────────────────────
  useEffect(() => {
    if (!isActive) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    // Immediate first run, then every 5 seconds
    runDetection()
    intervalRef.current = setInterval(runDetection, 5000)

    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isActive, runDetection])

  return { faceDetected, modelsLoaded, engagementStatus }
}

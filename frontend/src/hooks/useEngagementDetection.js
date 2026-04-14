import { useEffect, useRef, useState, useCallback } from 'react'
import { loadFaceDetectionModels, detectFaces } from '../services/faceDetection'

/**
 * useEngagementDetection
 *
 * Runs face detection every 5 seconds and emits engagement status to the
 * signaling server via the WebRTC manager so the teacher dashboard receives
 * real-time student engagement data through the engagement-update event.
 *
 * Logic:
 *   face detected (single)   → engagement = "attentive"
 *   face detected (multiple) → engagement = "distracted"
 *   no face detected         → engagement = "not-detected"
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
        status = 'attentive'
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

    // KEY LOGIC: isPresent is TRUE only if face was detected (status !== 'not-detected')
    // This means:
    // - 'attentive' → isPresent = true
    // - 'distracted' → isPresent = true
    // - 'not-detected' → isPresent = false
    const isPresent = status !== 'not-detected'

    // Only emit socket update if status changed (reduce API load)
    if (status !== lastStatusRef.current) {
      lastStatusRef.current = status

      console.debug('[useEngagementDetection] Status changed:', {
        studentId: userId,
        oldStatus: lastStatusRef.current,
        newStatus: status,
        faceDetected: faceDetectedThisRound,
        isPresent: isPresent,
      })

      // Emit to signaling server → forwarded to teacher as 'engagement-update'
      // CRITICAL FIELDS:
      // - isPresent: boolean = true if face detected, false otherwise
      // - cameraOn: boolean = true (physical camera always on for face detection)
      // - status: string = 'attentive'|'distracted'|'not-detected'
      webrtcRef.current.sendEngagementUpdate(userId, status, userName, true, isPresent, Date.now())
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

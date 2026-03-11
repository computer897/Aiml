import { useEffect, useRef, useState, useCallback } from 'react'
import { loadFaceDetectionModels, detectFaces } from '../services/faceDetection'

/**
 * useEngagementDetection
 *
 * Runs face detection every 3 seconds and emits engagement status to the
 * signaling server via the WebRTC manager so the teacher dashboard receives
 * real-time student engagement data.
 *
 * Logic:
 *   face detected (single)   → engagement = "attentive"
 *   face detected (multiple) → engagement = "distracted"
 *   no face detected         → engagement = "not-detected"
 *
 * Fallback (when face-api models fail to load):
 *   camera track live        → engagement = "attentive"
 *   camera track missing     → engagement = "not-detected"
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

    if (modelsLoadedRef.current && videoRef.current) {
      // Primary path: face-api.js detection
      const result = await detectFaces(videoRef.current)
      const detected = result.faceDetected
      setFaceDetected(detected)

      if (result.multipleFaces) {
        status = 'distracted'
      } else if (detected) {
        status = 'attentive'
      }
    } else {
      // Fallback: treat camera-on as present/attentive
      const el = videoRef.current
      const hasLiveVideo = !!(
        el?.srcObject &&
        el.srcObject.getVideoTracks().some(t => t.enabled && t.readyState === 'live')
      )
      setFaceDetected(hasLiveVideo)
      status = hasLiveVideo ? 'attentive' : 'not-detected'
    }

    setEngagementStatus(status)

    // Emit to signaling server → forwarded to teacher as 'student-engagement'
    webrtcRef.current.sendEngagementUpdate(userId, status, userName, true)
  }, [userId, userName, videoRef, webrtcRef])

  // ── Start / stop 3-second interval tied to isActive ─────────────────────
  useEffect(() => {
    if (!isActive) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    // Immediate first run, then every 3 seconds
    runDetection()
    intervalRef.current = setInterval(runDetection, 3000)

    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isActive, runDetection])

  return { faceDetected, modelsLoaded, engagementStatus }
}

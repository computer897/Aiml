/**
 * Face Detection Service - Browser-Side Only
 * 
 * Uses face-api.js for local face detection without sending video to server.
 * Only metadata is transmitted to the backend for attendance tracking.
 * 
 * PRIVACY: All face detection runs in the browser. No video/images are transmitted.
 * 
 * Metadata generated:
 * - faceDetected: boolean
 * - multipleFaces: boolean (potential cheating indicator)
 * - attentionScore: 0-100 (based on face position/orientation)
 * - timestamp: ISO string
 */

// Model loading state
let modelsLoaded = false
let modelsLoading = false
let faceapi = null

// CDN URLs for face-api.js models
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

/**
 * Load face-api.js library and models
 * Uses dynamic import to avoid bundling issues
 */
export async function loadFaceDetectionModels() {
  if (modelsLoaded) return true
  if (modelsLoading) {
    // Wait for ongoing load
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (modelsLoaded) {
          clearInterval(check)
          resolve(true)
        }
      }, 100)
    })
  }
  
  modelsLoading = true
  
  try {
    // Dynamic import of face-api.js from CDN
    if (!faceapi) {
      // Load from CDN as a UMD module
      await new Promise((resolve, reject) => {
        if (window.faceapi) {
          faceapi = window.faceapi
          resolve()
          return
        }
        
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js'
        script.async = true
        script.onload = () => {
          faceapi = window.faceapi
          resolve()
        }
        script.onerror = reject
        document.head.appendChild(script)
      })
    }
    
    // Load required models
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ])
    
    modelsLoaded = true
    console.log('[FaceDetection] Models loaded successfully')
    return true
  } catch (error) {
    console.error('[FaceDetection] Failed to load models:', error)
    modelsLoading = false
    return false
  }
}

/**
 * Detection options for TinyFaceDetector
 * Optimized for real-time performance
 */
const getDetectionOptions = () => {
  if (!faceapi) return null
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,      // Smaller = faster, 320 is good balance
    scoreThreshold: 0.5  // Confidence threshold
  })
}

/**
 * Detect faces in a video element
 * @param {HTMLVideoElement} videoElement - Video element to analyze
 * @returns {Object} Detection metadata
 */
export async function detectFaces(videoElement) {
  if (!modelsLoaded || !faceapi) {
    return {
      success: false,
      error: 'Models not loaded',
      faceDetected: false,
      multipleFaces: false,
      faceCount: 0,
      attentionScore: 0,
      timestamp: new Date().toISOString()
    }
  }
  
  if (!videoElement || videoElement.readyState < 2) {
    return {
      success: false,
      error: 'Video not ready',
      faceDetected: false,
      multipleFaces: false,
      faceCount: 0,
      attentionScore: 0,
      timestamp: new Date().toISOString()
    }
  }
  
  try {
    const options = getDetectionOptions()
    
    // Detect all faces with landmarks for attention estimation
    const detections = await faceapi
      .detectAllFaces(videoElement, options)
      .withFaceLandmarks(true)
    
    const faceCount = detections.length
    const faceDetected = faceCount > 0
    const multipleFaces = faceCount > 1
    
    // Calculate attention score based on face position and size
    let attentionScore = 0
    
    if (faceDetected && detections[0]) {
      const detection = detections[0]
      const box = detection.detection.box
      
      // Get video dimensions
      const videoWidth = videoElement.videoWidth
      const videoHeight = videoElement.videoHeight
      
      // Calculate face center position
      const faceCenterX = box.x + box.width / 2
      const faceCenterY = box.y + box.height / 2
      
      // Calculate how centered the face is (0-100)
      const centerOffsetX = Math.abs(faceCenterX - videoWidth / 2) / (videoWidth / 2)
      const centerOffsetY = Math.abs(faceCenterY - videoHeight / 2) / (videoHeight / 2)
      const centerScore = Math.max(0, 100 - (centerOffsetX + centerOffsetY) * 50)
      
      // Calculate face size score (larger face = more engaged/closer)
      const faceArea = box.width * box.height
      const videoArea = videoWidth * videoHeight
      const faceRatio = faceArea / videoArea
      // Ideal face ratio is around 10-30% of frame
      const sizeScore = faceRatio > 0.05 ? Math.min(100, faceRatio * 500) : faceRatio * 1000
      
      // If face landmarks available, check if looking at camera
      let lookingScore = 70 // Default if no landmarks
      if (detection.landmarks) {
        const landmarks = detection.landmarks
        const leftEye = landmarks.getLeftEye()
        const rightEye = landmarks.getRightEye()
        const nose = landmarks.getNose()
        
        if (leftEye && rightEye && nose) {
          // Calculate eye distance and nose position to estimate head pose
          const eyeDistance = Math.abs(rightEye[0].x - leftEye[0].x)
          const noseX = nose[0].x
          const eyeCenterX = (leftEye[0].x + rightEye[0].x) / 2
          const noseOffset = Math.abs(noseX - eyeCenterX) / eyeDistance
          
          // If nose is centered between eyes, likely looking at camera
          lookingScore = Math.max(0, 100 - noseOffset * 200)
        }
      }
      
      // Combined attention score
      attentionScore = Math.round((centerScore * 0.3 + sizeScore * 0.3 + lookingScore * 0.4))
      attentionScore = Math.min(100, Math.max(0, attentionScore))
    }
    
    return {
      success: true,
      faceDetected,
      multipleFaces,
      faceCount,
      attentionScore,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[FaceDetection] Detection error:', error)
    return {
      success: false,
      error: error.message,
      faceDetected: false,
      multipleFaces: false,
      faceCount: 0,
      attentionScore: 0,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Create a face detection tracker that runs at intervals
 * @param {HTMLVideoElement} videoElement - Video element to track
 * @param {Function} onDetection - Callback with detection results
 * @param {number} intervalMs - Detection interval in milliseconds (default: 3000)
 * @returns {Object} Controller object with stop() method
 */
export function createFaceTracker(videoElement, onDetection, intervalMs = 3000) {
  let intervalId = null
  let isRunning = false
  let isPaused = false
  
  const runDetection = async () => {
    if (!isRunning || isPaused) return
    
    const result = await detectFaces(videoElement)
    if (onDetection && isRunning) {
      onDetection(result)
    }
  }
  
  const start = async () => {
    if (isRunning) return
    
    // Ensure models are loaded
    const loaded = await loadFaceDetectionModels()
    if (!loaded) {
      console.error('[FaceTracker] Cannot start - models not loaded')
      return false
    }
    
    isRunning = true
    isPaused = false
    
    // Run initial detection
    runDetection()
    
    // Start interval
    intervalId = setInterval(runDetection, intervalMs)
    console.log('[FaceTracker] Started with interval:', intervalMs, 'ms')
    return true
  }
  
  const stop = () => {
    isRunning = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    console.log('[FaceTracker] Stopped')
  }
  
  const pause = () => {
    isPaused = true
    console.log('[FaceTracker] Paused')
  }
  
  const resume = () => {
    isPaused = false
    console.log('[FaceTracker] Resumed')
  }
  
  return {
    start,
    stop,
    pause,
    resume,
    isRunning: () => isRunning,
    isPaused: () => isPaused
  }
}

/**
 * Generate attendance metadata object for backend submission
 * @param {string} studentId - Student's user ID
 * @param {string} classId - Class ID
 * @param {Object} detection - Detection result from detectFaces()
 * @returns {Object} Metadata object ready for backend
 */
export function generateAttendanceMetadata(studentId, classId, detection) {
  return {
    student_id: studentId,
    class_id: classId,
    face_detected: detection.faceDetected,
    multiple_faces: detection.multipleFaces,
    face_count: detection.faceCount,
    attention_score: detection.attentionScore,
    timestamp: detection.timestamp,
    // For transparency
    processing_location: 'client-side',
    detection_method: 'face-api.js'
  }
}

export default {
  loadFaceDetectionModels,
  detectFaces,
  createFaceTracker,
  generateAttendanceMetadata
}

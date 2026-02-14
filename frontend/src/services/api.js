// API Base URL - uses VITE_API_URL env var in production, falls back to localhost for dev
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://aiml-1-rjdv.onrender.com').replace(/\/+$/, '')

// Helper function to get auth token
const getAuthToken = () => {
  const user = localStorage.getItem('user')
  if (user) {
    const userData = JSON.parse(user)
    return userData.token
  }
  return null
}

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle authentication errors - token expired or invalid
      if (response.status === 401) {
        // Clear stored user data and redirect to login
        localStorage.removeItem('user')
        window.location.href = '/login'
        throw new Error('Session expired. Please log in again.')
      }
      
      // FastAPI validation errors return detail as an array of objects
      let message = 'API request failed'
      if (typeof data.detail === 'string') {
        message = data.detail
      } else if (Array.isArray(data.detail)) {
        message = data.detail
          .map((err) => err.msg || JSON.stringify(err))
          .join('. ')
      }
      throw new Error(message)
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    // Ensure we always throw an Error with a string message
    if (error instanceof Error) {
      throw error
    }
    throw new Error(typeof error === 'string' ? error : 'Something went wrong. Please try again.')
  }
}

// Authentication APIs
export const authAPI = {
  register: async (name, email, password, role) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    })
  },

  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
}

// Class APIs
export const classAPI = {
  create: async (classData) => {
    return apiRequest('/class/create', {
      method: 'POST',
      body: JSON.stringify(classData),
    })
  },

  get: async (classId) => {
    return apiRequest(`/class/${classId}`)
  },

  join: async (classId) => {
    return apiRequest(`/class/${classId}/join`, {
      method: 'POST',
    })
  },

  getStudents: async (classId) => {
    return apiRequest(`/class/${classId}/students`)
  },

  activate: async (classId) => {
    return apiRequest(`/class/${classId}/activate`, {
      method: 'POST',
    })
  },

  deactivate: async (classId) => {
    return apiRequest(`/class/${classId}/deactivate`, {
      method: 'POST',
    })
  },

  delete: async (classId) => {
    return apiRequest(`/class/${classId}`, {
      method: 'DELETE',
    })
  },

  getTeacherClasses: async () => {
    return apiRequest('/class/teacher/classes')
  },

  getStudentClasses: async () => {
    return apiRequest('/class/student/classes')
  },
}

// Attendance APIs
export const attendanceAPI = {
  start: async (classId, sessionId) => {
    return apiRequest('/attendance/start', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, session_id: sessionId }),
    })
  },

  // DEPRECATED: Legacy frame-based tracking (sends images to backend)
  submitFrame: async (attendanceId, frameBase64) => {
    return apiRequest('/attendance/frame', {
      method: 'POST',
      body: JSON.stringify({
        attendance_id: attendanceId,
        frame_base64: frameBase64,
      }),
    })
  },

  /**
   * Submit metadata-only attendance update (PRIVACY-FOCUSED)
   * No video/images are sent - only detection metadata from browser-side processing
   * 
   * @param {Object} metadata - Face detection metadata
   * @param {string} metadata.student_id
   * @param {string} metadata.class_id
   * @param {string} metadata.session_id
   * @param {boolean} metadata.face_detected
   * @param {boolean} metadata.multiple_faces
   * @param {number} metadata.attention_score (0-100)
   * @param {string} metadata.timestamp (ISO string)
   */
  submitMetadata: async (metadata) => {
    return apiRequest('/attendance/metadata', {
      method: 'POST',
      body: JSON.stringify(metadata),
    })
  },

  end: async (sessionId) => {
    return apiRequest('/attendance/end', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    })
  },

  getReport: async (classId, sessionId) => {
    return apiRequest(`/attendance/report/${classId}/${sessionId}`)
  },

  // Get live attendance for a class (for teacher dashboard)
  getLiveAttendance: async (classId) => {
    return apiRequest(`/attendance/live/${classId}`)
  },

  // Export attendance as CSV
  exportCSV: async (classId, sessionId) => {
    const token = getAuthToken()
    const response = await fetch(`${API_BASE_URL}/attendance/export/${classId}/${sessionId}?format=csv`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('Failed to export attendance')
    return response.blob()
  },

  getStudentHistory: async (studentId) => {
    return apiRequest(`/attendance/student/${studentId}`)
  },
}

// WebSocket connection for real-time updates
export const createWebSocket = (classId) => {
  const token = getAuthToken()
  const wsBase = API_BASE_URL.replace(/^http/, 'ws')
  const ws = new WebSocket(`${wsBase}/attendance/ws/${classId}?token=${token}`)
  
  return ws
}

// Webcam utilities for capturing frames
export const webcamUtils = {
  captureFrame: (videoElement, canvasElement) => {
    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    const ctx = canvasElement.getContext('2d')
    ctx.drawImage(videoElement, 0, 0)
    return canvasElement.toDataURL('image/jpeg').split(',')[1] // Return only base64 data
  },

  startWebcam: async ({ audio = false } = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: audio,
      })
      return stream
    } catch (error) {
      console.error('Error accessing webcam:', error)
      throw error
    }
  },

  stopWebcam: (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  },
}

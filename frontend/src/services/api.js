// API Base URL - uses VITE_API_URL env var in production, falls back to localhost for dev
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://aiml-1-rjdv.onrender.com').replace(/\/+$/, '')

console.log('[API] Configured API Base URL:', API_BASE_URL)

// Helper function to get auth token
const getAuthToken = () => {
  const user = localStorage.getItem('user')
  if (user) {
    const userData = JSON.parse(user)
    return userData.token
  }
  return null
}

// Helper function for API requests with retry logic
const apiRequest = async (endpoint, options = {}, retryCount = 0, maxRetries = 2) => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const fullUrl = `${API_BASE_URL}${endpoint}`
    const method = options.method || 'GET'
    
    console.log(`[API] Request (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
      method,
      url: fullUrl,
      hasAuth: !!token,
      timestamp: new Date().toISOString()
    })
    
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      timeout: 15000 // 15 second timeout
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle authentication errors - token expired or invalid
      if (response.status === 401) {
        console.error('[API] Authentication failed - clearing session')
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
      
      console.error('[API] Error Response:', { 
        status: response.status, 
        statusText: response.statusText,
        detail: data.detail,
        message,
        endpoint,
        url: fullUrl
      })
      
      // Retry on 5xx server errors
      if (response.status >= 500 && retryCount < maxRetries) {
        console.warn(`[API] Server error (${response.status}), retrying...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return apiRequest(endpoint, options, retryCount + 1, maxRetries)
      }
      
      throw new Error(message)
    }

    console.log('[API] Response Success:', { endpoint, status: response.status, timestamp: new Date().toISOString() })
    return data
  } catch (error) {
    console.error('[API] Error:', { 
      endpoint, 
      error: error.message,
      errorType: error.constructor.name,
      retryCount,
      timestamp: new Date().toISOString()
    })
    
    // Retry on network errors
    if (error.message.includes('fetch') && retryCount < maxRetries) {
      console.warn(`[API] Network error, retrying... (attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return apiRequest(endpoint, options, retryCount + 1, maxRetries)
    }
    
    // Ensure we always throw an Error with a string message
    if (error instanceof Error) {
      throw error
    }
    throw new Error(typeof error === 'string' ? error : 'Something went wrong. Please try again.')
  }
}

const apiDownload = async (endpoint, options = {}) => {
  const token = getAuthToken()
  const headers = {
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Download request failed'
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') {
        message = data.detail
      }
    } catch {
      // Ignore JSON parse failures for non-JSON responses
    }
    throw new Error(message)
  }

  return response.blob()
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

  getTeacherClasses: async () => {
    return apiRequest('/class/teacher/classes')
  },

  getStudentClasses: async () => {
    return apiRequest('/class/student/classes')
  },

  getStudentNotifications: async () => {
    return apiRequest('/class/student/notifications')
  },

  delete: async (classId) => {
    return apiRequest(`/class/${classId}`, {
      method: 'DELETE',
    })
  },
}

// Document APIs
export const documentAPI = {
  getByClass: async (classId) => {
    return apiRequest(`/documents/class/${classId}`)
  },

  upload: async (classId, title, description, fileUrl, fileName, fileType, fileSize) => {
    return apiRequest('/documents', {
      method: 'POST',
      body: JSON.stringify({
        class_id: classId,
        title,
        description,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
      }),
    })
  },

  delete: async (documentId) => {
    return apiRequest(`/documents/${documentId}`, {
      method: 'DELETE',
    })
  },

  markViewed: async (documentId) => {
    return apiRequest(`/documents/${documentId}/view`, {
      method: 'POST',
    })
  },
}

// Announcement APIs
export const announcementAPI = {
  getByClass: async (classId) => {
    return apiRequest(`/announcements/class/${classId}`)
  },

  create: async (classId, title, content, priority = 'normal') => {
    return apiRequest('/announcements', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, title, content, priority }),
    })
  },

  delete: async (announcementId) => {
    return apiRequest(`/announcements/${announcementId}`, {
      method: 'DELETE',
    })
  },

  getSeenBy: async (announcementId) => {
    return apiRequest(`/announcements/${announcementId}/seen`)
  },
}

// Attendance APIs
export const attendanceAPI = {
  start: async (classId, sessionId, options = {}) => {
    return apiRequest('/attendance/start', {
      method: 'POST',
      body: JSON.stringify({
        class_id: classId,
        session_id: sessionId,
        class_title: options.classTitle,
        teacher_name: options.teacherName,
        started_at: options.startedAt,
      }),
    })
  },

  submitMetadata: async (metadata) => {
    return apiRequest('/attendance/metadata', {
      method: 'POST',
      body: JSON.stringify(metadata),
    })
  },

  submitFrame: async (attendanceId, frameBase64) => {
    return apiRequest('/attendance/frame', {
      method: 'POST',
      body: JSON.stringify({
        attendance_id: attendanceId,
        frame_base64: frameBase64,
      }),
    })
  },

  end: async (payload) => {
    const requestBody = typeof payload === 'string'
      ? { session_id: payload }
      : {
          class_id: payload?.classId,
          session_id: payload?.sessionId,
          ended_at: payload?.endedAt,
        }

    return apiRequest('/attendance/end', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  },

  getReport: async (classId, sessionId = null) => {
    if (sessionId) {
      return apiRequest(`/attendance/report/${classId}/${sessionId}`)
    }
    return apiRequest(`/attendance/report/${classId}`)
  },

  getByClass: async (classId) => {
    return apiRequest(`/attendance/${classId}`)
  },

  listReports: async (classId, limit = 25) => {
    return apiRequest(`/attendance/reports/${classId}?limit=${limit}`)
  },

  getLive: async (classId) => {
    return apiRequest(`/attendance/live/${classId}`)
  },

  deleteReport: async (classId, sessionId) => {
    return apiRequest(`/attendance/report/${classId}/${sessionId}`, {
      method: 'DELETE',
    })
  },

  getStudentHistory: async (studentId) => {
    return apiRequest(`/attendance/student/${studentId}`)
  },

  exportCSV: async (classId, sessionId) => {
    return apiDownload(`/attendance/export/${classId}/${sessionId}`)
  },

  exportCsv: async (classId, sessionId) => {
    return apiDownload(`/attendance/export/${classId}/${sessionId}`)
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

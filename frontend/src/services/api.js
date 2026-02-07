// API Base URL - uses VITE_API_URL env var in production, falls back to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

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
      throw new Error(data.detail || 'API request failed')
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
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

  getTeacherClasses: async () => {
    return apiRequest('/class/teacher/classes')
  },

  getStudentClasses: async () => {
    return apiRequest('/class/student/classes')
  },
}

// Attendance APIs
export const attendanceAPI = {
  start: async (classId) => {
    return apiRequest('/attendance/start', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId }),
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

  end: async (attendanceId) => {
    return apiRequest('/attendance/end', {
      method: 'POST',
      body: JSON.stringify({ attendance_id: attendanceId }),
    })
  },

  getReport: async (classId, sessionId) => {
    return apiRequest(`/attendance/report/${classId}/${sessionId}`)
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

  startWebcam: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
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

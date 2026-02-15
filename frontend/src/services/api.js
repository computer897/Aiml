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
  register: async (name, email, password, role, collegeName, departmentName) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        role,
        college_name: collegeName,
        department_name: departmentName
      }),
    })
  },

  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  getProfile: async () => {
    return apiRequest('/auth/me')
  },

  updateProfile: async (profileData) => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  },

  updatePassword: async (currentPassword, newPassword) => {
    return apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
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

  update: async (classId, classData) => {
    return apiRequest(`/class/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    })
  },

  delete: async (classId) => {
    return apiRequest(`/class/${classId}`, {
      method: 'DELETE',
    })
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

  getAvailableClasses: async () => {
    return apiRequest('/class/student/available')
  },
}

// Join Request APIs (Google Meet style)
export const joinRequestAPI = {
  create: async (classId) => {
    return apiRequest(`/join-request/${classId}`, {
      method: 'POST',
    })
  },

  getPending: async (classId) => {
    return apiRequest(`/join-request/pending/${classId}`)
  },

  accept: async (requestId) => {
    return apiRequest(`/join-request/${requestId}/accept`, {
      method: 'POST',
    })
  },

  reject: async (requestId) => {
    return apiRequest(`/join-request/${requestId}/reject`, {
      method: 'POST',
    })
  },

  getStatus: async (classId) => {
    return apiRequest(`/join-request/status/${classId}`)
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

  exportCsv: async (classId, sessionId) => {
    // Returns the URL to download the CSV file
    const token = getAuthToken()
    const url = `${API_BASE_URL}/attendance/export/${classId}/${sessionId}?format=csv`
    
    // Create download link with auth
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Download failed' }))
      throw new Error(error.detail || 'Failed to export attendance')
    }
    
    // Download the CSV
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `attendance_${classId}_${sessionId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
    
    return { success: true }
  },
}

// Announcement APIs
export const announcementAPI = {
  create: async (classId, title, content, priority = 'normal') => {
    return apiRequest('/announcements', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, title, content, priority }),
    })
  },

  getByClass: async (classId) => {
    return apiRequest(`/announcements/class/${classId}`)
  },

  markSeen: async (announcementId) => {
    return apiRequest(`/announcements/${announcementId}/seen`, {
      method: 'POST',
    })
  },

  delete: async (announcementId) => {
    return apiRequest(`/announcements/${announcementId}`, {
      method: 'DELETE',
    })
  },

  getSeenBy: async (announcementId) => {
    return apiRequest(`/announcements/${announcementId}/seen-by`)
  },
}

// Document APIs
export const documentAPI = {
  upload: async (classId, title, description, fileUrl, fileName, fileType, fileSize = 0) => {
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

  getByClass: async (classId) => {
    return apiRequest(`/documents/class/${classId}`)
  },

  markViewed: async (documentId) => {
    return apiRequest(`/documents/${documentId}/view`, {
      method: 'POST',
    })
  },

  delete: async (documentId) => {
    return apiRequest(`/documents/${documentId}`, {
      method: 'DELETE',
    })
  },

  getTeacherDocuments: async () => {
    return apiRequest('/documents/teacher/all')
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

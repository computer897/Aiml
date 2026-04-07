/**
 * Centralized Socket.IO Service for Virtual Classroom
 * Handles real-time updates for classrooms, attendance, and engagement
 * Provides auto-reconnect with exponential backoff
 */

import { io } from 'socket.io-client'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://aiml-1-rjdv.onrender.com').replace(/\/+$/, '')

console.log('[SocketIO] Configured with base URL:', API_BASE_URL)

// Single socket instance (shared across app)
let globalSocket = null
const eventListeners = new Map() // Map<eventName, Set<callbacks>>

/**
 * Gets or creates the global socket connection
 */
const ensureConnection = () => {
  if (globalSocket?.connected) {
    return globalSocket
  }

  if (globalSocket) {
    globalSocket.disconnect()
  }

  const token = localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user')).token
    : null

  globalSocket = io(API_BASE_URL, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: false,
    autoConnect: true,
  })

  // Debug: Connection events
  globalSocket.on('connect', () => {
    console.log('[SocketIO] ✅ Connected:', globalSocket.id)
    emitListenerEvent('socket:connect', { socketId: globalSocket.id })
  })

  globalSocket.on('disconnect', (reason) => {
    console.warn('[SocketIO] ⚠️ Disconnected:', reason)
    emitListenerEvent('socket:disconnect', { reason })
  })

  globalSocket.on('connect_error', (error) => {
    console.error('[SocketIO] ❌ Connection Error:', error.message)
    emitListenerEvent('socket:error', { error: error.message })
  })

  globalSocket.on('error', (error) => {
    console.error('[SocketIO] ❌ Socket Error:', error)
    emitListenerEvent('socket:error', { error })
  })

  return globalSocket
}

/**
 * Internal helper: Emit to all registered listeners
 */
const emitListenerEvent = (eventName, data) => {
  const listeners = eventListeners.get(eventName)
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(data)
      } catch (err) {
        console.error(`[SocketIO] Listener error for ${eventName}:`, err)
      }
    })
  }
}

/**
 * Join a classroom and start receiving real-time updates
 * @param {string} classId - Class ID to join
 * @param {string} userId - User ID (student or teacher)
 * @param {string} role - "teacher" or "student"
 */
export const joinClassroom = (classId, userId, role) => {
  const socket = ensureConnection()

  console.log('[SocketIO] Joining classroom:', { classId, userId, role })

  socket.emit('join-classroom', {
    classId,
    userId,
    role,
    timestamp: Date.now(),
  })
}

/**
 * Leave a classroom
 * @param {string} classId - Class ID to leave
 */
export const leaveClassroom = (classId) => {
  const socket = ensureConnection()

  console.log('[SocketIO] Leaving classroom:', classId)

  socket.emit('leave-classroom', {
    classId,
    timestamp: Date.now(),
  })
}

/**
 * Submit real-time attendance/engagement update
 * @param {string} classId - Class ID
 * @param {object} data - Engagement data (face detection, attention level, etc)
 */
export const updateEngagement = (classId, data) => {
  const socket = ensureConnection()

  socket.emit('engagement-update', {
    classId,
    ...data,
    timestamp: Date.now(),
  })
}

/**
 * Listen for attendance updates in a classroom
 * @param {string} classId - Class ID
 * @param {function} callback - Called when attendance updates: (data) => {}
 * @returns {function} Unsubscribe function
 */
export const onAttendanceUpdate = (classId, callback) => {
  const socket = ensureConnection()
  const eventName = `attendance-update:${classId}`

  // Register callback with socket
  socket.on(eventName, (data) => {
    try {
      callback(data)
    } catch (err) {
      console.error('[SocketIO] Callback error for attendance update:', err)
    }
  })

  // Return unsubscribe function
  return () => {
    socket.off(eventName, callback)
  }
}

/**
 * Listen for engagement updates
 * @param {string} classId - Class ID
 * @param {function} callback - Called on updates: (data) => {}
 * @returns {function} Unsubscribe function
 */
export const onEngagementUpdate = (classId, callback) => {
  const socket = ensureConnection()
  const eventName = `engagement-update:${classId}`

  socket.on(eventName, (data) => {
    try {
      callback(data)
    } catch (err) {
      console.error('[SocketIO] Callback error for engagement update:', err)
    }
  })

  return () => {
    socket.off(eventName, callback)
  }
}

/**
 * Listen for when a student joins the classroom
 * @param {string} classId - Class ID
 * @param {function} callback - Called when student joins: (student) => {}
 * @returns {function} Unsubscribe function
 */
export const onStudentJoined = (classId, callback) => {
  const socket = ensureConnection()
  const eventName = `student-joined:${classId}`

  socket.on(eventName, (student) => {
    try {
      callback(student)
    } catch (err) {
      console.error('[SocketIO] Callback error for student joined:', err)
    }
  })

  return () => {
    socket.off(eventName, callback)
  }
}

/**
 * Listen for when a student leaves the classroom
 * @param {string} classId - Class ID
 * @param {function} callback - Called when student leaves: (studentId) => {}
 * @returns {function} Unsubscribe function
 */
export const onStudentLeft = (classId, callback) => {
  const socket = ensureConnection()
  const eventName = `student-left:${classId}`

  socket.on(eventName, (studentId) => {
    try {
      callback(studentId)
    } catch (err) {
      console.error('[SocketIO] Callback error for student left:', err)
    }
  })

  return () => {
    socket.off(eventName, callback)
  }
}

/**
 * Listen for connection status changes
 * @param {function} callback - Called on connect/disconnect: ({ type: 'connect'|'disconnect', socketId?: string, reason?: string }) => {}
 * @returns {function} Unsubscribe function
 */
export const onConnectionStatusChange = (callback) => {
  const listeners = eventListeners.get('socket:connect') || new Set()
  listeners.add(callback)
  eventListeners.set('socket:connect', listeners)

  const listeners2 = eventListeners.get('socket:disconnect') || new Set()
  listeners2.add(callback)
  eventListeners.set('socket:disconnect', listeners2)

  return () => {
    listeners.delete(callback)
    listeners2.delete(callback)
  }
}

/**
 * Get current socket connection status
 * @returns {boolean} True if connected
 */
export const isConnected = () => {
  return globalSocket?.connected || false
}

/**
 * Get current socket ID
 * @returns {string|null} Socket ID or null if not connected
 */
export const getSocketId = () => {
  return globalSocket?.id || null
}

/**
 * Manually disconnect socket
 */
export const disconnect = () => {
  if (globalSocket) {
    console.log('[SocketIO] Manually disconnecting')
    globalSocket.disconnect()
    globalSocket = null
  }
}

/**
 * Manually reconnect socket
 */
export const reconnect = () => {
  console.log('[SocketIO] Manually reconnecting')
  if (globalSocket?.disconnected) {
    globalSocket.connect()
  } else {
    ensureConnection()
  }
}

/**
 * Emit custom event (advanced)
 * @param {string} eventName - Event name
 * @param {object} data - Event data
 * @param {function} callback - Optional callback for acknowledgment
 */
export const emit = (eventName, data, callback) => {
  const socket = ensureConnection()
  if (callback) {
    socket.emit(eventName, data, callback)
  } else {
    socket.emit(eventName, data)
  }
}

/**
 * Listen for custom event (advanced)
 * @param {string} eventName - Event name
 * @param {function} callback - Called on event: (data) => {}
 * @returns {function} Unsubscribe function
 */
export const on = (eventName, callback) => {
  const socket = ensureConnection()
  socket.on(eventName, callback)

  return () => {
    socket.off(eventName, callback)
  }
}

export default {
  ensureConnection,
  joinClassroom,
  leaveClassroom,
  updateEngagement,
  onAttendanceUpdate,
  onEngagementUpdate,
  onStudentJoined,
  onStudentLeft,
  onConnectionStatusChange,
  isConnected,
  getSocketId,
  disconnect,
  reconnect,
  emit,
  on,
}

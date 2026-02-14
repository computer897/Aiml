// Notification Service
// Utility functions for managing app notifications

const STORAGE_KEY = 'app_notifications'

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  FEATURE: 'feature',
  CLASS: 'class',
  ATTENDANCE: 'attendance'
}

// Get all notifications
export function getNotifications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Add a new notification
export function addNotification({ title, message, type = NOTIFICATION_TYPES.INFO }) {
  const notifications = getNotifications()
  
  const newNotification = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    type,
    time: new Date().toISOString(),
    read: false
  }
  
  // Add to beginning of array (newest first)
  const updated = [newNotification, ...notifications].slice(0, 50) // Keep max 50 notifications
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  
  // Dispatch storage event for same-tab updates
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(updated)
  }))
  
  return newNotification
}

// Mark notification as read
export function markAsRead(id) {
  const notifications = getNotifications()
  const updated = notifications.map(n => 
    n.id === id ? { ...n, read: true } : n
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(updated)
  }))
}

// Mark all as read
export function markAllAsRead() {
  const notifications = getNotifications()
  const updated = notifications.map(n => ({ ...n, read: true }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(updated)
  }))
}

// Clear all notifications
export function clearAllNotifications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
  
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify([])
  }))
}

// Remove single notification
export function removeNotification(id) {
  const notifications = getNotifications()
  const updated = notifications.filter(n => n.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(updated)
  }))
}

// Get unread count
export function getUnreadCount() {
  return getNotifications().filter(n => !n.read).length
}

// Convenience functions for different notification types
export function notifySuccess(title, message) {
  return addNotification({ title, message, type: NOTIFICATION_TYPES.SUCCESS })
}

export function notifyError(title, message) {
  return addNotification({ title, message, type: NOTIFICATION_TYPES.ERROR })
}

export function notifyWarning(title, message) {
  return addNotification({ title, message, type: NOTIFICATION_TYPES.WARNING })
}

export function notifyInfo(title, message) {
  return addNotification({ title, message, type: NOTIFICATION_TYPES.INFO })
}

export function notifyClassEvent(title, message) {
  return addNotification({ title, message, type: NOTIFICATION_TYPES.CLASS })
}

export function notifyAttendance(title, message) {
  return addNotification({ title, message, type: NOTIFICATION_TYPES.ATTENDANCE })
}

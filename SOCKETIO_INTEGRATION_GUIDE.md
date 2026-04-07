# Socket.IO Integration Guide for Classroom Component

## Overview

The new centralized Socket.IO service (`socketIO.js`) provides real-time updates for classrooms while abstracting away connection complexity. It handles auto-reconnect, error recovery, and room management.

## Basic Usage

### 1. Import the service

```javascript
import {
  joinClassroom,
  leaveClassroom,
  onAttendanceUpdate,
  onStudentJoined,
  onStudentLeft,
  isConnected,
  getSocketId,
  disconnect
} from '../services/socketIO'
```

### 2. Join a classroom (in useEffect)

```javascript
useEffect(() => {
  if (!user || !classData) return

  // Join the classroom
  joinClassroom(
    classData.class_id,
    user.id,
    user.role,
    user.name
  )

  // Cleanup: leave on unmount
  return () => {
    leaveClassroom(classData.class_id)
  }
}, [user, classData])
```

### 3. Listen for attendance updates

```javascript
useEffect(() => {
  if (!classData?.class_id) return

  // Subscribe to attendance updates
  const unsubscribe = onAttendanceUpdate(classData.class_id, (data) => {
    console.log('Attendance update received:', data)

    // Update your state with the new data
    setStudents(prev => prev.map(s =>
      s.id === data.studentId
        ? { ...s, isPresent: data.isPresent, faceDetected: data.faceDetected }
        : s
    ))
  })

  // Cleanup
  return unsubscribe
}, [classData?.class_id])
```

### 4. Listen for student joined/left events

```javascript
useEffect(() => {
  if (!classData?.class_id) return

  const unsub1 = onStudentJoined(classData.class_id, (student) => {
    console.log('Student joined:', student)
    setStudents(prev => [...prev, student])
  })

  const unsub2 = onStudentLeft(classData.class_id, (studentId) => {
    console.log('Student left:', studentId)
    setStudents(prev => prev.filter(s => s.id !== studentId))
  })

  return () => {
    unsub1()
    unsub2()
  }
}, [classData?.class_id])
```

## Advanced Usage

### Check connection status

```javascript
if (isConnected()) {
  console.log('Socket connected:', getSocketId())
} else {
  console.log('Socket disconnected')
}
```

### Manual reconnect (if needed)

```javascript
import { reconnect } from '../services/socketIO'

// Force manual reconnection
reconnect()
```

### Listen for connection changes

```javascript
import { onConnectionStatusChange } from '../services/socketIO'

useEffect(() => {
  const unsubscribe = onConnectionStatusChange((status) => {
    if (status.type === 'connect') {
      console.log('Connected:', status.socketId)
      setConnectionStatus('connected')
    } else if (status.type === 'disconnect') {
      console.log('Disconnected:', status.reason)
      setConnectionStatus('disconnected')
    }
  })

  return unsubscribe
}, [])
```

### Send engagement updates

```javascript
import { updateEngagement } from '../services/socketIO'

// In your face detection loop or engagement tracking code
updateEngagement(classData.class_id, {
  studentId: user.id,
  faceDetected: true,
  attentionLevel: 0.85,
  timestamp: Date.now()
})
```

## Migration from WebSocket to Socket.IO

### Before (Native WebSocket)

```javascript
const ws = new WebSocket(`ws://backend/attendance/ws/${classId}`)

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  handleUpdate(data)
}

ws.onerror = (err) => console.error(err)
ws.onclose = () => console.log('Closed')
```

### After (Socket.IO Service)

```javascript
import {
  joinClassroom,
  onAttendanceUpdate,
  onConnectionStatusChange
} from '../services/socketIO'

// Join classroom
joinClassroom(classId, userId, role)

// Listen for updates
const unsubUpdate = onAttendanceUpdate(classId, handleUpdate)

// Monitor connection
const unsubStatus = onConnectionStatusChange((status) => {
  if (status.type === 'disconnect') {
    console.log('Reconnecting...')
  }
})

// Cleanup
return () => {
  unsubUpdate()
  unsubStatus()
}
```

## Error Handling

The Socket.IO service handles errors gracefully:
- Network failures → Auto-reconnect
- Connection timeouts → Exponential backoff
- Malformed messages → Logged and ignored
- Missing callback → Error caught and logged

**No need for explicit error handling in components** - the service handles it internally.

## Performance Considerations

1. **Keep subscriptions organized** - Unsubscribe when component unmounts
2. **Avoid duplicate subscriptions** - Don't call `onAttendanceUpdate` multiple times for same classId
3. **Batch updates if possible** - Instead of 100 separate emits, batch into 1 emit every 100ms
4. **Use production SOCKET_URL** - Set `VITE_SOCKET_URL` in `.env.production`

## Debugging

Enable logging by checking browser console:
- `[SocketIO] ✅ Connected:` - Connection established
- `[SocketIO] ⚠️ Disconnected:` - Lost connection
- `[SocketIO] ❌ Connection Error:` - Connection failure
- `[SocketIO] Joining classroom:` - Emitting join event

## Common Issues

### Issue: "Socket not connected"
**Solution**: Wait for connection before joining:
```javascript
useEffect(() => {
  const checkConnection = setInterval(() => {
    if (isConnected()) {
      joinClassroom(...)
      clearInterval(checkConnection)
    }
  }, 100)
}, [])
```

### Issue: Updates not received
**Solution**:
1. Check VITE_SOCKET_URL is correct
2. Verify classId matches exactly
3. Check browser console for Socket.IO errors
4. Ensure backend socket_events.py is loaded

### Issue: Too many reconnects
**Solution**: Check if backend is running and responding to pings. May indicate server instability.


/**
 * WebRTC Service for Virtual Classroom
 * Architecture: Star topology - Teacher connects with each student individually
 * Students only connect with the teacher (not with each other)
 * Uses Socket.IO for signaling
 * 
 * WAITING ROOM SYSTEM:
 * - Students must request to join and wait for teacher approval
 * - WebRTC connections only start after approval
 */

import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://aiml-1-rjdv.onrender.com')

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

/**
 * Creates a fresh WebRTC manager instance per classroom session.
 * Do NOT reuse across sessions - call cleanup() and create a new one.
 */
export function createWebRTCManager() {
  let socket = null
  let localStream = null
  let screenStream = null
  let peers = {} // { socketId: RTCPeerConnection }
  let remoteStreams = {} // { socketId: MediaStream }
  let role = null
  let roomId = null
  let userId = null
  let userName = null
  let destroyed = false
  let isApproved = false // Track if student has been approved to join

  // Callbacks (set by component)
  const callbacks = {
    onRemoteStream: null,       // (socketId, stream, userInfo) => {}
    onRemoteStreamRemoved: null, // (socketId) => {}
    onParticipantsUpdated: null, // (participants) => {}
    onConnectionStateChange: null, // (state) => {}
    onTeacherLeft: null,         // () => {}
    onWaitingForTeacher: null,   // () => {}
    onChatMessage: null,         // (message) => {}
    onScreenShare: null,         // (socketId, stream, userInfo) => {}
    onScreenShareStopped: null,  // (socketId) => {}
    onHandRaised: null,          // ({ socketId, userId, userName, question, time }) => {}
    onForceMuted: null,          // () => {}
    onForceRemoved: null,        // () => {}
    // Waiting room callbacks
    onWaitingForApproval: null,  // () => {} - Student is in waiting room
    onJoinApproved: null,        // () => {} - Student was approved
    onJoinRejected: null,        // (message) => {} - Student was rejected
    onJoinRequest: null,         // ({ socketId, userId, userName, time }) => {} - Teacher receives join request
  }

  function connect() {
    if (destroyed) return
    if (socket?.connected) return

    console.log('[WebRTC] Connecting to:', SOCKET_URL)
    const isLocal = SOCKET_URL.includes('localhost')

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: !isLocal,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      console.log('[WebRTC] Socket connected:', socket.id)
      callbacks.onConnectionStateChange?.('connected')
    })

    socket.on('disconnect', () => {
      console.log('[WebRTC] Socket disconnected')
      callbacks.onConnectionStateChange?.('disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('[WebRTC] Connection error:', error.message)
      callbacks.onConnectionStateChange?.('error')
    })

    setupSignalingHandlers()
  }

  function setupSignalingHandlers() {
    // Receive list of existing participants in room
    // - If we're a teacher: we initiate connections to existing students
    // - If we're a student: we just note the teacher exists, wait for their offer
    socket.on('existing-students', (participants) => {
      console.log('[WebRTC] Existing participants:', participants, 'my role:', role)
      participants.forEach(participant => {
        if (participant.socketId) {
          if (role === 'teacher') {
            // Teacher initiates connection to students
            createPeerConnection(participant.socketId, true, {
              userId: participant.userId,
              userName: participant.userName
            })
          } else {
            // Student: Don't initiate - wait for teacher's offer
            // The teacher will send us an offer via 'student-joined' event on their side
            console.log('[WebRTC] Student noting teacher exists, waiting for offer:', participant.userName)
          }
        }
      })
    })

    // Teacher: new student joined
    socket.on('student-joined', (data) => {
      console.log('[WebRTC] Student joined:', data)
      createPeerConnection(data.socketId, true, {
        userId: data.userId,
        userName: data.userName
      })
    })

    // Student: receive teacher info (just informational)
    socket.on('teacher-info', (data) => {
      console.log('[WebRTC] Teacher info:', data)
    })

    // Student: waiting for teacher
    socket.on('waiting-for-teacher', () => {
      console.log('[WebRTC] Waiting for teacher')
      callbacks.onWaitingForTeacher?.()
    })

    // ── Waiting Room Events ──
    
    // Student: waiting for teacher approval
    socket.on('waiting-for-approval', () => {
      console.log('[WebRTC] Waiting for teacher approval')
      isApproved = false
      callbacks.onWaitingForApproval?.()
    })

    // Student: approved to join - NOW start WebRTC connections
    socket.on('join-approved', (data) => {
      console.log('[WebRTC] Join approved:', data)
      isApproved = true
      callbacks.onJoinApproved?.()
    })

    // Student: rejected by teacher
    socket.on('join-rejected', (data) => {
      console.log('[WebRTC] Join rejected:', data.message)
      isApproved = false
      callbacks.onJoinRejected?.(data.message)
    })

    // Teacher: receive join request from student
    socket.on('join-request', (data) => {
      console.log('[WebRTC] Join request from:', data.userName)
      callbacks.onJoinRequest?.(data)
    })

    // Receive WebRTC offer (student receives from teacher)
    socket.on('offer', async (data) => {
      console.log('[WebRTC] Received offer from:', data.from)
      // Close any existing connection to this peer first
      if (peers[data.from]) {
        peers[data.from].close()
        delete peers[data.from]
      }
      const pc = createPeerConnection(data.from, false, data.userInfo || {})
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('answer', { to: data.from, answer })
      } catch (error) {
        console.error('[WebRTC] Error handling offer:', error)
      }
    })

    // Receive WebRTC answer (teacher receives from student)
    socket.on('answer', async (data) => {
      console.log('[WebRTC] Received answer from:', data.from)
      const pc = peers[data.from]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        } catch (error) {
          console.error('[WebRTC] Error handling answer:', error)
        }
      }
    })

    // Receive ICE candidate
    socket.on('ice-candidate', async (data) => {
      const pc = peers[data.from]
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (error) {
          console.error('[WebRTC] Error adding ICE candidate:', error)
        }
      }
    })

    // Participant updates
    socket.on('participants-updated', (participants) => {
      callbacks.onParticipantsUpdated?.(participants)
    })

    // Student left
    socket.on('student-left', (data) => {
      console.log('[WebRTC] Student left:', data)
      closePeerConnection(data.socketId)
    })

    // Teacher left
    socket.on('teacher-left', (data) => {
      console.log('[WebRTC] Teacher left:', data)
      closePeerConnection(data.socketId)
      callbacks.onTeacherLeft?.()
    })

    // Chat message received
    socket.on('chat-message', (message) => {
      callbacks.onChatMessage?.(message)
    })

    // Screen share started by someone
    socket.on('screen-share-started', (data) => {
      console.log('[WebRTC] Screen share started by:', data.socketId)
    })

    // Screen share stopped by someone
    socket.on('screen-share-stopped', (data) => {
      console.log('[WebRTC] Screen share stopped by:', data.socketId)
      callbacks.onScreenShareStopped?.(data.socketId)
    })

    // Hand raised by student (teacher receives)
    socket.on('hand-raised', (data) => {
      console.log('[WebRTC] Hand raised by:', data.userName)
      callbacks.onHandRaised?.(data)
    })

    // Force mute by teacher
    socket.on('force-mute', (data) => {
      console.log('[WebRTC] Force muted by:', data.byName)
      callbacks.onForceMuted?.()
    })

    // Force remove by teacher
    socket.on('force-remove', (data) => {
      console.log('[WebRTC] Force removed by:', data.byName)
      callbacks.onForceRemoved?.()
    })
  }

  function createPeerConnection(socketId, initiator = false, userInfo = {}) {
    if (destroyed) return null
    // Close existing connection if any
    if (peers[socketId]) {
      peers[socketId].close()
      delete peers[socketId]
    }

    console.log(`[WebRTC] Creating peer for ${socketId}, initiator: ${initiator}`)

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peers[socketId] = pc

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track from:', socketId, 'kind:', event.track.kind)
      const stream = event.streams[0]
      if (stream) {
        remoteStreams[socketId] = stream
        callbacks.onRemoteStream?.(socketId, stream, userInfo)
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          to: socketId,
          candidate: event.candidate
        })
      }
    }

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${socketId} state:`, pc.connectionState)
      if (pc.connectionState === 'failed') {
        // Attempt reconnection
        closePeerConnection(socketId)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${socketId} ICE:`, pc.iceConnectionState)
    }

    // Initiator (teacher) creates and sends offer
    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('offer', {
            to: socketId,
            offer: pc.localDescription,
            userInfo: { userId, userName }
          })
        })
        .catch(error => console.error('[WebRTC] Error creating offer:', error))
    }

    return pc
  }

  function closePeerConnection(socketId) {
    const pc = peers[socketId]
    if (pc) {
      pc.close()
      delete peers[socketId]
    }
    delete remoteStreams[socketId]
    callbacks.onRemoteStreamRemoved?.(socketId)
  }

  /**
   * Join room - behavior differs by role:
   * - Teacher: joins directly and becomes host
   * - Student: requests to join (enters waiting room), WebRTC starts only after approval
   */
  function joinRoom(rid, r, uid, uname, stream) {
    roomId = rid
    role = r
    userId = uid
    userName = uname
    localStream = stream

    console.log('[WebRTC] joinRoom:', { roomId, role, userId, userName })

    connect()

    if (socket?.connected) {
      emitJoinRoom()
    } else {
      socket.once('connect', () => {
        emitJoinRoom()
      })
    }
  }

  function emitJoinRoom() {
    if (!socket || destroyed) return

    if (role === 'teacher') {
      // Teacher joins directly
      isApproved = true
      socket.emit('join-room', {
        roomId,
        role,
        userId,
        userName
      })
      console.log(`[WebRTC] Teacher joined room ${roomId}`)
    } else {
      // Student requests to join (goes to waiting room)
      isApproved = false
      socket.emit('request-join', {
        roomId,
        userId,
        userName
      })
      console.log(`[WebRTC] Student requested to join room ${roomId}`)
    }
  }

  /**
   * Teacher: Accept a student from waiting room
   */
  function acceptStudent(studentSocketId) {
    if (!socket || !roomId || role !== 'teacher') return
    socket.emit('accept-student', {
      studentSocketId,
      roomId
    })
    console.log(`[WebRTC] Accepted student ${studentSocketId}`)
  }

  /**
   * Teacher: Reject a student from waiting room
   */
  function rejectStudent(studentSocketId) {
    if (!socket || !roomId || role !== 'teacher') return
    socket.emit('reject-student', {
      studentSocketId,
      roomId
    })
    console.log(`[WebRTC] Rejected student ${studentSocketId}`)
  }

  /**
   * Teacher: Mute a student
   */
  function muteUser(targetSocketId) {
    if (!socket || !roomId || role !== 'teacher') return
    socket.emit('mute-user', {
      roomId,
      targetSocketId
    })
    console.log(`[WebRTC] Muted user ${targetSocketId}`)
  }

  /**
   * Teacher: Remove a student from the room
   */
  function removeUser(targetSocketId) {
    if (!socket || !roomId || role !== 'teacher') return
    socket.emit('remove-user', {
      roomId,
      targetSocketId
    })
    console.log(`[WebRTC] Removed user ${targetSocketId}`)
  }

  function updateLocalStream(newStream) {
    localStream = newStream
    Object.values(peers).forEach(pc => {
      const senders = pc.getSenders()
      newStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind)
        if (sender) {
          sender.replaceTrack(track).catch(err =>
            console.error('[WebRTC] Error replacing track:', err)
          )
        }
      })
    })
  }

  function sendChatMessage(message) {
    if (!socket || !roomId) return
    socket.emit('chat-message', {
      roomId,
      message: {
        id: Date.now(),
        sender: userName,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        role: role,
        userId: userId
      }
    })
  }

  function raiseHand(question) {
    if (!socket || !roomId) return
    socket.emit('raise-hand', { roomId, question })
  }

  async function startScreenShare() {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      })

      // Notify others
      if (socket && roomId) {
        socket.emit('screen-share-started', { roomId, socketId: socket.id, userName })
      }

      // Replace video track in all peer connections with screen track
      const screenTrack = screenStream.getVideoTracks()[0]
      Object.values(peers).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(screenTrack).catch(err =>
            console.error('[WebRTC] Error replacing with screen track:', err)
          )
        }
      })

      // When user stops sharing via browser UI
      screenTrack.onended = () => {
        stopScreenShare()
      }

      return screenStream
    } catch (err) {
      console.error('[WebRTC] Screen share error:', err)
      return null
    }
  }

  function stopScreenShare() {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop())
      screenStream = null
    }

    // Restore camera video track in all peer connections
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        Object.values(peers).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(videoTrack).catch(err =>
              console.error('[WebRTC] Error restoring camera track:', err)
            )
          }
        })
      }
    }

    if (socket && roomId) {
      socket.emit('screen-share-stopped', { roomId, socketId: socket.id })
    }

    callbacks.onScreenShareStopped?.(socket?.id)
  }

  function leaveRoom() {
    destroyed = true

    // Close all peer connections
    Object.keys(peers).forEach(socketId => {
      const pc = peers[socketId]
      if (pc) pc.close()
    })
    peers = {}
    remoteStreams = {}

    // Stop screen share
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop())
      screenStream = null
    }

    // Disconnect socket
    if (socket) {
      socket.disconnect()
      socket = null
    }

    localStream = null
    roomId = null
    role = null
  }

  function isConnected() {
    return socket?.connected || false
  }

  function getSocketId() {
    return socket?.id || null
  }

  // Return the public API
  return {
    // Callbacks object - set these before calling joinRoom
    callbacks,
    // Methods
    joinRoom,
    leaveRoom,
    updateLocalStream,
    sendChatMessage,
    raiseHand,
    startScreenShare,
    stopScreenShare,
    isConnected,
    getSocketId,
    // Teacher controls
    acceptStudent,
    rejectStudent,
    muteUser,
    removeUser,
  }
}

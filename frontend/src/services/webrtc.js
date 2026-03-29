/**
 * WebRTC Service for Virtual Classroom
 * Architecture: Star topology - Teacher connects with each student individually
 * Students only connect with the teacher (not with each other)
 * Uses Socket.IO for signaling
 * 
 * WAITING ROOM SYSTEM:
 * - Students must request to join and wait for teacher approval
 * - WebRTC connections only start after approval
 * 
 * DEPLOYMENT NOTE:
 * The signaling server (server.js) runs on a SEPARATE Node.js service from the FastAPI backend.
 * In production, you MUST set VITE_SOCKET_URL to your signaling server URL.
 * Example: VITE_SOCKET_URL=https://aiml-signaling.onrender.com
 */

import { io } from 'socket.io-client'

// Signaling server URL - must point to the Node.js Socket.IO server (NOT the FastAPI backend)
// In production, VITE_SOCKET_URL must be set to the signaling server URL
const getSocketUrl = () => {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }
  
  // In development, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:5000'
  }
  
  // Production fallback - try common signaling server names
  // This should be overridden with VITE_SOCKET_URL in production
  console.warn('[WebRTC] VITE_SOCKET_URL not set! Using fallback URL. Set this env var for production.')
  return 'https://aiml-signaling.onrender.com'
}

const SOCKET_URL = getSocketUrl()

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
  let hiddenVideoTrack = null
  let videoVisibleToPeers = true
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
    onRemoteStream: null,           // (socketId, stream, userInfo) => {}
    onRemoteStreamRemoved: null,    // (socketId) => {}
    onParticipantsUpdated: null,    // (participants) => {}
    onConnectionStateChange: null,  // (state) => {}
    onTeacherLeft: null,            // () => {}
    onWaitingForTeacher: null,      // () => {}
    onChatMessage: null,            // (message) => {}
    onScreenShare: null,            // (socketId, stream, userInfo) => {}
    onScreenShareStopped: null,     // (socketId) => {}
    onScreenShareBlocked: null,     // (message) => {} - Student tried to share screen
    onHandRaised: null,             // ({ socketId, userId, userName, question, time }) => {}
    onForceMuted: null,             // () => {}
    onForceRemoved: null,           // () => {}
    onKicked: null,                 // (data) => {} - Student was kicked via remove-student
    onStudentEngagement: null,      // (data) => {} - Teacher receives engagement updates
    onClassEnded: null,             // ({ attendance, endTime }) => {} - Teacher ends class
    onAttendanceUpdate: null,       // (attendanceMap) => {} - Live join/leave updates to teacher
    onCameraStatus: null,           // ({ socketId, userId, userName, enabled }) => {} - Remote camera toggle
    // Waiting room callbacks
    onWaitingForApproval: null,     // () => {} - Student is in waiting room
    onJoinApproved: null,           // () => {} - Student was approved
    onJoinRejected: null,           // (message) => {} - Student was rejected
    onJoinRequest: null,            // ({ socketId, userId, userName, time }) => {} - Teacher receives join request
  }

  function connect() {
    if (destroyed) return
    if (socket?.connected) return

    console.log('[WebRTC] Connecting to signaling server:', SOCKET_URL)
    const isLocal = SOCKET_URL.includes('localhost')

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: !isLocal,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true
    })

    socket.on('connect', () => {
      console.log('[WebRTC] Socket connected:', socket.id)
      callbacks.onConnectionStateChange?.('connected')
    })

    socket.on('disconnect', (reason) => {
      console.log('[WebRTC] Socket disconnected:', reason)
      callbacks.onConnectionStateChange?.('disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('[WebRTC] Connection error:', error.message)
      console.error('[WebRTC] Make sure signaling server is running at:', SOCKET_URL)
      callbacks.onConnectionStateChange?.('error')
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('[WebRTC] Reconnected after', attemptNumber, 'attempts')
      callbacks.onConnectionStateChange?.('connected')
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebRTC] Reconnection attempt:', attemptNumber)
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
              userName: participant.userName,
              role: participant.role || 'student'
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
        userName: data.userName,
        role: data.role || 'student'
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
      // Merge role into userInfo so VideoGrid knows who is teacher
      const userInfo = { ...(data.userInfo || {}), role: data.userInfo?.role || 'teacher' }
      const pc = createPeerConnection(data.from, false, userInfo)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        })
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
      callbacks.onScreenShare?.(data.socketId, null, data)
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

    // Kicked via remove-student event (spec-defined event name)
    socket.on('kicked', (data) => {
      console.log('[WebRTC] Kicked by teacher:', data.byName)
      callbacks.onKicked?.(data)
      callbacks.onForceRemoved?.() // treat the same as force-remove in UI
    })

    // Screen share blocked (student tried to share)
    socket.on('screen-share-blocked', (data) => {
      console.warn('[WebRTC] Screen share blocked:', data.message)
      callbacks.onScreenShareBlocked?.(data.message)
    })

    // Teacher receives real-time engagement updates from students via socket.io
    socket.on('student-engagement', (data) => {
      console.log('[WebRTC] Engagement update from:', data.studentName, '->', data.status)
      callbacks.onStudentEngagement?.(data)
    })

    // Teacher receives live attendance map whenever a student joins/leaves
    socket.on('attendance-update', (attendanceMap) => {
      callbacks.onAttendanceUpdate?.(attendanceMap)
    })

    // Class ended – teacher receives the final attendance report
    socket.on('class-ended', (data) => {
      console.log('[WebRTC] Class ended, attendance report received')
      callbacks.onClassEnded?.(data)
    })

    // Remote participant toggled their camera
    socket.on('camera-status', (data) => {
      console.log('[WebRTC] Camera status from:', data.userName, '->', data.enabled)
      callbacks.onCameraStatus?.(data)
    })
  }

  function getHiddenVideoTrack() {
    if (hiddenVideoTrack && hiddenVideoTrack.readyState === 'live') {
      return hiddenVideoTrack
    }

    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const stream = canvas.captureStream(1)
    const track = stream.getVideoTracks()[0]
    hiddenVideoTrack = track || null
    return hiddenVideoTrack
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

    // Add local tracks (audio + video)
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log(`[WebRTC] Adding local ${track.kind} track to peer ${socketId}, enabled:`, track.enabled, 'readyState:', track.readyState)
        pc.addTrack(track, localStream)
      })

      // Safety: guarantee teacher audio is always sent to every participant.
      // Some browsers can create sender/transceiver states where audio track
      // is not bound as expected; this ensures one audio sender exists.
      const audioTrack = localStream.getAudioTracks()[0]
      const hasAudioSender = pc.getSenders().some(s => s.track?.kind === 'audio')
      if (audioTrack && !hasAudioSender) {
        try {
          pc.addTrack(audioTrack, localStream)
          console.log(`[WebRTC] Added fallback audio track sender for peer ${socketId}`)
        } catch (error) {
          console.warn(`[WebRTC] Failed to add fallback audio track for peer ${socketId}:`, error)
        }
      }
    } else {
      console.warn(`[WebRTC] No local stream when creating peer ${socketId}!`)
    }

    // If teacher is already sharing screen, ensure new peers receive the
    // screen video (main stage) instead of camera video immediately.
    if (screenStream && role === 'teacher') {
      const screenTrack = screenStream.getVideoTracks()[0]
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (screenTrack && videoSender) {
        videoSender.replaceTrack(screenTrack).catch(err =>
          console.error('[WebRTC] Error applying current screen share to new peer:', err)
        )
      }
    }

    // Keep camera active locally while hiding outbound video when requested.
    if (!videoVisibleToPeers) {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video')
      const fallbackTrack = getHiddenVideoTrack()
      if (videoSender && fallbackTrack) {
        videoSender.replaceTrack(fallbackTrack).catch(err =>
          console.error('[WebRTC] Error applying hidden video track to new peer:', err)
        )
      }
    }

    // Ensure bidirectional audio/video transceivers exist.
    // addTrack already creates transceivers, so only add if genuinely missing.
    const existingKinds = pc.getTransceivers().map(t => t.sender?.track?.kind || t.receiver?.track?.kind)
    if (!existingKinds.includes('audio')) {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' })
        console.log(`[WebRTC] Added audio transceiver for peer ${socketId}`)
      } catch (e) { /* already exists */ }
    }
    if (!existingKinds.includes('video')) {
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' })
        console.log(`[WebRTC] Added video transceiver for peer ${socketId}`)
      } catch (e) { /* already exists */ }
    }

    // Log all transceivers for debugging
    console.log(`[WebRTC] Transceivers for peer ${socketId}:`, pc.getTransceivers().map(t => ({
      mid: t.mid,
      direction: t.direction,
      currentDirection: t.currentDirection,
      senderKind: t.sender?.track?.kind,
      senderEnabled: t.sender?.track?.enabled,
      receiverKind: t.receiver?.track?.kind,
    })))

    // Handle incoming remote tracks — merge audio+video into single stream per peer
    pc.ontrack = (event) => {
      console.log(`[WebRTC] ▶ Remote track from: ${socketId}, kind: ${event.track.kind}, enabled: ${event.track.enabled}, muted: ${event.track.muted}, readyState: ${event.track.readyState}`)
      
      // Get or create the stream for this peer
      let peerStream = remoteStreams[socketId]
      if (!peerStream) {
        peerStream = event.streams[0] || new MediaStream()
        remoteStreams[socketId] = peerStream
      }
      
      // Add track if not already present
      const existing = peerStream.getTracks().find(t => t.id === event.track.id)
      if (!existing) {
        peerStream.addTrack(event.track)
        console.log(`[WebRTC] Added ${event.track.kind} track to peer stream for ${socketId}. Stream now has: audio=${peerStream.getAudioTracks().length} video=${peerStream.getVideoTracks().length}`)
      }

      // Listen for track unmute (important — tracks can start muted until media flows)
      event.track.onunmute = () => {
        console.log(`[WebRTC] Track unmuted: ${event.track.kind} from ${socketId}`)
        // Re-notify UI so it can update
        callbacks.onRemoteStream?.(socketId, peerStream, userInfo)
      }
      
      // Always notify UI so it can re-render with updated tracks
      callbacks.onRemoteStream?.(socketId, peerStream, userInfo)
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
      // Ensure audio and video are properly negotiated
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('offer', {
            to: socketId,
            offer: pc.localDescription,
            userInfo: { userId, userName, role }
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

    console.log('[WebRTC] joinRoom:', { roomId, role, userId, userName, hasStream: !!stream })

    connect()

    // Wait for socket connection before emitting
    const tryEmit = () => {
      if (socket?.connected) {
        console.log('[WebRTC] Socket is connected, emitting join...')
        emitJoinRoom()
      } else {
        console.log('[WebRTC] Socket not connected yet, waiting...')
        socket?.once('connect', () => {
          console.log('[WebRTC] Socket connected, now emitting join...')
          emitJoinRoom()
        })
      }
    }

    // Small delay to ensure socket handlers are set up
    setTimeout(tryEmit, 100)
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

  /**
   * Teacher: End the class. Server finalises attendance and sends 'class-ended' back.
   */
  function endClass() {
    if (!socket || !roomId || role !== 'teacher') return
    socket.emit('end-class')
    console.log('[WebRTC] End-class emitted')
  }

  /**
   * Enable or disable the video track sent to all peers WITHOUT stopping the
   * local track (needed for attendance face-tracking that runs in the background).
   * Uses replaceTrack: sends a silent/black track when disabled, real track when enabled.
   */
  async function setVideoEnabled(enabled) {
    if (!localStream) return
    const videoTrack = localStream.getVideoTracks()[0]
    if (!videoTrack) return

    videoVisibleToPeers = enabled

    if (enabled) {
      // Re-enable the real video track for all senders.
      // Keep the physical camera track live for attendance detection.
      videoTrack.enabled = true
      for (const pc of Object.values(peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender && sender.track !== videoTrack) {
          try { await sender.replaceTrack(videoTrack) } catch (e) {
            console.error('[WebRTC] setVideoEnabled(true) replaceTrack error:', e)
          }
        }
      }
    } else {
      // Hide outgoing video without turning off the camera track used by face detection.
      videoTrack.enabled = true
      const fallbackTrack = getHiddenVideoTrack()
      for (const pc of Object.values(peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender && fallbackTrack && sender.track !== fallbackTrack) {
          try { await sender.replaceTrack(fallbackTrack) } catch (e) {
            console.error('[WebRTC] setVideoEnabled(false) replaceTrack error:', e)
          }
        }
      }
    }
  }

  /**
   * Enable/disable local microphone and ensure audio sender binding exists for
   * all peers so both teacher and students remain audible.
   */
  async function setAudioEnabled(enabled) {
    if (!localStream) return
    const audioTrack = localStream.getAudioTracks()[0]
    if (!audioTrack) return

    audioTrack.enabled = enabled

    for (const pc of Object.values(peers)) {
      const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio')

      if (audioSender) {
        if (audioSender.track !== audioTrack) {
          try {
            await audioSender.replaceTrack(audioTrack)
          } catch (e) {
            console.error('[WebRTC] setAudioEnabled replaceTrack error:', e)
          }
        }
      } else {
        try {
          pc.addTrack(audioTrack, localStream)
          console.log('[WebRTC] Added missing audio sender while toggling mic')
        } catch (e) {
          console.error('[WebRTC] setAudioEnabled addTrack error:', e)
        }
      }
    }
  }

  /**
   * Student sends engagement status to server via socket.io.
   * Server forwards it to the room's teacher as 'student-engagement'.
   * @param {string} studentId
   * @param {'attentive'|'not-detected'|'distracted'} status
   * @param {string} studentName
   * @param {boolean} cameraOn
   * @param {boolean} isPresent
   * @param {number} timestamp
   */
  function sendEngagementUpdate(studentId, status, studentName, cameraOn, isPresent = status !== 'not-detected', timestamp = Date.now()) {
    if (!socket || !roomId) return
    socket.emit('engagement-update', { studentId, status, studentName, cameraOn, isPresent, timestamp })
  }

  /**
   * Teacher: Remove a student using the spec-defined 'remove-student' event.
   * The server will emit 'kicked' to the student.
   */
  function kickStudent(targetSocketId) {
    if (!socket || !roomId || role !== 'teacher') return
    socket.emit('remove-student', { studentId: targetSocketId })
    console.log(`[WebRTC] Kicked student ${targetSocketId}`)
  }

  /**
   * Broadcast camera on/off status to all peers in the room.
   * When a student disables camera visibility, the video track is disabled
   * but the physical camera stays on for face detection / engagement tracking.
   */
  function broadcastCameraStatus(enabled) {
    if (!socket || !roomId) return
    socket.emit('camera-status', { roomId, enabled })
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

    if (hiddenVideoTrack) {
      hiddenVideoTrack.stop()
      hiddenVideoTrack = null
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
    setVideoEnabled,
    setAudioEnabled,
    sendEngagementUpdate,
    isConnected,
    getSocketId,
    // Teacher controls
    acceptStudent,
    rejectStudent,
    muteUser,
    removeUser,
    kickStudent,
    endClass,
    broadcastCameraStatus,
  }
}

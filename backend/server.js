const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// In production, use specific origins. In development, allow all for easier testing.
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      "https://vcroom.netlify.app",
      "https://aiml-frontend.onrender.com",
      process.env.FRONTEND_URL
    ].filter(Boolean)
  : true; // Allow all origins in development

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Health check endpoints (Render requires an HTTP response to verify service health)
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "signaling-server",
    rooms: Object.keys(rooms).length,
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    rooms: Object.keys(rooms).length,
    activeConnections: io.engine.clientsCount || 0
  });
});

// Room structure: { classroomId: { host: socketId, participants: [socketId1, ...], waitingStudents: [], classStartedAt: ISO } }
// Note: "host" is the teacher, "participants" includes approved students
const rooms = {};

// Attendance data: { roomId: { socketId: { socketId, userId, name, joinTime, leaveTime, totalDuration, engagementStatus, cameraOn, engagementSeconds, lastSampleAt } } }
const attendanceData = {};

const ENGAGEMENT_INTERVAL_SECONDS = 5;
const ATTENDANCE_THRESHOLD_PERCENT = 70;

// Helper – ensure room attendance map exists
function ensureAttendance(roomId) {
  if (!attendanceData[roomId]) attendanceData[roomId] = {};
}

// Helper – format ISO timestamp to HH:MM
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Build a finalised attendance report array for a room.
function buildAttendanceReport(roomId) {
  const now = new Date();
  const room = rooms[roomId] || {};
  const classStart = room.classStartedAt ? new Date(room.classStartedAt) : null;
  const classDurationSeconds = classStart
    ? Math.max(ENGAGEMENT_INTERVAL_SECONDS, Math.round((now - classStart) / 1000))
    : ENGAGEMENT_INTERVAL_SECONDS;

  const map = attendanceData[roomId] || {};
  const attendance = Object.values(map).map(entry => {
    const leaveTime = entry.leaveTime ? new Date(entry.leaveTime) : now;
    const joinTime  = new Date(entry.joinTime);
    const durationMin = Math.max(0, Math.round((leaveTime - joinTime) / 60000));
    const engagementSeconds = Math.max(0, Math.round(entry.engagementSeconds || 0));
    const engagementPercentage = classDurationSeconds > 0
      ? Math.min(100, Math.round((engagementSeconds / classDurationSeconds) * 10000) / 100)
      : 0;
    const attendanceStatus = engagementPercentage >= ATTENDANCE_THRESHOLD_PERCENT ? 'Present' : 'Absent';

    return {
      ...entry,
      leaveTime:     entry.leaveTime || now.toISOString(),
      totalDuration: durationMin,
      engagementSeconds,
      engagementMinutes: Math.round((engagementSeconds / 60) * 100) / 100,
      engagementLabel: `${Math.round((engagementSeconds / 60) * 10) / 10} min`,
      classDurationSeconds,
      classDurationMinutes: Math.round((classDurationSeconds / 60) * 100) / 100,
      engagementPercentage,
      attendanceStatus,
      joinTimeLabel:  fmtTime(entry.joinTime),
      leaveTimeLabel: fmtTime(entry.leaveTime || now.toISOString()),
      durationLabel:  `${durationMin} min`,
    };
  });

  const totalStudents = attendance.length;
  const presentCount = attendance.filter(item => item.attendanceStatus === 'Present').length;
  const absentCount = totalStudents - presentCount;

  return {
    attendance,
    summary: {
      totalStudents,
      presentCount,
      absentCount,
      attendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 10000) / 100 : 0,
      classDurationSeconds,
      classDurationMinutes: Math.round((classDurationSeconds / 60) * 100) / 100,
      attendanceThresholdPercent: ATTENDANCE_THRESHOLD_PERCENT,
    }
  };
}

// Helper: Check if a socket is an approved participant (host or in participants list)
function isApprovedParticipant(roomId, socketId) {
  const room = rooms[roomId];
  if (!room) return false;
  return room.host === socketId || (room.participants || []).includes(socketId);
}

function getParticipants(roomId) {
  const room = rooms[roomId];
  if (!room) return { teacher: null, students: [], count: 0, waitingStudents: [] };

  const teacherSocket = room.host ? io.sockets.sockets.get(room.host) : null;
  const studentInfos = (room.participants || []).map(sid => {
    const s = io.sockets.sockets.get(sid);
    return {
      socketId: sid,
      userId: s?.userId,
      userName: s?.userName
    };
  });

  // Get waiting students info
  const waitingInfos = (room.waitingStudents || []).map(sid => {
    const s = io.sockets.sockets.get(sid);
    return {
      socketId: sid,
      userId: s?.userId,
      userName: s?.userName
    };
  });

  return {
    teacher: room.host,
    teacherName: teacherSocket?.userName || null,
    students: studentInfos,
    count: studentInfos.length + (room.host ? 1 : 0),
    waitingStudents: waitingInfos
  };
}

function broadcastParticipants(roomId) {
  const participants = getParticipants(roomId);
  io.to(roomId).emit("participants-updated", participants);
}

// Returns all participants in a room except the given socketId (for mesh topology)
function getAllParticipantsExcept(roomId, excludeSocketId) {
  const room = rooms[roomId];
  if (!room) return [];
  const all = [];
  if (room.host && room.host !== excludeSocketId) {
    const ts = io.sockets.sockets.get(room.host);
    all.push({
      socketId: room.host,
      userId: ts?.userId,
      userName: ts?.userName,
      role: "teacher"
    });
  }
  (room.participants || []).forEach(sid => {
    if (sid !== excludeSocketId) {
      const s = io.sockets.sockets.get(sid);
      all.push({
        socketId: sid,
        userId: s?.userId,
        userName: s?.userName,
        role: "student"
      });
    }
  });
  return all;
}

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  // ── Request Join (Student requests to join, goes to waiting room) ──
  socket.on("request-join", data => {
    const { roomId, userId, userName } = data;
    console.log(`[request-join] Student "${userName}" (${socket.id}) requesting to join room ${roomId}`);

    socket.roomId = roomId;
    socket.role = "student";
    socket.userId = userId;
    socket.userName = userName;
    socket.isApproved = false;

    if (!rooms[roomId]) {
      rooms[roomId] = { host: null, participants: [], waitingStudents: [], classStartedAt: null };
    }

    // Add to waiting students if not already there
    if (!rooms[roomId].waitingStudents.includes(socket.id)) {
      rooms[roomId].waitingStudents.push(socket.id);
    }

    // Notify the host (teacher) about the join request
    if (rooms[roomId].host) {
      io.to(rooms[roomId].host).emit("join-request", {
        socketId: socket.id,
        userId,
        userName,
        time: new Date().toISOString()
      });
      socket.emit("waiting-for-approval");
    } else {
      // No teacher yet - inform student they're waiting
      socket.emit("waiting-for-teacher");
    }
  });

  // ── Accept Student (Teacher accepts a student from waiting room) ──
  socket.on("accept-student", data => {
    const { studentSocketId, roomId } = data;
    const room = rooms[roomId];

    // Only host can accept students
    if (!room || room.host !== socket.id) {
      console.log(`[accept-student] Unauthorized: ${socket.id} is not host of room ${roomId}`);
      return;
    }

    const studentSocket = io.sockets.sockets.get(studentSocketId);
    if (!studentSocket) {
      console.log(`[accept-student] Student socket ${studentSocketId} not found`);
      return;
    }

    // Move student from waitingStudents to participants
    room.waitingStudents = room.waitingStudents.filter(id => id !== studentSocketId);
    if (!room.participants.includes(studentSocketId)) {
      room.participants.push(studentSocketId);
    }

    // Mark student as approved
    studentSocket.isApproved = true;

    // ── Record join time for attendance tracking ──
    ensureAttendance(roomId);
    attendanceData[roomId][studentSocketId] = {
      socketId:        studentSocketId,
      userId:          studentSocket.userId || studentSocketId,
      name:            studentSocket.userName || 'Student',
      joinTime:        new Date().toISOString(),
      leaveTime:       null,
      totalDuration:   null,
      engagementStatus:'Not Present',
      cameraOn:        true,
      engagementSeconds: 0,
      lastSampleAt: null,
    };
    // Notify teacher's dashboard with updated attendance map
    if (rooms[roomId].host) {
      io.to(rooms[roomId].host).emit('attendance-update', attendanceData[roomId]);
    }

    // Join the student to the Socket.IO room for signaling
    studentSocket.join(roomId);

    // Send approval to student - they can now start WebRTC
    io.to(studentSocketId).emit("join-approved", {
      roomId,
      message: "You have been admitted to the meeting"
    });

    // Send existing participants to the new student
    const existingParticipants = getAllParticipantsExcept(roomId, studentSocketId);
    // Note: Send as 'existing-students' because frontend listens for that event name
    io.to(studentSocketId).emit("existing-students", existingParticipants);

    // Notify all existing members about the new student
    // Use 'student-joined' event which the frontend listens for
    studentSocket.to(roomId).emit("student-joined", {
      socketId: studentSocketId,
      userId: studentSocket.userId,
      userName: studentSocket.userName,
      role: "student"
    });

    broadcastParticipants(roomId);
    console.log(`[accept-student] Teacher "${socket.userName}" accepted student "${studentSocket.userName}" in room ${roomId}`);
  });

  // ── Reject Student (Teacher rejects a student from waiting room) ──
  socket.on("reject-student", data => {
    const { studentSocketId, roomId } = data;
    const room = rooms[roomId];

    // Only host can reject students
    if (!room || room.host !== socket.id) {
      console.log(`[reject-student] Unauthorized: ${socket.id} is not host of room ${roomId}`);
      return;
    }

    const studentSocket = io.sockets.sockets.get(studentSocketId);

    // Remove from waiting list
    room.waitingStudents = room.waitingStudents.filter(id => id !== studentSocketId);

    // Notify the student they were rejected
    if (studentSocket) {
      io.to(studentSocketId).emit("join-rejected", {
        message: "Your request to join was denied by the host"
      });
      studentSocket.roomId = null;
      studentSocket.isApproved = false;
    }

    console.log(`[reject-student] Teacher "${socket.userName}" rejected student socket ${studentSocketId} from room ${roomId}`);
  });

  // ── Join Room (Teacher joins directly, Student joins only after approval) ──
  socket.on("join-room", data => {
    const { roomId, role, userId, userName } = data;
    console.log(`[join-room] ${role} "${userName}" (${socket.id}) -> room ${roomId}`);

    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = role;
    socket.userId = userId;
    socket.userName = userName;

    if (!rooms[roomId]) {
      rooms[roomId] = { host: null, participants: [], waitingStudents: [], classStartedAt: null };
    }

    if (role === "teacher") {
      rooms[roomId].host = socket.id;
      rooms[roomId].classStartedAt = rooms[roomId].classStartedAt || new Date().toISOString();
      socket.isApproved = true;

      // When teacher joins, notify all waiting students that teacher is here
      // and send pending join requests to the teacher
      const waitingStudents = rooms[roomId].waitingStudents || [];
      waitingStudents.forEach(studentSocketId => {
        const studentSocket = io.sockets.sockets.get(studentSocketId);
        if (studentSocket) {
          // Notify teacher about each waiting student
          socket.emit("join-request", {
            socketId: studentSocketId,
            userId: studentSocket.userId,
            userName: studentSocket.userName,
            time: new Date().toISOString()
          });
        }
      });
    } else if (role === "student") {
      // Students should use request-join first, but if they call join-room directly
      // and are already approved, allow them
      if (socket.isApproved) {
        if (!rooms[roomId].participants.includes(socket.id)) {
          rooms[roomId].participants.push(socket.id);
        }
      } else {
        // Not approved - redirect to waiting room
        socket.emit("waiting-for-approval");
        if (!rooms[roomId].waitingStudents.includes(socket.id)) {
          rooms[roomId].waitingStudents.push(socket.id);
        }
        // Notify teacher
        if (rooms[roomId].host) {
          io.to(rooms[roomId].host).emit("join-request", {
            socketId: socket.id,
            userId,
            userName,
            time: new Date().toISOString()
          });
        }
        return; // Don't proceed with normal join flow
      }
    }

    // Send all existing participants to the new joiner
    const existingParticipants = getAllParticipantsExcept(roomId, socket.id);
    // Note: Send as 'existing-students' because frontend listens for that event name
    socket.emit("existing-students", existingParticipants);

    // Notify all existing members — they will initiate WebRTC peer connections
    // Use 'student-joined' for students, frontend listens for this
    socket.to(roomId).emit("student-joined", {
      socketId: socket.id,
      userId,
      userName,
      role
    });

    broadcastParticipants(roomId);
  });

  // ── WebRTC Signaling (with approval validation) ──
  socket.on("offer", data => {
    // Block signaling if sender is not an approved participant
    if (!isApprovedParticipant(socket.roomId, socket.id)) {
      console.log(`[offer] Blocked: ${socket.id} is not approved in room ${socket.roomId}`);
      return;
    }
    io.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer,
      userInfo: data.userInfo || { userId: socket.userId, userName: socket.userName, role: socket.role }
    });
  });

  socket.on("answer", data => {
    // Block signaling if sender is not an approved participant
    if (!isApprovedParticipant(socket.roomId, socket.id)) {
      console.log(`[answer] Blocked: ${socket.id} is not approved in room ${socket.roomId}`);
      return;
    }
    io.to(data.to).emit("answer", {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on("ice-candidate", data => {
    // Block signaling if sender is not an approved participant
    if (!isApprovedParticipant(socket.roomId, socket.id)) {
      console.log(`[ice-candidate] Blocked: ${socket.id} is not approved in room ${socket.roomId}`);
      return;
    }
    io.to(data.to).emit("ice-candidate", {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // ── Camera Status Toggle ──
  // Students can disable their video visibility to others while keeping the
  // physical camera on for engagement tracking / face detection.
  socket.on("camera-status", data => {
    const { roomId, enabled } = data;
    if (!roomId) return;
    // Only approved participants may broadcast camera status
    if (!isApprovedParticipant(roomId, socket.id)) return;
    socket.to(roomId).emit("camera-status", {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      role: socket.role || 'student',
      enabled
    });
    console.log(`[camera-status] ${socket.userName}: camera ${enabled ? 'ON' : 'OFF'} in room ${roomId}`);
  });

  // ── Chat Messages ──
  socket.on("chat-message", data => {
    const { roomId, message } = data;
    if (!roomId) return;
    io.to(roomId).emit("chat-message", message);
  });

  // ── Screen Sharing ──
  // Only the teacher is allowed to share screen; server enforces this.
  socket.on("screen-share-started", data => {
    const { roomId } = data;
    if (!roomId) return;
    const room = rooms[roomId];
    // Reject screen-share signals from non-teachers
    if (!room || room.host !== socket.id) {
      io.to(socket.id).emit("screen-share-blocked", {
        message: "Only teacher can share the screen"
      });
      return;
    }
    socket.to(roomId).emit("screen-share-started", {
      socketId: socket.id,
      userName: socket.userName
    });
  });

  socket.on("screen-share-stopped", data => {
    const { roomId } = data;
    if (!roomId) return;
    socket.to(roomId).emit("screen-share-stopped", {
      socketId: socket.id
    });
  });

  // ── Student Engagement Update (socket.io path) ──
  // Students send engagement status periodically; server persists it and
  // broadcasts the update to all room members (teacher processes it for the dashboard).
  socket.on("engagement-update", data => {
    const { studentId, status, studentName, cameraOn, isPresent, timestamp } = data;
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;
    // Only approved students may send engagement updates
    if (!room.participants.includes(socket.id)) return;

    const sampleTime = timestamp ? new Date(timestamp) : new Date();
    const detected = typeof isPresent === 'boolean' ? isPresent : status !== 'not-detected';

    // ── Persist engagement status in attendance map ──
    ensureAttendance(roomId);
    const engLabel = detected
      ? (status === 'distracted' ? 'Distracted' : 'Attentive')
      : 'Not Present';

    // Create attendance entry on the fly if the student was added outside accept-student
    if (!attendanceData[roomId][socket.id]) {
      attendanceData[roomId][socket.id] = {
        socketId:        socket.id,
        userId:          socket.userId || studentId || socket.id,
        name:            socket.userName || studentName || 'Student',
        joinTime:        new Date().toISOString(),
        leaveTime:       null,
        totalDuration:   null,
        engagementStatus: engLabel,
        cameraOn:        cameraOn !== false,
        engagementSeconds: 0,
        lastSampleAt: sampleTime.toISOString(),
      };
    } else {
      const existing = attendanceData[roomId][socket.id];
      const previousSample = existing.lastSampleAt ? new Date(existing.lastSampleAt) : null;
      let incrementSeconds = ENGAGEMENT_INTERVAL_SECONDS;

      if (previousSample) {
        const diff = Math.round((sampleTime - previousSample) / 1000);
        if (Number.isFinite(diff) && diff > 0) {
          incrementSeconds = Math.min(Math.max(diff, 1), ENGAGEMENT_INTERVAL_SECONDS * 2);
        }
      }

      if (detected) {
        existing.engagementSeconds = Math.max(0, (existing.engagementSeconds || 0) + incrementSeconds);
      }

      existing.lastSampleAt = sampleTime.toISOString();
      existing.engagementStatus = engLabel;
      existing.cameraOn = cameraOn !== false;
    }

    // Broadcast to everyone in the room except the sender.
    // Teacher's onStudentEngagement callback updates the dashboard;
    // other students' frontends ignore this event.
    const joinTime = attendanceData[roomId]?.[socket.id]?.joinTime || null;
    socket.to(roomId).emit("student-engagement", {
      socketId:    socket.id,
      studentId:   studentId || socket.userId,
      studentName: studentName || socket.userName,
      status,           // "attentive" | "not-detected" | "distracted"
      isPresent:   detected,
      cameraOn:    cameraOn !== false,
      joinTime,
      joinTimeLabel: fmtTime(joinTime),
      engagementSeconds: attendanceData[roomId]?.[socket.id]?.engagementSeconds || 0,
      timestamp:   sampleTime.toISOString()
    });
    console.log(`[engagement-update] ${socket.userName}: ${status} in room ${roomId}`);
  });

  // ── End Class (Teacher only) ──
  // Finalises attendance for everyone, sends report to teacher, notifies all students.
  socket.on("end-class", () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;

    const { attendance, summary } = buildAttendanceReport(roomId);
    const endTime = new Date().toISOString();

    // Send full attendance report to teacher
    socket.emit("class-ended", { attendance, summary, endTime });

    // Notify students that the class has ended
    socket.to(roomId).emit("teacher-left", {
      socketId: socket.id,
      userId:   socket.userId,
      userName: socket.userName,
      role:     'teacher',
      reason:   'class-ended'
    });

    // Clean up room
    rooms[roomId].host = null;
    rooms[roomId].participants = [];
    rooms[roomId].waitingStudents = [];
    rooms[roomId].classStartedAt = null;

    console.log(`[end-class] Teacher "${socket.userName}" ended class in room ${roomId}. ${attendance.length} students in report.`);
  });

  // ── Remove Student (alias: remove-student / remove-user) ──
  // Both event names are accepted; the teacher removes a student by their socket id.
  socket.on("remove-student", data => {
    // Normalize: support both { studentId } and plain studentId string
    const targetSocketId = typeof data === "string" ? data : (data?.studentId || data?.targetSocketId);
    const roomId = socket.roomId;
    if (!roomId || !targetSocketId) return;
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);

    // Emit "kicked" to the removed student (as per spec)
    io.to(targetSocketId).emit("kicked", {
      by: socket.id,
      byName: socket.userName,
      message: "You have been removed from the classroom by the teacher"
    });

    // Remove from participants / waiting list
    room.participants = room.participants.filter(id => id !== targetSocketId);
    room.waitingStudents = room.waitingStudents.filter(id => id !== targetSocketId);

    // Notify everyone else
    socket.to(roomId).emit("student-left", {
      socketId: targetSocketId,
      userId: targetSocket?.userId,
      userName: targetSocket?.userName,
      role: "student"
    });

    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.roomId = null;
      targetSocket.isApproved = false;
    }

    broadcastParticipants(roomId);
    console.log(`[remove-student] Teacher "${socket.userName}" kicked ${targetSocketId} from room ${roomId}`);
  });

  // ── Raise Hand / Doubts ──
  socket.on("raise-hand", data => {
    const { roomId, question } = data;
    if (!roomId) return;
    const room = rooms[roomId];
    if (room && room.host) {
      io.to(room.host).emit("hand-raised", {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName,
        question: question,
        time: new Date().toISOString()
      });
    }
  });

  // ── Teacher Control: Mute a student ──
  socket.on("mute-user", data => {
    const { roomId, targetSocketId } = data;
    if (!roomId || !targetSocketId) return;
    const room = rooms[roomId];
    // Only host can mute
    if (!room || room.host !== socket.id) return;
    io.to(targetSocketId).emit("force-mute", {
      by: socket.id,
      byName: socket.userName
    });
    console.log(`[mute-user] Teacher "${socket.userName}" muted ${targetSocketId} in room ${roomId}`);
  });

  // ── Teacher Control: Remove a student ──
  socket.on("remove-user", data => {
    const { roomId, targetSocketId } = data;
    if (!roomId || !targetSocketId) return;
    const room = rooms[roomId];
    // Only host can remove
    if (!room || room.host !== socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);

    // Notify the target student they've been removed
    io.to(targetSocketId).emit("force-remove", {
      by: socket.id,
      byName: socket.userName
    });

    // Remove from participants and waiting list
    room.participants = room.participants.filter(id => id !== targetSocketId);
    room.waitingStudents = room.waitingStudents.filter(id => id !== targetSocketId);

    // Notify everyone else in the room
    // Use 'student-left' event which frontend listens for
    socket.to(roomId).emit("student-left", {
      socketId: targetSocketId,
      userId: targetSocket?.userId,
      userName: targetSocket?.userName,
      role: "student"
    });

    // Detach target from room (but don't disconnect their socket entirely)
    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.roomId = null;
      targetSocket.isApproved = false;
    }

    broadcastParticipants(roomId);
    console.log(`[remove-user] Teacher "${socket.userName}" removed ${targetSocketId} from room ${roomId}`);
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const roomId = socket.roomId;

    if (roomId && rooms[roomId]) {
      const isHost = rooms[roomId].host === socket.id;

      if (isHost) {
        rooms[roomId].host = null;
        console.log(`Teacher "${socket.userName}" (${socket.id}) left room ${roomId}`);

        // Notify all waiting students that teacher left
        (rooms[roomId].waitingStudents || []).forEach(sid => {
          io.to(sid).emit("waiting-for-teacher");
        });
      } else {
        // Remove from participants or waiting list
        rooms[roomId].participants = rooms[roomId].participants.filter(id => id !== socket.id);
        rooms[roomId].waitingStudents = (rooms[roomId].waitingStudents || []).filter(id => id !== socket.id);

        // ── Record leave time for attendance tracking ──
        if (attendanceData[roomId]?.[socket.id]) {
          const leaveTime = new Date();
          const joinTime  = new Date(attendanceData[roomId][socket.id].joinTime);
          attendanceData[roomId][socket.id].leaveTime     = leaveTime.toISOString();
          attendanceData[roomId][socket.id].totalDuration = Math.max(0, Math.round((leaveTime - joinTime) / 60000));
          // Notify teacher
          if (rooms[roomId].host) {
            io.to(rooms[roomId].host).emit('attendance-update', attendanceData[roomId]);
          }
        }
        console.log(`Student "${socket.userName}" (${socket.id}) left room ${roomId}`);
      }

      // Broadcast user-left to all remaining participants
      // Use the appropriate event name that frontend expects
      if (isHost) {
        socket.to(roomId).emit("teacher-left", {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName,
          role: "teacher"
        });
      } else {
        socket.to(roomId).emit("student-left", {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName,
          role: "student"
        });
      }

      broadcastParticipants(roomId);

      // Cleanup empty room
      if (!rooms[roomId].host && rooms[roomId].participants.length === 0 && (rooms[roomId].waitingStudents || []).length === 0) {
        delete rooms[roomId];
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Signaling server running on port", PORT);
});

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

// Room structure: { classroomId: { host: socketId, participants: [socketId1, ...], waitingStudents: [] } }
// Note: "host" is the teacher, "participants" includes approved students
const rooms = {};

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
      rooms[roomId] = { host: null, participants: [], waitingStudents: [] };
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
      rooms[roomId] = { host: null, participants: [], waitingStudents: [] };
    }

    if (role === "teacher") {
      rooms[roomId].host = socket.id;
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

  // ── Chat Messages ──
  socket.on("chat-message", data => {
    const { roomId, message } = data;
    if (!roomId) return;
    io.to(roomId).emit("chat-message", message);
  });

  // ── Screen Sharing ──
  socket.on("screen-share-started", data => {
    const { roomId } = data;
    if (!roomId) return;
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

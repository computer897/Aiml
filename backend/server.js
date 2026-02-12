const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://virtual-classroom-frontend.onrender.com",
  "https://aiml-frontend.onrender.com",
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// Health check endpoints (Render requires an HTTP response to verify service health)
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "signaling-server" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", rooms: Object.keys(rooms).length });
});

// Room structure: { classroomId: { teacher: socketId, students: [socketId1, ...] } }
const rooms = {};

function getParticipants(roomId) {
  const room = rooms[roomId];
  if (!room) return { teacher: null, students: [], count: 0 };

  const teacherSocket = room.teacher ? io.sockets.sockets.get(room.teacher) : null;
  const studentInfos = (room.students || []).map(sid => {
    const s = io.sockets.sockets.get(sid);
    return {
      socketId: sid,
      userId: s?.userId,
      userName: s?.userName
    };
  });

  return {
    teacher: room.teacher,
    teacherName: teacherSocket?.userName || null,
    students: studentInfos,
    count: studentInfos.length + (room.teacher ? 1 : 0)
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
  if (room.teacher && room.teacher !== excludeSocketId) {
    const ts = io.sockets.sockets.get(room.teacher);
    all.push({
      socketId: room.teacher,
      userId: ts?.userId,
      userName: ts?.userName,
      role: "teacher"
    });
  }
  (room.students || []).forEach(sid => {
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

  // ── Join Room (mesh topology: all participants see each other) ──
  socket.on("join-room", data => {
    const { roomId, role, userId, userName } = data;
    console.log(`[join-room] ${role} "${userName}" (${socket.id}) -> room ${roomId}`);

    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = role;
    socket.userId = userId;
    socket.userName = userName;

    if (!rooms[roomId]) {
      rooms[roomId] = { teacher: null, students: [] };
    }

    if (role === "teacher") {
      rooms[roomId].teacher = socket.id;
    } else if (role === "student") {
      if (!rooms[roomId].students.includes(socket.id)) {
        rooms[roomId].students.push(socket.id);
      }
    }

    // Send all existing participants to the new joiner (they will receive offers from these users)
    const existingParticipants = getAllParticipantsExcept(roomId, socket.id);
    socket.emit("existing-participants", existingParticipants);

    // Notify all existing members — they will initiate WebRTC peer connections to the new user
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId,
      userName,
      role
    });

    // If student joined but no teacher yet, inform them
    if (role === "student" && !rooms[roomId].teacher) {
      socket.emit("waiting-for-teacher");
    }

    broadcastParticipants(roomId);
  });

  // ── WebRTC Signaling ──
  socket.on("offer", data => {
    io.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer,
      userInfo: data.userInfo || { userId: socket.userId, userName: socket.userName, role: socket.role }
    });
  });

  socket.on("answer", data => {
    io.to(data.to).emit("answer", {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on("ice-candidate", data => {
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
    if (room && room.teacher) {
      io.to(room.teacher).emit("hand-raised", {
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
    // Only teacher can mute
    if (!room || room.teacher !== socket.id) return;
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
    // Only teacher can remove
    if (!room || room.teacher !== socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);

    // Notify the target student they've been removed
    io.to(targetSocketId).emit("force-remove", {
      by: socket.id,
      byName: socket.userName
    });

    // Remove from room
    room.students = room.students.filter(id => id !== targetSocketId);

    // Notify everyone else in the room
    socket.to(roomId).emit("user-left", {
      socketId: targetSocketId,
      userId: targetSocket?.userId,
      userName: targetSocket?.userName,
      role: "student"
    });

    // Detach target from room (but don't disconnect their socket entirely)
    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.roomId = null;
    }

    broadcastParticipants(roomId);
    console.log(`[remove-user] Teacher "${socket.userName}" removed ${targetSocketId} from room ${roomId}`);
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const roomId = socket.roomId;

    if (roomId && rooms[roomId]) {
      const isTeacher = rooms[roomId].teacher === socket.id;

      if (isTeacher) {
        rooms[roomId].teacher = null;
        console.log(`Teacher "${socket.userName}" (${socket.id}) left room ${roomId}`);
      } else {
        rooms[roomId].students = rooms[roomId].students.filter(id => id !== socket.id);
        console.log(`Student "${socket.userName}" (${socket.id}) left room ${roomId}`);
      }

      // Broadcast user-left to all remaining participants
      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName,
        role: isTeacher ? "teacher" : "student"
      });

      broadcastParticipants(roomId);

      if (!rooms[roomId].teacher && rooms[roomId].students.length === 0) {
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

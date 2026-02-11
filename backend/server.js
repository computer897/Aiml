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

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  // ── Join Room ──
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

      const existingStudents = rooms[roomId].students.map(sid => {
        const studentSocket = io.sockets.sockets.get(sid);
        return {
          socketId: sid,
          userId: studentSocket?.userId,
          userName: studentSocket?.userName
        };
      });
      socket.emit("existing-students", existingStudents);

    } else if (role === "student") {
      if (!rooms[roomId].students.includes(socket.id)) {
        rooms[roomId].students.push(socket.id);
      }

      if (rooms[roomId].teacher) {
        io.to(rooms[roomId].teacher).emit("student-joined", {
          socketId: socket.id,
          userId,
          userName
        });
        socket.emit("teacher-info", {
          teacherSocketId: rooms[roomId].teacher
        });
      } else {
        socket.emit("waiting-for-teacher");
      }
    }

    broadcastParticipants(roomId);
  });

  // ── WebRTC Signaling ──
  socket.on("offer", data => {
    io.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer,
      userInfo: data.userInfo || { userId: socket.userId, userName: socket.userName }
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
    // Broadcast to everyone in the room including sender
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

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const roomId = socket.roomId;

    if (roomId && rooms[roomId]) {
      if (rooms[roomId].teacher === socket.id) {
        rooms[roomId].teacher = null;
        console.log(`Teacher "${socket.userName}" (${socket.id}) left room ${roomId}`);
        socket.to(roomId).emit("teacher-left", { socketId: socket.id });
      } else {
        rooms[roomId].students = rooms[roomId].students.filter(id => id !== socket.id);
        console.log(`Student "${socket.userName}" (${socket.id}) left room ${roomId}`);
        socket.to(roomId).emit("student-left", {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName
        });
      }

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

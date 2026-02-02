const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("join-room", roomId => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    // Send old users to new user
    socket.emit(
      "existing-users",
      rooms[roomId].filter(id => id !== socket.id)
    );

    // Inform others
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", data => {
    io.to(data.to).emit("offer", {
      from: socket.id,
      offer: data.offer
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

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
    }
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});


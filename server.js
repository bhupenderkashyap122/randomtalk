const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;
let onlineUsers = 0;

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("onlineCount", onlineUsers);
  console.log("User connected:", socket.id);

  socket.partner = null;

  // 🟡 PAIRING LOGIC
  if (waitingUser && waitingUser.id !== socket.id) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit("matched");
    waitingUser.emit("matched");

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }

  // 💬 MESSAGE FORWARDING
  socket.on("message", (data) => {
    if (socket.partner) socket.partner.emit("message", data);
  });

  // 🔄 NEXT USER
  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }

    if (waitingUser && waitingUser.id === socket.id) waitingUser = null;

    if (waitingUser) {
      socket.partner = waitingUser;
      waitingUser.partner = socket;

      socket.emit("matched");
      waitingUser.emit("matched");

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("waiting");
    }
  });

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);

    if (waitingUser && waitingUser.id === socket.id) waitingUser = null;

    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
  });

  // 🌐 WEBRTC SIGNALING
  socket.on("offer", data => {
    if (socket.partner) socket.partner.emit("offer", data);
  });

  socket.on("answer", data => {
    if (socket.partner) socket.partner.emit("answer", data);
  });

  socket.on("iceCandidate", data => {
    if (socket.partner) socket.partner.emit("iceCandidate", data);
  });
});

const PORT = 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

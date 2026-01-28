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

  socket.partner = null;

  // 🔗 MATCHING
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

  // 💬 CHAT
  socket.on("message", (data) => {
    if (socket.partner) socket.partner.emit("message", data);
  });

  // 🔁 NEXT USER
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

  // 🌐 WEBRTC SIGNALING
  socket.on("ready", () => {
    if (socket.partner) socket.partner.emit("makeOffer");
  });

  socket.on("offer", (data) => {
    if (socket.partner) socket.partner.emit("offer", data);
  });

  socket.on("answer", (data) => {
    if (socket.partner) socket.partner.emit("answer", data);
  });

  socket.on("iceCandidate", (data) => {
    if (socket.partner) socket.partner.emit("iceCandidate", data);
  });

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);

    if (waitingUser && waitingUser.id === socket.id) waitingUser = null;

    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
  });
});

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {
  socket.partner = null;

  // 🔗 RANDOM MATCH
  if (waitingUser) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit("matched", { initiator: true });
    waitingUser.emit("matched", { initiator: false });

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }

  // 📡 WebRTC signaling
  socket.on("signal", data => {
    if (socket.partner) socket.partner.emit("signal", data);
  });

  // 💬 Text chat
  socket.on("message", msg => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  // ⏭ NEXT
  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }
    if (waitingUser === socket) waitingUser = null;

    waitingUser = socket;
    socket.emit("waiting");
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) socket.partner.emit("partnerDisconnected");
  });
});

http.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);

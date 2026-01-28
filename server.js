const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {
  socket.partner = null;
  socket.gender = null;
  socket.country = null;

  socket.on("join", data => {
    socket.gender = data.gender;
    socket.country = data.country;

    if (
      waitingUser &&
      (waitingUser.gender === socket.gender || socket.gender === "any" || waitingUser.gender === "any") &&
      (waitingUser.country === socket.country || socket.country === "any" || waitingUser.country === "any")
    ) {
      socket.partner = waitingUser;
      waitingUser.partner = socket;

      socket.emit("matched", { initiator: true });
      waitingUser.emit("matched", { initiator: false });

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("waiting");
    }
  });

  // 💬 CHAT
  socket.on("message", msg => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  // ✍️ TYPING
  socket.on("typing", () => {
    if (socket.partner) socket.partner.emit("typing");
  });

  // 📡 WEBRTC SIGNAL
  socket.on("signal", data => {
    if (socket.partner) socket.partner.emit("signal", data);
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

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) socket.partner.emit("partnerDisconnected");
  });
});

http.listen(3000, () =>
  console.log("Server running http://localhost:3000")
);

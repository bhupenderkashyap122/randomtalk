const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {
  socket.partner = null;
  socket.gender = null;

  socket.on("join", gender => {
    socket.gender = gender;

    if (
      waitingUser &&
      (waitingUser.gender === gender || gender === "any" || waitingUser.gender === "any")
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

  // 🔤 TEXT MESSAGE
  socket.on("message", msg => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  // ✍️ TYPING
  socket.on("typing", () => {
    if (socket.partner) socket.partner.emit("typing");
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

  // 📡 WEBRTC SIGNAL
  socket.on("signal", data => {
    if (socket.partner) socket.partner.emit("signal", data);
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) socket.partner.emit("partnerDisconnected");
  });
});

http.listen(3000, () => console.log("http://localhost:3000"));

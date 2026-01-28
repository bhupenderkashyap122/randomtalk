const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {
  socket.partner = null;

  // 🔗 MATCHING
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

  // ⏭ NEXT
  socket.on("next", () => {
    // break current connection
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }

    // remove from waiting if needed
    if (waitingUser === socket) waitingUser = null;

    // re-match
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
  });

  // 📡 SIGNAL
  socket.on("signal", data => {
    if (socket.partner) {
      socket.partner.emit("signal", data);
    }
  });

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;

    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
  });
});

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

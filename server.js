const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUsers = [];
let onlineUsers = 0;

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("onlineCount", onlineUsers);
  console.log("User connected:", socket.id);

  socket.partner = null;

  function tryMatch() {
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift();

      if (!partner || partner.disconnected) {
        tryMatch();
        return;
      }

      socket.partner = partner;
      partner.partner = socket;

      // 🔥 ROLE DECIDED HERE
      socket.emit("matched", { role: "offer" });
      partner.emit("matched", { role: "answer" });

      console.log("Matched:", socket.id, partner.id);
    } else {
      waitingUsers.push(socket);
      socket.emit("waiting");
    }
  }

  tryMatch();

  socket.on("message", data => {
    if (socket.partner) socket.partner.emit("message", data);
  });

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }

    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
    tryMatch();
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);

    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);

    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
  });

  // 🔊 WEBRTC SIGNALS
  socket.on("offer", d => socket.partner && socket.partner.emit("offer", d));
  socket.on("answer", d => socket.partner && socket.partner.emit("answer", d));
  socket.on("iceCandidate", d => socket.partner && socket.partner.emit("iceCandidate", d));
});

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

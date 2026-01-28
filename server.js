const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {
  socket.partner = null;

  function findPartner(user) {
    if (waitingUser && waitingUser !== user) {
      user.partner = waitingUser;
      waitingUser.partner = user;

      user.emit("matched", { initiator: true });
      waitingUser.emit("matched", { initiator: false });

      waitingUser = null;
    } else {
      waitingUser = user;
      user.emit("waiting");
    }
  }

  // first join
  findPartner(socket);

  socket.on("signal", data => {
    if (socket.partner) socket.partner.emit("signal", data);
  });

  socket.on("message", msg => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  // ⏭ NEXT BUTTON
  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }

    if (waitingUser === socket) waitingUser = null;
    findPartner(socket);
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) socket.partner.emit("partnerDisconnected");
  });
});

http.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);

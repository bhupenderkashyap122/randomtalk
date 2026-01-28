const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waiting = null;

io.on("connection", socket => {
  socket.partner = null;

  if (waiting) {
    socket.partner = waiting;
    waiting.partner = socket;

    socket.emit("matched", { initiator: true });
    waiting.emit("matched", { initiator: false });

    waiting = null;
  } else {
    waiting = socket;
    socket.emit("waiting");
  }

  socket.on("signal", data => {
    if (socket.partner) socket.partner.emit("signal", data);
  });

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }

    if (waiting === socket) waiting = null;

    if (waiting) {
      socket.partner = waiting;
      waiting.partner = socket;

      socket.emit("matched", { initiator: true });
      waiting.emit("matched", { initiator: false });

      waiting = null;
    } else {
      waiting = socket;
      socket.emit("waiting");
    }
  });

  socket.on("disconnect", () => {
    if (waiting === socket) waiting = null;
    if (socket.partner) socket.partner.emit("partnerDisconnected");
  });
});

http.listen(3000, () =>
  console.log("Server running http://localhost:3000")
);

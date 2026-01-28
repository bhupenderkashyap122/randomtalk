const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const geoip = require("geoip-lite");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUsers = [];

// Pair users safely
function pairUsers(socket) {
  const partnerIndex = waitingUsers.findIndex(u => u !== socket);

  if (partnerIndex !== -1) {
    const partner = waitingUsers[partnerIndex];
    socket.partner = partner;
    partner.partner = socket;

    socket.emit("matched", { location: partner.location || "Unknown" });
    partner.emit("matched", { location: socket.location || "Unknown" });

    waitingUsers.splice(partnerIndex, 1);
  } else {
    if (!waitingUsers.includes(socket)) waitingUsers.push(socket);
  }
}

io.on("connection", (socket) => {
  const ip =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address;

  const testIP = (ip === "::1" || ip === "127.0.0.1") ? "8.8.8.8" : ip;
  const geo = geoip.lookup(testIP);

  socket.location = geo
    ? `${geo.city || "Unknown city"}, ${geo.country || "Unknown country"}`
    : "Unknown location";

  console.log("User connected:", socket.id, socket.location);

  pairUsers(socket);

  // Text + Image messages
  socket.on("message", (msg) => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  // Next button
  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("message", { type: "text", content: "❌ Stranger disconnected" });
      socket.partner.partner = null;
    }
    socket.partner = null;
    pairUsers(socket);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.partner) {
      socket.partner.emit("message", { type: "text", content: "❌ Stranger disconnected" });
      socket.partner.partner = null;
    }
    waitingUsers = waitingUsers.filter(u => u !== socket);
    console.log("User disconnected:", socket.id);
  });

  // WebRTC signaling
  socket.on("webrtc-offer", (data) => {
    if(socket.partner) socket.partner.emit("webrtc-offer", data);
  });

  socket.on("webrtc-answer", (data) => {
    if(socket.partner) socket.partner.emit("webrtc-answer", data);
  });

  socket.on("webrtc-ice-candidate", (data) => {
    if(socket.partner) socket.partner.emit("webrtc-ice-candidate", data);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");

let localStream;
let pc;
let isInitiator = false;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 🎥 CAMERA
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
.then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
});

// 🔗 CREATE PEER
function createPeer() {
  pc = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("signal", { candidate: e.candidate });
  };
}

// 🔥 MATCHED
socket.on("matched", async data => {
  cleanup();
  isInitiator = data.initiator;
  createPeer();

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { sdp: offer });
  }
});

// 📡 SIGNAL
socket.on("signal", async data => {
  if (!pc) createPeer();

  if (data.sdp) {
    await pc.setRemoteDescription(data.sdp);
    if (data.sdp.type === "offer") {
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      socket.emit("signal", { sdp: ans });
    }
  }
  if (data.candidate) await pc.addIceCandidate(data.candidate);
});

// 💬 TEXT CHAT
function sendMsg() {
  if (!msgInput.value) return;
  messages.innerHTML += `<div><b>You:</b> ${msgInput.value}</div>`;
  socket.emit("message", msgInput.value);
  msgInput.value = "";
}

socket.on("message", msg => {
  messages.innerHTML += `<div><b>Stranger:</b> ${msg}</div>`;
});

// ⏭ NEXT
function nextUser() {
  cleanup();
  socket.emit("next");
}

socket.on("partnerDisconnected", cleanup);

function cleanup() {
  if (pc) pc.close();
  pc = null;
  remoteVideo.srcObject = null;
}

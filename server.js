const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");

let localStream;
let pc = null;
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

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

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
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("signal", { sdp: answer });
    }
  }

  if (data.candidate) {
    await pc.addIceCandidate(data.candidate);
  }
});

// 💬 CHAT
function sendMsg() {
  if (!msgInput.value) return;
  messages.innerHTML += `<div><b>You:</b> ${msgInput.value}</div>`;
  socket.emit("message", msgInput.value);
  msgInput.value = "";
}

socket.on("message", msg => {
  messages.innerHTML += `<div><b>Stranger:</b> ${msg}</div>`;
});

// ⏭ NEXT — FIXED
function nextUser() {
  cleanup();
  socket.emit("next");
}

socket.on("partnerDisconnected", () => {
  cleanup();
});

// 🧹 CLEANUP — VERY IMPORTANT
function cleanup() {
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.close();
    pc = null;
  }
  remoteVideo.srcObject = null;
}

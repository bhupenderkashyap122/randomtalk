const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const messages = document.getElementById("messages");
const typingText = document.getElementById("typing");
const msgInput = document.getElementById("msg");
const nextBtn = document.getElementById("next");

let localStream, pc, isInitiator;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 🎥 CAMERA
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
.then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
});

function start() {
  const gender = document.getElementById("gender").value;
  if (!gender) return alert("Select gender");
  socket.emit("join", gender);
}

// 🔗 PEER
function createPeer() {
  pc = new RTCPeerConnection(config);

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("signal", { candidate: e.candidate });
  };
}

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
  const msg = msgInput.value;
  if (!msg) return;
  messages.innerHTML += `<div><b>You:</b> ${msg}</div>`;
  socket.emit("message", msg);
  msgInput.value = "";
}

socket.on("message", msg => {
  messages.innerHTML += `<div><b>Stranger:</b> ${msg}</div>`;
});

// ✍️ TYPING
msgInput.oninput = () => socket.emit("typing");

socket.on("typing", () => {
  typingText.innerText = "Stranger is typing...";
  setTimeout(() => typingText.innerText = "", 1000);
});

// ⏭ NEXT
nextBtn.onclick = () => {
  cleanup();
  socket.emit("next");
};

socket.on("partnerDisconnected", cleanup);

function cleanup() {
  if (pc) pc.close();
  pc = null;
  remoteVideo.srcObject = null;
}

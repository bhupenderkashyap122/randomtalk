let socket;
let userGender = "";
let localStream = null;
let peerConnection = null;

const localVideo = document.getElementById("localVideo");
const partnerVideo = document.getElementById("partnerVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");
const onlineSpan = document.getElementById("online");
const countrySpan = document.getElementById("country");
const statusText = document.getElementById("status");

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

/* START CHAT */
function startChat() {
  userGender = document.getElementById("gender").value;
  if (!userGender) return alert("Select gender");

  document.getElementById("intro").style.display = "none";
  document.getElementById("chatApp").style.display = "block";

  initSocket();
  initCamera();
  detectCountry();
}

/* SOCKET */
function initSocket() {
  socket = io();

  socket.on("onlineCount", c => onlineSpan.innerText = c);

  socket.on("waiting", () => {
    statusText.innerText = "🔍 Finding stranger...";
    statusText.style.color = "orange";
  });

  socket.on("matched", () => {
    statusText.innerText = "✅ Connected";
    statusText.style.color = "green";
    messages.innerHTML += "<div>🤝 Connected</div>";
    startCall();
  });

  socket.on("partnerDisconnected", () => {
    statusText.innerText = "❌ Stranger left";
    statusText.style.color = "red";
    closeConnection();
  });

  socket.on("message", d => {
    messages.innerHTML += `<div><b>[${d.gender}]</b> ${d.msg}</div>`;
  });

  // WEBRTC
  socket.on("makeOffer", async () => {
    if (!peerConnection) createPeer();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  });

  socket.on("offer", async offer => {
    if (!peerConnection) createPeer();
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", async answer => {
    await peerConnection.setRemoteDescription(answer);
  });

  socket.on("iceCandidate", async c => {
    try { await peerConnection.addIceCandidate(c); } catch {}
  });
}

/* CAMERA */
function initCamera() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localStream = stream;
      localVideo.srcObject = stream;
    });
}

/* PEER */
function createPeer() {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(t =>
    peerConnection.addTrack(t, localStream)
  );

  peerConnection.ontrack = e => {
    partnerVideo.srcObject = e.streams[0];
  };

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit("iceCandidate", e.candidate);
  };
}

function startCall() {
  createPeer();
  socket.emit("ready");
}

/* SEND MESSAGE */
function sendMsg() {
  const msg = msgInput.value.trim();
  if (!msg) return;
  socket.emit("message", { msg, gender: userGender });
  messages.innerHTML += `<div><b>[Me]</b> ${msg}</div>`;
  msgInput.value = "";
}

/* NEXT USER */
function nextUser() {
  messages.innerHTML = "";
  statusText.innerText = "🔍 Finding stranger...";
  statusText.style.color = "orange";

  socket.emit("next");
  closeConnection();
  initCamera();
}

/* CLOSE */
function closeConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  partnerVideo.srcObject = null;
  localVideo.srcObject = null;
}

/* CAMERA TOGGLE */
function toggleCamera(btn) {
  if (!localStream) return;
  const track = localStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
  btn.innerText = track.enabled ? "📷 Camera OFF" : "📷 Camera ON";
}

/* COUNTRY */
function detectCountry() {
  fetch("https://ipapi.co/json/")
    .then(r => r.json())
    .then(d => countrySpan.innerText = d.country_name || "Unknown");
}

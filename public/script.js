let socket;
let userGender = "";
let localStream;
let peerConnection;
let isInitiator = false;

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
  if (!userGender) return alert("Please select gender");

  document.getElementById("intro").style.display = "none";
  document.getElementById("chatApp").style.display = "block";

  initCamera().then(initSocket);
  detectCountry();
}

/* CAMERA */
function initCamera() {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localStream = stream;
      localVideo.srcObject = stream;
    });
}

/* SOCKET */
function initSocket() {
  socket = io();

  socket.on("onlineCount", c => onlineSpan.innerText = c);

  socket.on("waiting", () => {
    statusText.innerText = "🔍 Finding stranger...";
    statusText.style.color = "orange";
  });

  socket.on("matched", data => {
    statusText.innerText = "✅ Connected";
    statusText.style.color = "green";

    isInitiator = data.role === "offer";
    startCall(isInitiator);
  });

  socket.on("partnerDisconnected", () => {
    statusText.innerText = "❌ Stranger left";
    statusText.style.color = "red";
    closeConnection();
  });

  socket.on("message", d => {
    messages.innerHTML += `<div><b>[${d.gender}]</b> ${d.msg}</div>`;
  });

  socket.on("offer", async offer => {
    startCall(false);
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", a => {
    peerConnection && peerConnection.setRemoteDescription(a);
  });

  socket.on("iceCandidate", c => {
    peerConnection && peerConnection.addIceCandidate(c);
  });
}

/* CALL */
function startCall(createOffer) {
  if (peerConnection) return;

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

  if (createOffer) {
    peerConnection.createOffer()
      .then(o => peerConnection.setLocalDescription(o))
      .then(() => socket.emit("offer", peerConnection.localDescription));
  }
}

/* MESSAGE */
function sendMsg() {
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit("message", { msg, gender: userGender });
  messages.innerHTML += `<div><b>[Me]</b> ${msg}</div>`;
  msgInput.value = "";
}

/* NEXT */
function nextUser() {
  closeConnection();
  messages.innerHTML = "";
  socket.emit("next");
}

/* CLOSE */
function closeConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  partnerVideo.srcObject = null;
}

/* COUNTRY */
function detectCountry() {
  fetch("https://ipapi.co/json/")
    .then(r => r.json())
    .then(d => countrySpan.innerText = d.country_name || "Unknown");
}

/* CAMERA TOGGLE */
function toggleCamera(btn) {
  const track = localStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
  btn.innerText = track.enabled ? "📷 Camera OFF" : "📷 Camera ON";
}

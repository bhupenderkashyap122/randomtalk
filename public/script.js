let socket;
let userGender = "";
let localStream;
let peerConnection;

const localVideo = document.getElementById("localVideo");
const partnerVideo = document.getElementById("partnerVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");
const onlineSpan = document.getElementById("online");
const countrySpan = document.getElementById("country");
const statusText = document.getElementById("status");

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

/* START CHAT */
function startChat() {
  const genderSelect = document.getElementById("gender");
  userGender = genderSelect.value;

  if (!userGender) {
    alert("Please select your gender");
    return;
  }

  document.getElementById("intro").style.display = "none";
  document.getElementById("chatApp").style.display = "block";

  initSocket();
  initCamera();
  detectCountry();
}

/* SOCKET INIT */
function initSocket() {
  socket = io();

  socket.on("onlineCount", count => {
    onlineSpan.innerText = count;
  });

  socket.on("waiting", () => {
    statusText.innerText = "🔍 Finding new stranger...";
    statusText.style.color = "#ff9800";
  });

  socket.on("matched", () => {
    statusText.innerText = "✅ Connected with a stranger";
    statusText.style.color = "green";
    messages.innerHTML += "<div>🤝 You are now connected</div>";

    startCall();
  });

  socket.on("partnerDisconnected", () => {
    statusText.innerText = "❌ Stranger disconnected";
    statusText.style.color = "red";
    messages.innerHTML += "<div>❌ Stranger disconnected</div>";

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
      partnerVideo.srcObject = null;
    }
  });

  socket.on("message", data => {
    messages.innerHTML += `<div><b>[${data.gender}]</b> ${data.msg}</div>`;
  });

  /* WebRTC signaling */
  socket.on("offer", async offer => {
    if (!peerConnection) startCall();

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", async answer => {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(answer);
  });

  socket.on("iceCandidate", async candidate => {
    try {
      if (peerConnection) await peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.error(e);
    }
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

/* START PEER CONNECTION */
function startCall() {
  if (peerConnection) return;

  peerConnection = new RTCPeerConnection(config);

  // Add local stream tracks
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Receive partner stream
  peerConnection.ontrack = (event) => {
    partnerVideo.srcObject = event.streams[0];
  };

  // ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) socket.emit("iceCandidate", event.candidate);
  };

  // Only create offer if initiating (local user)
  if (socket.id < (socket.partner?.id || "")) { // simple trick to avoid double offers
    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => socket.emit("offer", peerConnection.localDescription));
  }
}

/* SEND MESSAGE */
function sendMsg() {
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit("message", { msg, gender: userGender });
  messages.innerHTML += `<div><b>[${userGender}] Me:</b> ${msg}</div>`;
  msgInput.value = "";
}

/* NEXT USER */
function nextUser() {
  messages.innerHTML = "";
  statusText.innerText = "🔍 Finding new stranger...";
  statusText.style.color = "#ff9800";
  socket.emit("next");

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    partnerVideo.srcObject = null;
  }
}

/* COUNTRY DETECTION */
function detectCountry() {
  fetch("https://ipapi.co/json/")
    .then(res => res.json())
    .then(data => {
      countrySpan.innerText = data.country_name || "Unknown";
    });
}

/* TOGGLE CAMERA */
function toggleCamera(button) {
  const track = localVideo.srcObject?.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  button.innerText = track.enabled ? "📷 Camera OFF" : "📷 Camera ON";
}

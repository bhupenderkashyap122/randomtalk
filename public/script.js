let socket;
let userGender = "";

const localVideo = document.getElementById("localVideo");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg");
const onlineSpan = document.getElementById("online");
const countrySpan = document.getElementById("country");
const statusText = document.getElementById("status");

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
  });

  socket.on("partnerDisconnected", () => {
    statusText.innerText = "❌ Stranger disconnected";
    statusText.style.color = "red";
    messages.innerHTML += "<div>❌ Stranger disconnected</div>";
  });

  socket.on("message", data => {
    messages.innerHTML += `<div><b>[${data.gender}]</b> ${data.msg}</div>`;
  });
}

/* SEND MESSAGE */
function sendMsg() {
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit("message", {
    msg,
    gender: userGender
  });

  messages.innerHTML += `<div><b>[${userGender}] Me:</b> ${msg}</div>`;
  msgInput.value = "";
}

/* NEXT USER */
function nextUser() {
  messages.innerHTML = "";
  statusText.innerText = "🔍 Finding new stranger...";
  statusText.style.color = "#ff9800";
  socket.emit("next");
}

/* CAMERA */
function initCamera() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localVideo.srcObject = stream;
    });
}

function toggleCamera() {
  const track = localVideo.srcObject?.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  event.target.innerText = track.enabled ? "📷 Camera OFF" : "📷 Camera ON";
}

/* COUNTRY */
function detectCountry() {
  fetch("https://ipapi.co/json/")
    .then(res => res.json())
    .then(data => {
      countrySpan.innerText = data.country_name || "Unknown";
    });
}

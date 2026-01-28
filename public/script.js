const socket = io();

let localStream;
let pc;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

const pcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 🎥 CAMERA START
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  })
  .catch(err => alert("Camera error: " + err));

// 🔗 SOCKET EVENTS
socket.on("waiting", () => {
  statusText.innerText = "Searching...";
});

socket.on("matched", () => {
  statusText.innerText = "Connected";
  startPeer(true);
});

socket.on("partnerDisconnected", () => {
  statusText.innerText = "Partner left";
  closePeer();
});

socket.on("signal", async data => {
  if (!pc) startPeer(false);

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

// 🔧 PEER
function startPeer(createOffer) {
  pc = new RTCPeerConnection(pcConfig);

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", { candidate: e.candidate });
    }
  };

  if (createOffer) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit("signal", { sdp: offer });
    });
  }
}

// ❌ CLOSE
function closePeer() {
  if (pc) {
    pc.close();
    pc = null;
  }
  remoteVideo.srcObject = null;
}

// ⏭ NEXT
function nextUser() {
  closePeer();
  socket.emit("next");
}

// 📷 CAMERA TOGGLE
function toggleCamera(btn) {
  const track = localStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
  btn.innerText = track.enabled ? "Camera OFF" : "Camera ON";
}

const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("next");

let localStream;
let pc;
let isInitiator = false;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 🎥 Get Camera
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  localVideo.srcObject = localStream;
}

startCamera();

// 🔗 Create Peer
function createPeer() {
  pc = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", { candidate: e.candidate });
    }
  };
}

// 🔥 Matched
socket.on("matched", async data => {
  isInitiator = data.initiator;

  createPeer();

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { sdp: offer });
  }
});

// 📡 Signaling
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

// ⏭ NEXT BUTTON
nextBtn.onclick = () => {
  closePeer();
  socket.emit("next");
};

// ❌ Partner Left
socket.on("partnerDisconnected", () => {
  closePeer();
});

// 🧹 CLEANUP (VERY IMPORTANT)
function closePeer() {
  if (pc) {
    pc.close();
    pc = null;
  }
  remoteVideo.srcObject = null;
}

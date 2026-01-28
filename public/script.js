const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("next");

let localStream = null;
let peer = null;
let isInitiator = false;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 🎥 CAMERA
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  localVideo.srcObject = localStream;
}
startCamera();

// 🔗 CREATE PEER
function createPeer() {
  peer = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", { candidate: e.candidate });
    }
  };
}

// 🔥 MATCHED
socket.on("matched", async data => {
  cleanup(); // 🔴 VERY IMPORTANT
  isInitiator = data.initiator;

  createPeer();

  if (isInitiator) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("signal", { sdp: offer });
  }
});

// 📡 SIGNAL
socket.on("signal", async data => {
  if (!peer) createPeer();

  if (data.sdp) {
    await peer.setRemoteDescription(data.sdp);

    if (data.sdp.type === "offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("signal", { sdp: answer });
    }
  }

  if (data.candidate) {
    await peer.addIceCandidate(data.candidate);
  }
});

// ⏭ NEXT BUTTON
nextBtn.onclick = () => {
  cleanup();
  socket.emit("next");
};

// ❌ PARTNER LEFT
socket.on("partnerDisconnected", () => {
  cleanup();
});

// 🧹 CLEANUP (NEXT FIX)
function cleanup() {
  if (peer) {
    peer.ontrack = null;
    peer.onicecandidate = null;
    peer.close();
    peer = null;
  }
  remoteVideo.srcObject = null;
}

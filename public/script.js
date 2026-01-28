const statusText = document.getElementById("status");

function nextUser() {
  // UI update
  statusText.innerText = "🔍 Searching for new user...";
  messages.innerHTML = "";
  remoteVideo.srcObject = null;

  // WebRTC cleanup
  cleanup();

  // Tell server to find new user
  socket.emit("next");
}

// jab naya user mil jaye
socket.on("matched", async data => {
  statusText.innerText = "✅ Connected to stranger";

  cleanup();
  isInitiator = data.initiator;
  createPeer();

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { sdp: offer });
  }
});

// partner disconnect ho jaye
socket.on("partnerDisconnected", () => {
  statusText.innerText = "🔍 Stranger left, searching...";
  cleanup();
  socket.emit("next");
});

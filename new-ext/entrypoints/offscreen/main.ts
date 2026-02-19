// Offscreen document script — handles getUserMedia + MediaRecorder
// Runs in a persistent hidden page (not subject to popup focus-loss dismissal)
// Connects back to background via named Port for reliable bidirectional comms

const BACKEND_URL = "http://localhost:8000";

let mediaRecorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;

// Connect back to background via named Port
const port = chrome.runtime.connect({ name: "offscreen" });

// Handle commands from background via Port (request-response pattern with __id)
port.onMessage.addListener(async (msg: any) => {
  const id = msg.__id;
  const respond = (payload: any) =>
    port.postMessage({ __respFor: id, payload });

  if (msg.type === "START_MIC") {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) await transcribeChunk(event.data);
      };

      mediaRecorder.onerror = (e) =>
        console.error("[offscreen] MediaRecorder error:", e);
      mediaRecorder.start(5000);
      respond({ success: true });
    } catch (err: any) {
      respond({ success: false, error: err.message });
    }
  }

  if (msg.type === "STOP_MIC") {
    if (mediaRecorder && mediaRecorder.state !== "inactive")
      mediaRecorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
    stream = null;
    respond({ success: true });
  }
});

async function transcribeChunk(audioBlob: Blob) {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const response = await fetch(`${BACKEND_URL}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64Audio, format: "webm" }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = (data.text || "").trim();
      if (text) {
        // Send transcript to background → popup via port
        port.postMessage({ type: "TRANSCRIPT_UPDATE", text });
      }
    } else {
      console.error(
        "[offscreen] Transcription error:",
        response.status,
        await response.text(),
      );
    }
  } catch (err) {
    console.error("[offscreen] Fetch error:", err);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

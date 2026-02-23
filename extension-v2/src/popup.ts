// src/popup.ts

const startBtn = document.getElementById("start-rec") as HTMLButtonElement;
const stopBtn = document.getElementById("stop-rec") as HTMLButtonElement;
const summarizeBtn = document.getElementById(
  "summarize-btn",
) as HTMLButtonElement;
const saveVideoBtn = document.getElementById(
  "save-video-btn",
) as HTMLButtonElement;
const transcriptBox = document.getElementById(
  "transcript-box",
) as HTMLDivElement;
const summaryBox = document.getElementById("summary-box") as HTMLDivElement;
const summaryPanel = document.getElementById("summary-panel") as HTMLDivElement;
const statusBadge = document.getElementById("status-badge") as HTMLDivElement;
const copyBtn = document.getElementById("copy-transcript") as HTMLButtonElement;
const micBtn = document.getElementById("enable-mic") as HTMLButtonElement;

const BACKEND_URL = "http://localhost:8000";

// Backend Health Check
async function checkBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`).catch(() => null);
    if (res?.ok) {
      statusBadge.textContent = "✓ Backend Online";
      statusBadge.className = "online";
      return true;
    }
  } catch {}

  statusBadge.textContent = "✗ Backend Offline";
  statusBadge.className = "";
  return false;
}

// UI State
function setRecordingUI(isRecording: boolean) {
  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
  if (isRecording) {
    startBtn.innerHTML = "Recording...";
    startBtn.classList.add("recording-pulse");
  } else {
    startBtn.innerHTML = "⏺ Start Recording";
    startBtn.classList.remove("recording-pulse");
  }
}

function updateTranscriptUI(text: string) {
  if (!text) {
    transcriptBox.textContent = "Not recording...";
    transcriptBox.classList.remove("has-content");
    return;
  }
  transcriptBox.textContent = text;
  transcriptBox.classList.add("has-content");
  transcriptBox.scrollTop = transcriptBox.scrollHeight;

  // Enable summarize if we have text
  summarizeBtn.disabled = text.length < 50;
}

// Event Listeners
startBtn.addEventListener("click", async () => {
  const online = await checkBackend();
  if (!online) {
    alert("Cannot start: Backend server is not running at localhost:8000");
    return;
  }

  // Check mic (legacy logic maintained)
  if ("permissions" in navigator) {
    try {
      // @ts-ignore
      const p = await navigator.permissions.query({ name: "microphone" });
      if (p.state !== "granted") {
        // try prime
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          s.getTracks().forEach((t) => t.stop());
        } catch {
          const setup = confirm(
            "Microphone permission needed to record audio. Open setup page?",
          );
          if (setup) {
            chrome.tabs.create({ url: chrome.runtime.getURL("micsetup.html") });
            return;
          }
        }
      }
    } catch {}
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Clear previous state
  updateTranscriptUI("");
  summaryPanel.style.display = "none";
  saveVideoBtn.style.display = "none";
  await chrome.runtime.sendMessage({ type: "RESET_TRANSCRIPT" });

  try {
    const res = await chrome.runtime.sendMessage({
      type: "START_RECORDING",
      tabId: tab.id,
    });
    if (!res?.ok) throw new Error(res?.error || "Unknown error");
    setRecordingUI(true);
  } catch (e: any) {
    alert(`Failed to start: ${e.message}`);
  }
});

stopBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
  setRecordingUI(false);

  // Auto-summarize
  await triggerSummarize();
});

async function triggerSummarize() {
  const text = transcriptBox.textContent || "";
  if (text.length < 50) return;

  summarizeBtn.disabled = true;
  summarizeBtn.textContent = "⏳ Processing...";

  try {
    const res = await fetch(`${BACKEND_URL}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text }),
    });

    if (res.ok) {
      const data = await res.json();
      summaryPanel.style.display = "flex";
      // Simple Markdown rendering (bold and lists)
      summaryBox.innerHTML = (data.summary || "No summary generated")
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/- /g, "<br>• ");

      // Auto-download
      const blob = new Blob(
        [`Transcript:\n${text}\n\nSummary:\n${data.summary}`],
        { type: "text/markdown" },
      );
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: `meeting-summary-${Date.now()}.md`,
        saveAs: true,
      });
    } else {
      throw new Error("Backend returned error");
    }
  } catch (e) {
    alert("Summarization failed. Is backend running?");
  } finally {
    summarizeBtn.textContent = "✨ Summarize Meeting";
    summarizeBtn.disabled = false;
  }
}

summarizeBtn.addEventListener("click", triggerSummarize);

saveVideoBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DOWNLOAD_RECORDING" });
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(transcriptBox.textContent || "");
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
});

// Init
(async () => {
  checkBackend();

  // Check recording status
  const status = await chrome.runtime.sendMessage({
    type: "GET_RECORDING_STATUS",
  });
  setRecordingUI(!!status?.recording);

  // Get existing transcript
  const trans = await chrome.runtime.sendMessage({
    type: "GET_TRANSCRIPT_TEXT",
  });
  if (trans?.transcript) {
    updateTranscriptUI(trans.transcript);
  }

  // Listen for updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "RECORDING_STATE") {
      setRecordingUI(msg.recording);
    }
    if (msg.type === "TRANSCRIPT_UPDATE") {
      if (msg.fullTranscript) {
        updateTranscriptUI(msg.fullTranscript);
      }
    }
    if (msg.type === "RECORDING_READY") {
      saveVideoBtn.style.display = "block";
      saveVideoBtn.disabled = false;
    }
  });
})();

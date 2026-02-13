import { useState, useEffect, useRef } from "react";
import { browser } from "wxt/browser";
import "./App.css";

const BACKEND_URL = "http://localhost:8000";

interface AppState {
  isRecording: boolean;
  transcript: string;
  summary: string;
  backendStatus: "online" | "offline" | "checking";
  error: string | null;
  isProcessing: boolean;
}

function App() {
  const [state, setState] = useState<AppState>({
    isRecording: false,
    transcript: "",
    summary: "",
    backendStatus: "checking",
    error: null,
    isProcessing: false,
  });

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.transcript]);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();

    // Listen for transcript updates from background
    const handleMessage = (message: any) => {
      if (message.type === "TRANSCRIPT_UPDATE") {
        setState((prev) => ({
          ...prev,
          transcript: prev.transcript + " " + message.text,
        }));
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const checkBackendHealth = async () => {
    setState((prev) => ({ ...prev, backendStatus: "checking" }));
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok" && data.ollama_available) {
          setState((prev) => ({
            ...prev,
            backendStatus: "online",
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            backendStatus: "offline",
            error: "Ollama chưa sẵn sàng. Vui lòng chạy: ollama serve",
          }));
        }
      } else {
        throw new Error("Backend không phản hồi");
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        backendStatus: "offline",
        error: "Backend chưa hoạt động. Vui lòng khởi động server Python.",
      }));
    }
  };

  const startRecording = async () => {
    if (state.backendStatus !== "online") {
      setState((prev) => ({ ...prev, error: "Backend chưa sẵn sàng!" }));
      return;
    }

    try {
      // Get current tab
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId = tabs[0]?.id;

      if (!tabId) {
        throw new Error("Không tìm thấy tab");
      }

      // Send message to background to start recording
      const response = await browser.runtime.sendMessage({
        type: "START_RECORDING",
        tabId: tabId,
      });

      if (response.success) {
        setState((prev) => ({
          ...prev,
          isRecording: true,
          error: null,
          transcript: "",
          summary: "",
        }));
      } else {
        throw new Error(response.error || "Không thể bắt đầu ghi âm");
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: `Không thể bắt đầu ghi âm: ${error.message}`,
      }));
    }
  };

  const stopRecording = async () => {
    try {
      await browser.runtime.sendMessage({ type: "STOP_RECORDING" });
      setState((prev) => ({ ...prev, isRecording: false }));
    } catch (error: any) {
      console.error("Stop recording error:", error);
    }
  };

  const generateSummary = async () => {
    if (!state.transcript.trim()) {
      setState((prev) => ({
        ...prev,
        error: "Chưa có transcript để tóm tắt!",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: state.transcript }),
      });

      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({ ...prev, summary: data.summary }));

        // Auto-export to file
        exportToMarkdown(data.summary);
      } else {
        throw new Error("Summarization failed");
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: `Không thể tạo summary: ${error.message}`,
      }));
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const exportToMarkdown = (summary: string) => {
    const now = new Date();
    const filename = `meeting-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}.md`;

    const content = `# Meeting Notes - ${now.toLocaleString("vi-VN")}

## Transcript

${state.transcript}

---

${summary}
`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(state.transcript);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎙️ Meeting Notes AI</h1>
        <div className={`status-badge status-${state.backendStatus}`}>
          {state.backendStatus === "online" && "✓ Backend Online"}
          {state.backendStatus === "offline" && "✗ Backend Offline"}
          {state.backendStatus === "checking" && "⟳ Checking..."}
        </div>
      </header>

      {state.error && <div className="error-banner">⚠️ {state.error}</div>}

      <div className="controls">
        <button
          className={`btn btn-primary ${state.isRecording ? "recording" : ""}`}
          onClick={state.isRecording ? stopRecording : startRecording}
          disabled={state.backendStatus !== "online"}
        >
          {state.isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
        </button>

        <button
          className="btn btn-secondary"
          onClick={generateSummary}
          disabled={!state.transcript.trim() || state.isProcessing}
        >
          {state.isProcessing ? "⏳ Processing..." : "✨ Summarize"}
        </button>

        <button className="btn btn-ghost" onClick={checkBackendHealth}>
          🔄 Refresh Status
        </button>
      </div>

      <div className="content">
        <section className="transcript-section">
          <div className="section-header">
            <h2>Transcript</h2>
            {state.transcript && (
              <button
                className="btn-icon"
                onClick={copyTranscript}
                title="Copy"
              >
                📋
              </button>
            )}
          </div>
          <div className="transcript-box">
            {state.transcript || (
              <p className="placeholder">
                {state.isRecording
                  ? "Đang ghi âm và transcribe..."
                  : "Nhấn Start Recording để bắt đầu"}
              </p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        {state.summary && (
          <section className="summary-section">
            <h2>Summary</h2>
            <div
              className="summary-box"
              dangerouslySetInnerHTML={{ __html: state.summary }}
            />
          </section>
        )}
      </div>
    </div>
  );
}

export default App;

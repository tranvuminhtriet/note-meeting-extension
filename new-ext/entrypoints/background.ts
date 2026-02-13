import { browser } from "wxt/browser";

export default defineBackground(() => {
  console.log("Meeting Notes AI - Background worker initialized");

  interface RecordingState {
    isRecording: boolean;
    mediaRecorder: MediaRecorder | null;
    stream: MediaStream | null;
    transcript: string;
  }

  const state: RecordingState = {
    isRecording: false,
    mediaRecorder: null,
    stream: null,
    transcript: "",
  };

  const BACKEND_URL = "http://localhost:8000";

  // Listen for messages from popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "START_RECORDING") {
      startRecording(message.tabId).then(sendResponse);
      return true; // Async response
    }

    if (message.type === "STOP_RECORDING") {
      stopRecording();
      sendResponse({ success: true });
      return true;
    }

    if (message.type === "GET_TRANSCRIPT") {
      sendResponse({ transcript: state.transcript });
      return true;
    }

    if (message.type === "CLEAR_TRANSCRIPT") {
      state.transcript = "";
      sendResponse({ success: true });
      return true;
    }
  });

  async function startRecording(tabId: number) {
    try {
      // Capture tab audio
      const streamId = await new Promise<string>((resolve, reject) => {
        browser.tabCapture.capture(
          {
            audio: true,
            video: false,
          },
          (stream) => {
            if (browser.runtime.lastError) {
              reject(browser.runtime.lastError);
              return;
            }
            if (!stream) {
              reject(new Error("No stream returned"));
              return;
            }
            // Get stream ID for later use
            resolve(stream.id);
          },
        );
      });

      // Get the actual MediaStream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          },
        },
      } as any);

      state.stream = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      state.mediaRecorder = mediaRecorder;

      // Handle audio chunks (every 5 seconds)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await transcribeChunk(event.data);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error("MediaRecorder error:", error);
      };

      // Start recording with 5s chunks
      mediaRecorder.start(5000);
      state.isRecording = true;

      return { success: true };
    } catch (error) {
      console.error("Failed to start recording:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
    }

    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }

    state.isRecording = false;
    state.mediaRecorder = null;
    state.stream = null;
  }

  async function transcribeChunk(audioBlob: Blob) {
    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          format: "webm",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text.trim()) {
          state.transcript += " " + data.text.trim();

          // Notify popup of new transcript
          browser.runtime.sendMessage({
            type: "TRANSCRIPT_UPDATE",
            text: data.text.trim(),
          });
        }
      } else {
        console.error("Transcription failed:", await response.text());
      }
    } catch (error) {
      console.error("Transcription error:", error);
    }
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
});

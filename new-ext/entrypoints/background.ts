// Background: manages offscreen document, uses Port for reliable bg↔offscreen comms
// Port approach avoids the sendMessage collision (bg catching its own messages)

let offscreenPort: chrome.runtime.Port | null = null;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hasOffscreenDocument(): Promise<boolean> {
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    return contexts.length > 0;
  } catch {
    return false;
  }
}

async function ensureOffscreen(): Promise<void> {
  const exists = await hasOffscreenDocument();
  if (!exists) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL("offscreen.html"),
      reasons: ["USER_MEDIA" as chrome.offscreen.Reason],
      justification: "Record microphone audio for transcription",
    });
  }

  // Wait for offscreen to connect back via Port
  for (let i = 0; i < 50; i++) {
    if (offscreenPort) return;
    await wait(100);
  }
  throw new Error("Offscreen did not connect within 5s");
}

function postToOffscreen(msg: any, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!offscreenPort)
      return reject(new Error("Offscreen port not connected"));
    const id = Math.random().toString(36).slice(2);
    msg.__id = id;

    const listener = (m: any) => {
      if (m?.__respFor === id) {
        offscreenPort!.onMessage.removeListener(listener);
        clearTimeout(timer);
        resolve(m.payload);
      }
    };

    const timer = setTimeout(() => {
      offscreenPort?.onMessage.removeListener(listener);
      reject(new Error("Offscreen response timeout"));
    }, timeoutMs);

    offscreenPort.onMessage.addListener(listener);
    offscreenPort.postMessage(msg);
  });
}

export default defineBackground(() => {
  console.log("Meeting Notes AI - Background worker initialized");

  // Offscreen connects back to background via named Port
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "offscreen") return;
    offscreenPort = port;
    console.log("[background] Offscreen connected via Port");

    port.onMessage.addListener((msg: any) => {
      // Forward transcript updates to popup
      if (msg?.type === "TRANSCRIPT_UPDATE") {
        browser.runtime.sendMessage(msg).catch(() => {});
      }
    });

    port.onDisconnect.addListener(() => {
      console.log("[background] Offscreen disconnected");
      offscreenPort = null;
    });
  });

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      if (message.type === "START_RECORDING") {
        try {
          await ensureOffscreen();
          const result = await postToOffscreen({ type: "START_MIC" });
          sendResponse(result);
        } catch (e: any) {
          sendResponse({ success: false, error: e.message });
        }
        return;
      }

      if (message.type === "STOP_RECORDING") {
        try {
          if (offscreenPort) {
            await postToOffscreen({ type: "STOP_MIC" });
          }
          sendResponse({ success: true });
        } catch (e: any) {
          sendResponse({ success: false, error: e.message });
        }
        return;
      }
    })();
    return true; // async sendResponse
  });
});

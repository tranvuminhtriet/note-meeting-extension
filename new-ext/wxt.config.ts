import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Meeting Notes AI",
    description: "Realtime transcription and AI-powered meeting summaries",
    permissions: ["tabCapture", "storage", "downloads", "offscreen"],
    host_permissions: ["https://meet.google.com/*"],
    action: {
      default_title: "Meeting Notes AI",
    },
  },
});

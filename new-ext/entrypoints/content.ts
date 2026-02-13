export default defineContentScript({
  matches: ["*://meet.google.com/*"],
  main() {
    console.log("Meeting Notes AI - Content script loaded");
  },
});

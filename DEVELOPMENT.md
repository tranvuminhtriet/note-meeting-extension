# Development Workflow

## Quick Start (Recommended)

### 1. Start Watch Mode

```bash
npm run dev:watch
```

This will:

- Build extension to `.output/chrome-mv3-dev/`
- Watch for file changes
- Auto-rebuild when you edit code
- **NOT** open a new browser

### 2. Load Extension in Your Chrome

1. Open Chrome (your current browser with data)
2. Go to `chrome://extensions/`
3. Enable **"Developer mode"** (top right)
4. Click **"Load unpacked"**
5. Select folder: `.output/chrome-mv3-dev/`

### 3. Reload After Changes

When you edit code:

- Extension auto-rebuilds (watch mode)
- Go to `chrome://extensions/`
- Click **reload icon** on extension card
- Or use keyboard shortcut: `Cmd+R` on extension card

---

## Alternative: Auto-Open Browser (Clean State)

```bash
npm run dev
```

- Opens new Chrome instance
- Fresh profile (no data)
- Good for testing from scratch

---

## Production Build

```bash
npm run build
```

- Builds to `.output/chrome-mv3/`
- Optimized for production
- Use this for final testing

---

## Tips

- **Keep watch mode running** while developing
- **Reload extension** after each change
- **Check console** in extension popup/sidepanel for errors
- **Backend must be running**: `python server.py` in separate terminal

## 📋 Prerequisites

### 1. Python 3.9+

```bash
python --version
```

### 2. ffmpeg (cho Whisper)

```bash
# macOS
brew install ffmpeg

# Verify
ffmpeg -version
```

### 3. Ollama + Mistral Model

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Mistral model
ollama pull mistral

# Verify
ollama list
```

## 🚀 Setup

### Backend Setup

1. **Create virtual environment**:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

   > ⏳ Lần đầu chạy sẽ download Whisper tiny model (~39MB)

3. **Start backend server**:

   ```bash
   # Make sure Ollama is running
   ollama serve  # In separate terminal

   # Start FastAPI
   python server.py
   ```

   Server sẽ chạy tại `http://localhost:8000`

### Extension Setup

1. **Install dependencies**:

   ```bash
   cd wxt-dev-wxt
   npm install
   ```

2. **Build extension**:

   ```bash
   # Development mode (auto-reload)
   npm run dev

   # Production build
   npm run build
   ```

3. **Load extension vào Chrome**:
   - Mở `chrome://extensions/`
   - Bật "Developer mode"
   - Click "Load unpacked"
   - Chọn folder `.output/chrome-mv3`

# Meeting Notes AI Extension

Browser extension cho Google Meet với khả năng transcribe realtime và tạo summary bằng AI local.

## 🎯 Features

- ✅ Realtime transcription sử dụng Whisper AI (local)
- ✅ Structured summary generation với Ollama Mistral
- ✅ Sidebar UI hiển thị transcript và summary
- ✅ Export kết quả ra file Markdown
- ✅ 100% local processing (privacy-first)

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

## 📖 Usage

1. **Start backend server** (nếu chưa chạy):

   ```bash
   cd backend
   source venv/bin/activate
   python server.py
   ```

2. **Join Google Meet**:
   - Vào meeting bất kỳ trên `meet.google.com`

3. **Open extension sidebar**:
   - Click vào extension icon trên toolbar
   - Hoặc mở sidebar từ Chrome

4. **Start recording**:
   - Nhấn "Start Recording" button
   - Transcript sẽ hiển thị realtime

5. **Generate summary**:
   - Nhấn "Stop Recording" khi meeting kết thúc
   - Nhấn "Summarize" để tạo summary
   - File Markdown sẽ tự động download

## 📁 Project Structure

```
meeting-note-ext/
├── backend/
│   ├── server.py              # FastAPI server
│   ├── requirements.txt       # Python dependencies
│   └── README.md             # Backend docs
│
└── wxt-dev-wxt/
    ├── entrypoints/
    │   ├── background.ts      # Audio capture logic
    │   ├── sidepanel.html     # Sidebar entry
    │   ├── sidepanel.tsx      # React UI
    │   └── sidepanel.css      # Styling
    ├── wxt.config.ts          # Extension config
    └── package.json           # Node dependencies
```

## 🔧 API Endpoints

### `GET /health`

Check backend status

**Response**:

```json
{
  "status": "ok",
  "whisper_loaded": true,
  "ollama_available": true
}
```

### `POST /transcribe`

Transcribe audio chunk

**Request**:

```json
{
  "audio": "base64_audio_data",
  "format": "webm"
}
```

**Response**:

```json
{
  "text": "transcribed text"
}
```

### `POST /summarize`

Generate structured summary

**Request**:

```json
{
  "transcript": "full transcript text"
}
```

**Response**:

```json
{
  "summary": "## Action Items\n- ...\n\n## Decisions\n- ...\n\n## Discussion\n- ..."
}
```

## 🐛 Troubleshooting

### Backend không kết nối được

- Kiểm tra backend đang chạy: `curl http://localhost:8000/health`
- Kiểm tra Ollama: `ollama list`
- Restart backend server

### Whisper errors

- Kiểm tra ffmpeg: `ffmpeg -version`
- Kiểm tra Python version: `python --version` (cần 3.9+)
- Reinstall dependencies: `pip install --upgrade openai-whisper`

### Extension không capture audio

- Kiểm tra permissions trong `chrome://extensions/`
- Reload extension
- Kiểm tra đang ở tab Google Meet

### Transcript không hiển thị

- Mở DevTools console để xem errors
- Kiểm tra backend logs
- Verify audio đang được capture (check background worker logs)

## 🎨 Output Format

File markdown được export theo format:

```markdown
# Meeting Notes - [Timestamp]

## Transcript

[Full transcript text...]

---

## Action Items

- Task 1
- Task 2

## Decisions

- Decision 1
- Decision 2

## Discussion

- Topic 1
- Topic 2
```

File naming: `meeting-2026-02-10-15-30.md`

## 🔐 Privacy

- ✅ Tất cả processing đều local (Whisper + Ollama)
- ✅ Không có data gửi lên cloud
- ✅ Audio chỉ xử lý trong memory
- ✅ Transcript lưu local hoặc export manual

## 📝 License

MIT

## 🤝 Contributing

Pull requests are welcome!

## 📧 Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub.

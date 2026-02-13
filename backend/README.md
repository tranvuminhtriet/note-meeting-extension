# Backend Server Setup

## Prerequisites

1. **Python 3.9+**
2. **ffmpeg** (required by Whisper)
   ```bash
   brew install ffmpeg  # macOS
   ```
3. **Ollama** with Mistral model

   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh

   # Pull Mistral model
   ollama pull mistral
   ```

## Installation

1. Create virtual environment:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Download Whisper model (automatic on first run):
   - The `tiny` model (~39MB) will download automatically when first transcription request is made

## Running the Server

```bash
# Make sure Ollama is running
ollama serve  # In a separate terminal

# Start FastAPI server
cd backend
source venv/bin/activate
python server.py
```

Server will run on `http://localhost:8000`

## API Endpoints

### `GET /health`

Check server and AI models status

**Response:**

```json
{
  "status": "ok",
  "whisper_loaded": true,
  "ollama_available": true
}
```

### `POST /transcribe`

Transcribe audio chunk using Whisper

**Request:**

```json
{
  "audio": "base64_encoded_audio_data",
  "format": "webm"
}
```

**Response:**

```json
{
  "text": "transcribed text from audio"
}
```

### `POST /summarize`

Generate structured summary using Mistral

**Request:**

```json
{
  "transcript": "full meeting transcript text"
}
```

**Response:**

```json
{
  "summary": "## Action Items\n- ...\n\n## Decisions\n- ...\n\n## Discussion\n- ..."
}
```

## Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test transcribe (with sample audio)
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio": "base64_audio_here", "format": "webm"}'
```

## Troubleshooting

**Ollama not available:**

- Make sure Ollama is running: `ollama serve`
- Check if Mistral is installed: `ollama list`

**Whisper errors:**

- Ensure ffmpeg is installed: `ffmpeg -version`
- Check Python version: `python --version` (need 3.9+)

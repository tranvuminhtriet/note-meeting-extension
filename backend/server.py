from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import whisper
import ollama
import base64
import io
import tempfile
import os
import traceback
from typing import Optional

app = FastAPI(title="Meeting Note Backend")

# CORS configuration for extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Extension origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances (lazy loading)
whisper_model: Optional[whisper.Whisper] = None


def get_whisper_model():
    """Lazy load Whisper model"""
    global whisper_model
    if whisper_model is None:
        print("Loading Whisper tiny model...")
        whisper_model = whisper.load_model("tiny")
        print("Whisper model loaded!")
    return whisper_model


# Request/Response models
class TranscribeRequest(BaseModel):
    audio: str  # base64 encoded audio
    format: str = "webm"


class TranscribeResponse(BaseModel):
    text: str


class SummarizeRequest(BaseModel):
    transcript: str


class SummarizeResponse(BaseModel):
    summary: str


class HealthResponse(BaseModel):
    status: str
    whisper_loaded: bool
    ollama_available: bool


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    # Check Ollama availability
    ollama_ok = False
    try:
        ollama.list()
        ollama_ok = True
    except Exception as e:
        print(f"Ollama check failed: {e}")
    
    return HealthResponse(
        status="ok",
        whisper_loaded=whisper_model is not None,
        ollama_available=ollama_ok
    )


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    """Transcribe audio chunk using Whisper"""
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(request.audio)
        audio_size = len(audio_bytes)
        print(f"[transcribe] Received audio: {audio_size} bytes, format: {request.format}")

        # Skip empty or too-small chunks (< 1KB is likely silence/empty)
        if audio_size < 1024:
            print(f"[transcribe] Skipping tiny chunk ({audio_size} bytes)")
            return TranscribeResponse(text="")

        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix=f".{request.format}", delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name

        try:
            # Load Whisper model and transcribe
            model = get_whisper_model()
            result = model.transcribe(tmp_path, language="vi")
            text = result["text"].strip()
            print(f"[transcribe] Result: '{text}'")
            return TranscribeResponse(text=text)

        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        print(f"[transcribe] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/summarize", response_model=SummarizeResponse)
async def generate_summary(request: SummarizeRequest):
    """Generate structured summary using Ollama Mistral"""
    try:
        # Structured prompt for Mistral
        prompt = f"""Analyze the following meeting transcript and create a structured summary in Vietnamese with these sections:

## Action Items
List all tasks, assignments, and action items mentioned.

## Decisions
List all decisions made during the meeting.

## Discussion
Summarize the main discussion points and topics covered.

Transcript:
{request.transcript}

Please format the output in Markdown with clear sections."""

        # Call Ollama
        response = ollama.chat(
            model="mistral",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that creates structured meeting summaries in Vietnamese."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        summary = response["message"]["content"]
        
        return SummarizeResponse(summary=summary)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

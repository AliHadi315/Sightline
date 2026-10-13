"""Sightline JSON API. One FastAPI app used two ways:

  - locally, mounted by server.py together with the built site and the Gradio UI;
  - on Vercel, as the serverless function behind /api/* (see vercel.json).

Every visitor brings their own free Gemini key: it travels with each request and is never
stored. There is no shared server key for the website, so there is nothing to ration. The API
is stateless: the browser sends its own last three descriptions with each request, so any
instance can answer. Uses vision / speech / memory unchanged.
"""
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:  # Vercel runs the function from a bundle; make `import config` work
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, File, Form, UploadFile  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse  # noqa: E402
from PIL import Image  # noqa: E402

import config  # noqa: E402
import speech  # noqa: E402
import vision  # noqa: E402
from memory import Memory  # noqa: E402

CACHED = json.loads((config.SAMPLES_DIR / "cached.json").read_text(encoding="utf-8"))
SAMPLE_NAMES = list(CACHED)
SAMPLE_CAPTIONS = {"desk.jpg": "A desk with a laptop", "sign.jpg": "A sign with text", "kitchen.jpg": "A kitchen counter"}
MAX_SPEAK_CHARS = 1500
NO_KEY = "No API key yet. Paste your own free Gemini key to describe your camera."

app = FastAPI(title="Sightline API", docs_url="/api/docs", redoc_url=None)


def demo_reason(user_key: str) -> str | None:
    """Why live calls are unavailable, or None if they are allowed. The website never uses a server key."""
    return None if user_key.strip() else NO_KEY


def _sample_payload(mode: str, name: str, reason: str | None) -> dict:
    entry = CACHED[name][mode]
    return {
        **entry, "mode": mode, "source": "sample", "sample": name, "demo_reason": reason,
        "message": (f"Demo mode: {reason} Playing the saved {mode} description of a sample."
                    if reason else f"Saved {mode} description of a sample. No API call made."),
    }


def _error(mode: str, message: str, description: str = "") -> dict:
    return {"source": "error", "mode": mode, "description": description, "message": message}


@app.get("/api/status")
def status(own_key: int = 0):
    reason = demo_reason("x" if own_key else "")
    return {"model": config.MODEL, "voice": config.VOICE, "live": reason is None, "demo_reason": reason}


@app.get("/api/samples")
def samples():
    return [{"name": n, "caption": SAMPLE_CAPTIONS.get(n, n), "image": f"/api/samples/{n}", **CACHED[n]} for n in SAMPLE_NAMES]


@app.get("/api/samples/{name}")
def sample_image(name: str):
    path = config.SAMPLES_DIR / Path(name).name
    if name not in CACHED or not path.exists():
        return JSONResponse({"error": "no such sample"}, status_code=404)
    return FileResponse(path, media_type="image/jpeg")


@app.post("/api/describe")
def describe(  # sync on purpose: runs in a worker thread, so the blocking Gemini call never stalls the event loop
    mode: str = Form("scene"),
    key: str = Form(""),
    sample: str = Form(""),
    history: str = Form("[]"),
    image: UploadFile | None = File(default=None),
):
    mode = "read" if mode == "read" else "scene"
    key = key.strip()
    try:
        if sample in CACHED:
            return _sample_payload(mode, sample, None)
        reason = demo_reason(key)
        if reason:
            return _sample_payload(mode, SAMPLE_NAMES[0], reason)
        if image is None:
            return _error(mode, "No photo received. Take a photo first, then press the button again.")
        try:
            with Image.open(io.BytesIO(image.file.read())) as im:
                jpeg = vision.encode_jpeg(im)
        except Exception:  # noqa: BLE001 - a corrupt upload must not 500
            return _error(mode, "That photo could not be read. Please take another one.")

        mem = Memory()
        try:
            for item in json.loads(history or "[]")[-config.MEMORY_SIZE * 2:]:
                if isinstance(item, dict) and item.get("mode") in ("scene", "read"):
                    mem.remember(item, item["mode"])
        except (ValueError, TypeError):
            pass

        try:
            result = vision.describe(jpeg, mode, mem.context(mode), api_key=key)
        except vision.QuotaExhausted as e:
            return _error(mode, f"Your API key has used its daily free quota. {e}")
        except vision.RateLimited as e:
            return _error(mode, str(e), description=str(e))
        except vision.VisionError as e:
            return _error(mode, f"Could not describe this photo. {e}")

        if mem.is_repeat(result, mode):
            return {"source": "repeat", "mode": mode, "description": "No change since the last description.",
                    "objects": result["objects"], "text_visible": result["text_visible"], "model": result.get("model"),
                    "message": "No change since the last description, so nothing was spoken."}
        return {**result, "mode": mode, "source": "live", "message": f"Described in {result.get('latency_ms', 0) / 1000:.1f} s."}
    except Exception as e:  # noqa: BLE001 - the public site must never 500
        return JSONResponse(_error(mode, f"Something went wrong on our side ({type(e).__name__}). Please try again."))


@app.post("/api/speak")
def speak(text: str = Form(""), key: str = Form("")):
    """Spoken version of a description: mp3 streamed from edge-tts, or WAV from Gemini TTS on the visitor's key.

    503 means both engines failed; the site then falls back to the browser's own voice.
    """
    text = (text or "").strip()[:MAX_SPEAK_CHARS]
    if not text:
        return JSONResponse({"error": "no text"}, status_code=400)
    result = speech.stream(text, api_key=key.strip() or None, allow_env_key=False)
    if result is None:
        return JSONResponse({"error": "speech unavailable"}, status_code=503)
    mime, chunks = result
    return StreamingResponse(chunks, media_type=mime, headers={"Cache-Control": "no-store", "X-Speech-Engine": "gemini" if mime == "audio/wav" else "edge-tts"})

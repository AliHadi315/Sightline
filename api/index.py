"""Sightline JSON API. One FastAPI app used two ways:

  - locally, mounted by server.py together with the built site and the Gradio UI;
  - on Vercel, as the serverless function behind /api/* (see vercel.json).

It is stateless on purpose: the browser sends its own last three descriptions and its own
session count with each request, so any instance can answer. Uses vision / speech / memory unchanged.
"""
import datetime
import io
import json
import sys
import threading
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

app = FastAPI(title="Sightline API", docs_url="/api/docs", redoc_url=None)

# ponytail: the daily counter lives in this process plus a local file when the disk is writable.
# Serverless instances each count on their own, so on Vercel the cap is best-effort; the
# per-session cap (enforced by the client and echoed here) is what actually bounds usage.
_lock = threading.Lock()
_daily = {"date": None, "count": 0}
_shared_key_dead = {"today": None}


def _today() -> str:
    return datetime.date.today().isoformat()


def _daily_count() -> int:
    if _daily["date"] != _today():
        try:
            data = json.loads(config.DAILY_COUNT_PATH.read_text(encoding="utf-8"))
            _daily.update(date=data.get("date"), count=int(data.get("count", 0)))
        except (OSError, ValueError):
            pass
    return _daily["count"] if _daily["date"] == _today() else 0


def _daily_bump() -> None:
    with _lock:
        count = _daily_count() + 1
        _daily.update(date=_today(), count=count)
        try:
            config.DAILY_COUNT_PATH.parent.mkdir(parents=True, exist_ok=True)
            config.DAILY_COUNT_PATH.write_text(json.dumps({"date": _today(), "count": count}), encoding="utf-8")
        except OSError:
            pass


def demo_reason(user_key: str, session_count: int) -> str | None:
    """Why live calls are unavailable right now, or None if they are allowed."""
    if session_count >= config.SESSION_CAP:
        return f"This browser session has used its {config.SESSION_CAP} live descriptions."
    if user_key:
        return None
    if not config.GEMINI_API_KEY:
        return "No API key is configured on this server."
    if _shared_key_dead["today"] == _today() or _daily_count() >= config.DAILY_CAP:
        return "The shared free-tier key has used up its daily quota."
    return None


def _sample_payload(mode: str, name: str, count: int, reason: str | None) -> dict:
    entry = CACHED[name][mode]
    return {
        **entry, "mode": mode, "count": count, "source": "sample", "sample": name, "demo_reason": reason,
        "message": (f"Demo mode: {reason} Playing the saved {mode} description of a sample."
                    if reason else f"Saved {mode} description of a sample. No API call made."),
    }


def _error(mode: str, count: int, message: str, description: str = "") -> dict:
    return {"source": "error", "mode": mode, "count": count, "description": description, "message": message}


@app.get("/api/status")
def status(own_key: int = 0, count: int = 0):
    reason = demo_reason("x" if own_key else "", count)
    return {
        "model": config.MODEL, "voice": config.VOICE,
        "session_cap": config.SESSION_CAP, "count": count,
        "daily_used": _daily_count(), "daily_cap": config.DAILY_CAP,
        "shared_key": bool(config.GEMINI_API_KEY),
        "live": reason is None, "demo_reason": reason,
    }


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
    count: int = Form(0),
    history: str = Form("[]"),
    image: UploadFile | None = File(default=None),
):
    mode = "read" if mode == "read" else "scene"
    key = key.strip()
    count = max(0, count)
    try:
        reason = demo_reason(key, count)
        if sample in CACHED:
            return _sample_payload(mode, sample, count, None)
        if reason:
            return _sample_payload(mode, SAMPLE_NAMES[0], count, reason)
        if image is None:
            return _error(mode, count, "No photo received. Take a photo first, then press the button again.")
        try:
            with Image.open(io.BytesIO(image.file.read())) as im:
                jpeg = vision.encode_jpeg(im)
        except Exception:  # noqa: BLE001 - a corrupt upload must not 500
            return _error(mode, count, "That photo could not be read. Please take another one.")

        mem = Memory()
        try:
            for item in json.loads(history or "[]")[-config.MEMORY_SIZE * 2:]:
                if isinstance(item, dict) and item.get("mode") in ("scene", "read"):
                    mem.remember(item, item["mode"])
        except (ValueError, TypeError):
            pass

        try:
            result = vision.describe(jpeg, mode, mem.context(mode), api_key=key or None)
        except vision.QuotaExhausted as e:
            if key:
                return _error(mode, count, f"Your API key has used its daily free quota. {e}")
            _shared_key_dead["today"] = _today()
            return _sample_payload(mode, SAMPLE_NAMES[0], count, "The shared free-tier key just hit its daily quota.")
        except vision.RateLimited as e:
            return _error(mode, count, str(e), description=str(e))
        except vision.VisionError as e:
            return _error(mode, count, f"Could not describe this photo. {e}")

        count += 1
        if not key:
            _daily_bump()
        if mem.is_repeat(result, mode):
            return {"source": "repeat", "mode": mode, "count": count, "description": "No change since the last description.",
                    "objects": result["objects"], "text_visible": result["text_visible"], "model": result.get("model"),
                    "message": "No change since the last description, so nothing was spoken."}
        return {**result, "mode": mode, "count": count, "source": "live",
                "message": f"Described in {result.get('latency_ms', 0) / 1000:.1f} s."}
    except Exception as e:  # noqa: BLE001 - the public site must never 500
        return JSONResponse(_error(mode, count, f"Something went wrong on our side ({type(e).__name__}). Please try again."))


@app.post("/api/speak")
def speak(text: str = Form("")):
    """Spoken version of a description as mp3, streamed as edge-tts produces it."""
    text = (text or "").strip()[:MAX_SPEAK_CHARS]
    if not text:
        return JSONResponse({"error": "no text"}, status_code=400)
    return StreamingResponse(speech.stream(text), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})

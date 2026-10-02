"""Sightline settings. Everything tunable lives here; the other modules import from this file."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _load_env(path: Path) -> None:
    """Minimal .env loader (KEY=VALUE, # comments). Existing environment wins."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env(ROOT / ".env")

# --- Gemini -----------------------------------------------------------------
# Free-tier Flash model from a Google AI Studio key. Change the model here only.
MODEL = "gemini-3.1-flash-lite"      # primary: the fastest free-tier vision model (about 2 s per frame)
FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"]  # tried in order when the primary is overloaded, hung, rate limited, or retired
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip() or None
THINKING_LEVEL = "minimal"     # no hidden reasoning; scene descriptions do not need it (3.7+/3.8 models only accept "low")
TEMPERATURE = 0.4
MAX_OUTPUT_TOKENS = 220        # one or two sentences plus the object list; caps generation time
RETRY_ATTEMPTS = 2             # extra attempts after the first failure; overload switches model without waiting
RETRY_BASE_SECONDS = 1.0       # backoff for 429 only: 1s, then 2s
REQUEST_TIMEOUT_MS = 15_000    # a hung request fails fast and moves on to the fallback model

# --- Speech (edge-tts, unofficial Microsoft endpoint) ------------------------
VOICE = "en-US-AriaNeural"
TTS_TIMEOUT_SECONDS = 20

# --- Frames -----------------------------------------------------------------
MAX_EDGE = 768                 # longest edge after downscale
JPEG_QUALITY = 80
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))

# --- Memory / repetition ----------------------------------------------------
MEMORY_SIZE = 3
SIMILARITY_THRESHOLD = 0.85    # normalized text similarity above this = "No change"

# --- Rate limiting ----------------------------------------------------------
COOLDOWN_SECONDS = 3.0         # minimum gap between manual triggers
SESSION_CAP = 10               # web demo: live calls per browser session
DAILY_CAP = 200                # web demo: live calls per day on the shared key (free tier is ~250/day)

# --- Paths ------------------------------------------------------------------
DEBUG_DIR = ROOT / "debug"
DEBUG_FRAME = DEBUG_DIR / "last_frame.jpg"
LOG_PATH = ROOT / "logs" / "log.jsonl"
DAILY_COUNT_PATH = ROOT / "logs" / "daily_count.json"
SAMPLES_DIR = ROOT / "samples"
EVALS_DIR = ROOT / "evals"

"""Gemini scene / read calls: prompts, structured output, retry and backoff, JSONL logging."""
import io
import json
import time
from datetime import datetime, timezone

from google import genai
from google.genai import errors, types
from PIL import Image

import config


class VisionError(Exception):
    """Something went wrong that the user should be told about in plain words."""


class RateLimited(VisionError):
    """Per-minute limit hit and retries exhausted."""


class QuotaExhausted(VisionError):
    """Daily free-tier quota is gone; stop calling until tomorrow."""


SYSTEM_INSTRUCTION = (
    "You are the eyes of a person with low vision who is holding or facing a camera. "
    "Everything you say will be read aloud to them. Speak plainly and briefly, no preamble, "
    "no hedging, no markdown. Use spatial language relative to the camera: 'to your left', "
    "'in front of you', 'at the top'. Left means the left side of the image.\n"
    "Privacy rule, never break it: never state or guess a person's age, gender, race, ethnicity, "
    "emotional state, health, or any other personal attribute. Describe people only by presence "
    "and action, for example 'a person seated at a desk' or 'someone walking past on your right'."
)

SCENE_PROMPT = (
    "Describe this scene for someone who cannot see it. Lead with the most important thing, "
    "then the layout and what is happening. Keep the description to one or two spoken sentences. "
    "List the salient objects, most prominent first. If any text is legible, put it in text_visible, otherwise null."
)

SCENE_CHANGE_PROMPT = (
    "\n\nPrevious observations, oldest first:\n{history}\n\n"
    "Report ONLY what has changed since the most recent observation: things that appeared, "
    "disappeared, moved, or started happening. Do not repeat what was already described. "
    "If nothing meaningful has changed, return an empty string for description."
)

READ_PROMPT = (
    "TASK: READ MODE. Do NOT describe the scene, the objects, or any person. "
    "Transcribe all legible text in this image verbatim, top to bottom and left to right, "
    "preserving reading order. Put the exact text in description and again in text_visible. "
    "Do not summarize, correct, translate, or add commentary. "
    "If there is no legible text, description must be exactly the sentence 'I don't see any readable text.' "
    "and text_visible must be null. objects may be empty."
)

RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "description": types.Schema(type=types.Type.STRING, description="One or two spoken sentences in plain language."),
        "objects": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Salient objects, most prominent first."),
        "text_visible": types.Schema(type=types.Type.STRING, nullable=True, description="Legible text, or null."),
    },
    required=["description", "objects", "text_visible"],
)

GEN_CONFIG = types.GenerateContentConfig(
    system_instruction=SYSTEM_INSTRUCTION,
    response_mime_type="application/json",
    response_schema=RESPONSE_SCHEMA,
    temperature=config.TEMPERATURE,
    max_output_tokens=config.MAX_OUTPUT_TOKENS,
    thinking_config=types.ThinkingConfig(thinking_level=config.THINKING_LEVEL),
    http_options=types.HttpOptions(timeout=config.REQUEST_TIMEOUT_MS),
)

_clients: dict[str, genai.Client] = {}


def _client(key: str) -> genai.Client:
    if key not in _clients:
        _clients[key] = genai.Client(api_key=key)
    return _clients[key]


def encode_jpeg(image: Image.Image) -> bytes:
    """Downscale so the longest edge is MAX_EDGE, encode as JPEG at JPEG_QUALITY."""
    img = image.convert("RGB")
    w, h = img.size
    scale = config.MAX_EDGE / max(w, h)
    if scale < 1:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=config.JPEG_QUALITY)
    return buf.getvalue()


def build_prompt(mode: str, history: list[dict] | None) -> str:
    if mode == "read":
        return READ_PROMPT
    prompt = SCENE_PROMPT
    if history:
        lines = [f"{i}. {h['description']} (objects: {', '.join(h.get('objects') or []) or 'none'})"
                 for i, h in enumerate(history, 1) if h.get("description")]
        if lines:
            prompt += SCENE_CHANGE_PROMPT.format(history="\n".join(lines))
    return prompt


def parse_response(raw: str | None) -> dict:
    """Never raises. Malformed output degrades to a best-effort description."""
    fallback = {"description": "", "objects": [], "text_visible": None}
    if not raw:
        return fallback
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {**fallback, "description": raw.strip()[:400]}
    if not isinstance(data, dict):
        return fallback
    objects = data.get("objects")
    text = data.get("text_visible")
    return {
        "description": str(data.get("description") or "").strip(),
        "objects": [str(o).strip() for o in objects if o] if isinstance(objects, list) else [],
        "text_visible": str(text).strip() if text else None,
    }


def _is_daily_quota(err: Exception) -> bool:
    # ponytail: string sniffing; Gemini reports per-minute and per-day limits with the same 429 code
    # and only the quota_id text ("...PerDay...") tells them apart.
    return "day" in str(err).lower()


def _friendly(exc: Exception) -> str:
    text = str(exc).lower()
    if any(w in text for w in ("connect", "resolve", "timed out", "timeout", "network", "unreachable", "ssl")):
        return "Network error. Check your internet connection."
    return f"Could not reach Gemini: {type(exc).__name__}: {exc}"[:200]


def _log(record: dict) -> None:
    try:
        config.LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(config.LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError:
        pass


def describe(jpeg: bytes, mode: str = "scene", history: list[dict] | None = None, api_key: str | None = None) -> dict:
    """Describe a JPEG frame. Returns {description, objects, text_visible, latency_ms}.

    Raises QuotaExhausted (stop for the day), RateLimited (try again shortly) or VisionError.
    Every attempt, success or failure, appends one line to logs/log.jsonl.
    """
    key = api_key or config.GEMINI_API_KEY
    if not key:
        raise VisionError("No Gemini API key. Put GEMINI_API_KEY in .env (free key: https://aistudio.google.com/apikey).")
    if mode not in ("scene", "read"):
        raise VisionError(f"Unknown mode {mode!r}")

    prompt = build_prompt(mode, history)
    contents = [types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), prompt]
    # Attempt 0 uses the primary model; later attempts use the fallback, which has its own quota
    # and is usually not overloaded at the same time.
    models = [config.MODEL] + [m for m in config.FALLBACK_MODELS if m and m != config.MODEL]
    started = time.monotonic()
    raw = usage = error = None
    model = config.MODEL
    try:
        for attempt in range(config.RETRY_ATTEMPTS + 1):
            model = models[min(attempt, len(models) - 1)]
            last = attempt == config.RETRY_ATTEMPTS
            try:
                response = _client(key).models.generate_content(model=model, contents=contents, config=GEN_CONFIG)
                break
            except errors.APIError as e:
                code = getattr(e, "code", None)
                if code == 429 and _is_daily_quota(e):
                    if not last and model != models[-1]:
                        continue  # the fallback model has its own daily quota
                    raise QuotaExhausted("Daily free-tier quota exhausted. Try again tomorrow.") from e
                if code == 429 and not last:
                    time.sleep(config.RETRY_BASE_SECONDS * (2 ** attempt))
                    continue
                if code in (404, 503, 504) and not last:
                    continue  # overloaded or retired model: switch to the next one immediately
                if code == 429:
                    raise RateLimited("Rate limit reached, try again in a moment.") from e
                if code in (503, 504):
                    raise VisionError("Gemini is overloaded right now. Try again in a moment.") from e
                raise VisionError(f"Gemini error {code}: {getattr(e, 'message', e)}"[:200]) from e
            except Exception as e:  # noqa: BLE001 - httpx timeouts and connection drops
                if not last and "timed out" in str(e).lower():
                    continue  # a hung request: try the other model
                raise
        raw = response.text
        meta = getattr(response, "usage_metadata", None)
        if meta is not None:
            usage = {"prompt": meta.prompt_token_count, "output": meta.candidates_token_count, "total": meta.total_token_count}
        result = parse_response(raw)
        result["latency_ms"] = round((time.monotonic() - started) * 1000)
        result["model"] = model
        return result
    except VisionError as e:
        error = str(e)
        raise
    except Exception as e:  # noqa: BLE001 - network stack raises many types; the loop must survive all of them
        error = _friendly(e)
        raise VisionError(error) from e
    finally:
        _log({
            "ts": datetime.now(timezone.utc).isoformat(),
            "mode": mode,
            "model": model,
            "latency_ms": round((time.monotonic() - started) * 1000),
            "tokens": usage,
            "raw": raw,
            "error": error,
        })


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("usage: python vision.py <image> [scene|read]")
        sys.exit(2)
    with Image.open(sys.argv[1]) as im:
        jpeg = encode_jpeg(im)
    print(f"encoded {len(jpeg)} bytes")
    try:
        print(json.dumps(describe(jpeg, sys.argv[2] if len(sys.argv) > 2 else "scene"), indent=2))
    except VisionError as e:
        print(f"FAILED: {e}")
        sys.exit(1)

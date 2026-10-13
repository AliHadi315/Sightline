"""Text to speech: edge-tts first, Gemini TTS second.

edge-tts is an UNOFFICIAL client for Microsoft Edge's Read Aloud endpoint. Microsoft can
change or block it at any time (it did, with a 403, in October 2026). When it fails before
producing any audio, the same text is sent to Gemini's TTS model on the same free key, which
returns raw 16-bit PCM that we wrap as WAV. Callers get (mime, chunks) and must cope with None.
"""
import asyncio
import io
import queue
import struct
import threading
import wave
from collections.abc import Iterator
from pathlib import Path

import edge_tts

import config

MIME_EXT = {"audio/mpeg": ".mp3", "audio/wav": ".wav"}


def _edge_stream(text: str) -> Iterator[bytes]:
    """Yield mp3 bytes as edge-tts produces them. Ends (possibly before any byte) on failure."""
    q: queue.Queue[bytes | None] = queue.Queue()

    def worker():
        async def pump():
            try:
                async with asyncio.timeout(config.TTS_TIMEOUT_SECONDS):
                    async for chunk in edge_tts.Communicate(text, config.VOICE).stream():
                        if chunk["type"] == "audio":
                            q.put(chunk["data"])
            except Exception as e:  # noqa: BLE001 - network, 403, NoAudioReceived, ...
                print(f"[speech] edge-tts failed: {type(e).__name__}: {e}")
            finally:
                q.put(None)
        asyncio.run(pump())

    threading.Thread(target=worker, daemon=True).start()
    while (data := q.get()) is not None:
        yield data


def _pcm_to_wav(pcm: bytes, rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def gemini_tts(text: str, api_key: str | None = None) -> bytes | None:
    """Speak `text` with Gemini TTS. Returns WAV bytes, or None on any failure."""
    key = api_key or config.GEMINI_API_KEY
    if not key:
        return None
    try:
        from google.genai import types

        import vision  # shares the per-key client cache; a throwaway Client is closed before the request completes

        response = vision._client(key).models.generate_content(
            model=config.GEMINI_TTS_MODEL,
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=config.GEMINI_TTS_VOICE))),
                http_options=types.HttpOptions(timeout=config.TTS_TIMEOUT_SECONDS * 1000),
            ),
        )
        part = response.candidates[0].content.parts[0].inline_data
        rate = 24000
        for field in part.mime_type.split(";"):
            if field.strip().startswith("rate="):
                rate = int(field.split("=", 1)[1])
        return _pcm_to_wav(part.data, rate)
    except Exception as e:  # noqa: BLE001 - quota, network, malformed response
        print(f"[speech] gemini tts failed: {type(e).__name__}: {e}")
        return None


def stream(text: str, api_key: str | None = None) -> tuple[str, Iterator[bytes]] | None:
    """(mime type, audio chunks) for `text`, or None if every engine failed.

    edge-tts streams as it synthesizes; if it yields nothing, Gemini TTS is used instead.
    """
    text = (text or "").strip()
    if not text:
        return None
    edge = _edge_stream(text)
    first = next(edge, None)
    if first is not None:
        def rest():
            yield first
            yield from edge
        return "audio/mpeg", rest()
    wav = gemini_tts(text, api_key)
    return ("audio/wav", iter([wav])) if wav else None


def synthesize(text: str, out_path) -> Path | None:
    """Write `text` as audio next to `out_path` (extension follows the engine). Returns the path, or None."""
    result = stream(text)
    if result is None:
        return None
    mime, chunks = result
    path = Path(out_path).with_suffix(MIME_EXT[mime])
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        for chunk in chunks:
            f.write(chunk)
    if path.stat().st_size == 0:
        return None
    return path


if __name__ == "__main__":
    import sys
    # self-check of the pieces that need no network
    wav = _pcm_to_wav(struct.pack("<4h", 0, 1000, -1000, 0), 24000)
    assert wav[:4] == b"RIFF" and wav[8:12] == b"WAVE" and len(wav) == 44 + 8, "WAV wrapper is wrong"
    assert stream("") is None and synthesize("   ", config.DEBUG_DIR / "x.mp3") is None
    print("speech self-check ok")
    text = " ".join(sys.argv[1:]) or "Sightline speech test. A desk is in front of you."
    result = synthesize(text, config.DEBUG_DIR / "speech_test.mp3")
    print(f"wrote {result} ({result.stat().st_size} bytes)" if result else "speech FAILED (edge-tts and Gemini TTS both unavailable)")

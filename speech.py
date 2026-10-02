"""Text to speech via edge-tts.

edge-tts is an UNOFFICIAL client for Microsoft Edge's Read Aloud endpoint. Microsoft can
change or block it at any time, so every call is wrapped and failure returns None instead
of raising. Callers must cope with "no audio".
"""
import asyncio
import concurrent.futures
import queue
import threading
from pathlib import Path

import edge_tts

import config


async def _synth(text: str, path: Path) -> None:
    await asyncio.wait_for(edge_tts.Communicate(text, config.VOICE).save(str(path)), timeout=config.TTS_TIMEOUT_SECONDS)


def _run(coro) -> None:
    """asyncio.run, but also works when called from a thread that already has a running event loop."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(coro)
        return
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        pool.submit(asyncio.run, coro).result()


def synthesize(text: str, out_path) -> Path | None:
    """Write `text` as an mp3 to `out_path`. Returns the path, or None if synthesis failed."""
    text = (text or "").strip()
    if not text:
        return None
    path = Path(out_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        _run(_synth(text, path))
    except Exception as e:  # noqa: BLE001 - edge-tts raises many unrelated types (network, 403, NoAudioReceived)
        print(f"[speech] edge-tts failed: {type(e).__name__}: {e}")
        return None
    if not path.exists() or path.stat().st_size == 0:
        return None
    return path


def stream(text: str):
    """Yield mp3 bytes as edge-tts produces them. Sync generator, safe from any thread; ends early on failure."""
    text = (text or "").strip()
    if not text:
        return
    q: queue.Queue[bytes | None] = queue.Queue()

    def worker():
        async def pump():
            try:
                async with asyncio.timeout(config.TTS_TIMEOUT_SECONDS):
                    async for chunk in edge_tts.Communicate(text, config.VOICE).stream():
                        if chunk["type"] == "audio":
                            q.put(chunk["data"])
            except Exception as e:  # noqa: BLE001
                print(f"[speech] edge-tts stream failed: {type(e).__name__}: {e}")
            finally:
                q.put(None)
        asyncio.run(pump())

    threading.Thread(target=worker, daemon=True).start()
    while (data := q.get()) is not None:
        yield data


if __name__ == "__main__":
    import sys
    text = " ".join(sys.argv[1:]) or "Sightline speech test. A desk is in front of you."
    result = synthesize(text, config.DEBUG_DIR / "speech_test.mp3")
    print(f"wrote {result} ({result.stat().st_size} bytes)" if result else "speech FAILED (edge-tts unavailable?)")

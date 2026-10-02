"""Sightline desktop app: live preview, manual hotkey capture, worker thread, spoken output.

Hotkeys: space = describe scene, r = read text, esc = stop speaking, q = quit.
Capture is manual only. There is no motion detection and no timer.
"""
import os
import sys
import threading
import time

os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")

import cv2
import numpy as np
import pygame
from PIL import Image

import config
import speech
import vision
from memory import Memory

SPEECH_PATH = config.DEBUG_DIR / "last_speech.mp3"
WINDOW = "Sightline"
HELP = "[space] scene   [r] read   [esc] stop   [q] quit"


class Sightline:
    def __init__(self):
        self.state = "IDLE"          # IDLE / CAPTURING / THINKING / SPEAKING
        self.mode = "scene"
        self.banner = ""             # short status line drawn on the video
        self.last_text = ""          # full text of the last description, shown in the panel below the video
        self.quota_dead = False
        self.in_flight = False
        self.last_trigger = -config.COOLDOWN_SECONDS
        self.stop = threading.Event()
        self.memory = Memory()

    # ---- main-thread entry points -------------------------------------------------
    def trigger(self, frame, mode: str) -> None:
        if self.quota_dead:
            self.banner = "Daily quota exhausted. No more calls today."
            return
        if self.in_flight:
            return
        remaining = config.COOLDOWN_SECONDS - (time.monotonic() - self.last_trigger)
        if remaining > 0:
            self.banner = f"Cooling down, wait {remaining:.1f}s"
            return
        self.last_trigger = time.monotonic()
        self.in_flight = True
        self.mode = mode
        self.stop.clear()
        self.banner = ""
        threading.Thread(target=self._job, args=(frame.copy(), mode), daemon=True).start()

    def interrupt(self) -> None:
        self.stop.set()
        try:
            pygame.mixer.music.stop()
        except pygame.error:
            pass
        self.state = "IDLE"
        self.banner = "Interrupted"

    # ---- worker thread -------------------------------------------------------------
    def _job(self, frame, mode: str) -> None:
        try:
            self.state = "CAPTURING"
            jpeg = vision.encode_jpeg(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
            config.DEBUG_DIR.mkdir(parents=True, exist_ok=True)
            config.DEBUG_FRAME.write_bytes(jpeg)   # overwritten every time; never an archive

            self.state = "THINKING"
            try:
                result = vision.describe(jpeg, mode, self.memory.context(mode))
            except vision.QuotaExhausted:
                self.quota_dead = True
                return
            except vision.RateLimited:
                self._say("Rate limit reached, try again in a moment.")
                return
            except vision.VisionError as e:
                self.banner = str(e)
                return
            if self.stop.is_set():
                return
            if self.memory.is_repeat(result, mode):
                self.banner = "No change"
                return
            self.memory.remember(result, mode)
            self.last_text = result["description"]
            self.banner = f"{mode.title()} described in {result.get('latency_ms', 0) / 1000:.1f}s"
            print(f"[{mode}] {result['description']}")
            self._say(result["description"])
        except Exception as e:  # noqa: BLE001 - nothing may kill the loop
            self.banner = f"Error: {type(e).__name__}: {e}"
        finally:
            self.state = "IDLE"
            self.in_flight = False

    def _say(self, text: str) -> None:
        if self.stop.is_set():
            return
        self.state = "SPEAKING"
        path = speech.synthesize(text, SPEECH_PATH)
        if path is None:
            self.banner = "Speech unavailable (edge-tts failed). " + text
            return
        if self.stop.is_set():
            return
        try:
            pygame.mixer.music.load(str(path))
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy() and not self.stop.is_set():
                time.sleep(0.05)
            pygame.mixer.music.stop()
            pygame.mixer.music.unload()
        except pygame.error as e:
            self.banner = f"Playback failed: {e}"


def _put(frame, text, y, color=(255, 255, 255), scale=0.6):
    cv2.putText(frame, text, (10, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, 1, cv2.LINE_AA)


def _darken(frame, y0: int, y1: int) -> None:
    """Dim a horizontal band so overlay text stays readable on any background."""
    frame[y0:y1] = (frame[y0:y1] * 0.35).astype(np.uint8)


def _wrap(text: str, width: int, max_lines: int) -> list[str]:
    words, lines, line = text.replace("\n", " | ").split(), [], ""
    for w in words:
        if len(line) + len(w) + 1 > width:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    if line:
        lines.append(line)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1][: max(0, width - 3)] + "..."
    return lines


PANEL_LINES = 7
PANEL_LINE_H = 26


def text_panel(width: int, app: Sightline):
    """Black strip under the video showing the full last description in large readable text."""
    panel = np.zeros((PANEL_LINES * PANEL_LINE_H + 40, width, 3), np.uint8)
    cv2.putText(panel, f"Last description ({app.mode}):", (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 160, 160), 1, cv2.LINE_AA)
    text = app.last_text or "Press space to describe the scene, or r to read text."
    chars = max(20, int(width / 12))
    for i, line in enumerate(_wrap(text, chars, PANEL_LINES)):
        cv2.putText(panel, line, (10, 52 + i * PANEL_LINE_H), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 1, cv2.LINE_AA)
    return panel


def draw_overlay(frame, app: Sightline, fps: float) -> None:
    h = frame.shape[0]
    status = f"FPS {fps:4.1f}   {app.state}   mode: {app.mode.upper()}"
    remaining = config.COOLDOWN_SECONDS - (time.monotonic() - app.last_trigger)
    if remaining > 0:
        status += f"   cooldown {remaining:.1f}s"
    lines = [(status, (255, 255, 255), 0.6)]
    if app.quota_dead:
        lines.append(("DAILY QUOTA EXHAUSTED - Sightline will not call Gemini again today", (0, 0, 255), 0.65))
    lines += [(line, (0, 255, 255), 0.55) for line in _wrap(app.banner, 70, 2)]
    _darken(frame, 0, 14 + 26 * len(lines))
    for i, (text, color, scale) in enumerate(lines):
        _put(frame, text, 28 + 26 * i, color, scale)
    _darken(frame, h - 30, h)
    _put(frame, HELP, h - 10, (200, 200, 200), 0.5)


def main() -> int:
    if not config.GEMINI_API_KEY:
        print("No GEMINI_API_KEY found.\nCopy .env.example to .env and paste a free key from https://aistudio.google.com/apikey")
        return 1
    backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
    cap = cv2.VideoCapture(config.CAMERA_INDEX, backend)
    if not cap.isOpened():
        print(f"Camera {config.CAMERA_INDEX} is not available.\nClose other apps that use the camera, or set CAMERA_INDEX in .env to try another one.")
        return 1
    try:
        pygame.mixer.init()
    except pygame.error as e:
        print(f"No audio output device: {e}")
        cap.release()
        return 1

    app = Sightline()
    fps, last = 0.0, time.monotonic()
    cv2.namedWindow(WINDOW)
    print(f"Sightline running with {config.MODEL}. {HELP}")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Lost the camera feed. Is the camera still connected?")
                break
            now = time.monotonic()
            dt, last = now - last, now
            if dt > 0:
                fps = 1 / dt if fps == 0 else 0.9 * fps + 0.1 / dt
            display = frame.copy()
            draw_overlay(display, app, fps)
            cv2.imshow(WINDOW, np.vstack([display, text_panel(display.shape[1], app)]))

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q") or cv2.getWindowProperty(WINDOW, cv2.WND_PROP_VISIBLE) < 1:
                break
            if key == 32:
                app.trigger(frame, "scene")
            elif key == ord("r"):
                app.trigger(frame, "read")
            elif key == 27:
                app.interrupt()
    finally:
        app.stop.set()
        cap.release()
        cv2.destroyAllWindows()
        pygame.mixer.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())

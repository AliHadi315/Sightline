"""Sightline web app (Gradio, Hugging Face Spaces free tier).

Imports vision / speech / memory unchanged. Frames are never written to disk here and
user keys live only for the request. When no key or no quota is available the app falls
back to three sample images with cached descriptions, so it always does something.

Designed for low vision: large type, high contrast, big buttons, keyboard shortcuts
(space = scene, r = read, esc = stop audio), spoken output that plays automatically.
"""
import datetime
import tempfile

import gradio as gr
from PIL import Image

import config
import speech
import vision
from memory import Memory
# Quota bookkeeping and the sample catalogue are shared with the JSON API.
from api.index import CACHED, SAMPLE_CAPTIONS, SAMPLE_NAMES, _daily_bump, _shared_key_dead, _today, demo_reason

HISTORY_LIMIT = 8


# ---- helpers -------------------------------------------------------------------------
def _speak(text: str) -> str | None:
    path = speech.synthesize(text, tempfile.mktemp(prefix="sightline_", suffix=".mp3"))
    return str(path) if path else None


def _banner(kind: str, text: str) -> str:
    icon = {"live": "🟢", "demo": "🟡", "error": "🔴", "info": "🔵"}[kind]
    return f'<div class="sl-banner sl-{kind}">{icon} {text}</div>'


def _usage(count: int) -> str:
    return f"Live descriptions used this session: <b>{count} / {config.SESSION_CAP}</b>."


def _history_md(history: list[dict]) -> str:
    if not history:
        return "_Nothing yet. Your last few descriptions will appear here so you can re-read them._"
    return "\n\n".join(f"**{h['time']} · {h['mode'].title()}** — {h['text']}" for h in reversed(history))


def _push(history: list[dict], mode: str, text: str) -> list[dict]:
    history = (history or []) + [{"time": datetime.datetime.now().strftime("%H:%M"), "mode": mode, "text": text}]
    return history[-HISTORY_LIMIT:]


def _sample_result(mode: str, name: str, reason: str | None, count: int, mem, history):
    entry = CACHED[name][mode]
    text = entry["description"]
    if reason:
        banner = _banner("demo", f"<b>Demo mode.</b> {reason} Playing the saved {mode} description of the sample "
                                 f"<i>{SAMPLE_CAPTIONS.get(name, name)}</i>. Add your own free key under Settings to use your camera.")
    else:
        banner = _banner("info", f"Saved {mode} description of the sample <i>{SAMPLE_CAPTIONS.get(name, name)}</i>. No API call made. {_usage(count)}")
    history = _push(history, f"sample {mode}", text)
    return text, _speak(text), banner, count, mem, history, _history_md(history)


# ---- event handlers ------------------------------------------------------------------
def describe(mode: str, image, user_key, count, mem, history):
    """Camera path. Returns (text, audio, banner, count, memory, history, history_md)."""
    try:
        user_key = (user_key or "").strip()
        mem = mem or Memory()
        history = history or []
        reason = demo_reason(user_key, count)
        if reason:
            return _sample_result(mode, SAMPLE_NAMES[0], reason, count, mem, history)
        if image is None:
            msg = "No photo yet. Tap the camera shutter first, then press the button again."
            return msg, _speak(msg), _banner("info", msg), count, mem, history, _history_md(history)

        try:
            result = vision.describe(vision.encode_jpeg(image), mode, mem.context(mode), api_key=user_key or None)
        except vision.QuotaExhausted as e:
            if user_key:
                msg = f"Your API key has used its daily free quota. {e}"
                return msg, None, _banner("error", msg), count, mem, history, _history_md(history)
            _shared_key_dead["today"] = _today()
            return _sample_result(mode, SAMPLE_NAMES[0], "The shared free-tier key just hit its daily quota.", count, mem, history)
        except vision.RateLimited as e:
            return str(e), _speak(str(e)), _banner("error", f"{e} {_usage(count)}"), count, mem, history, _history_md(history)
        except vision.VisionError as e:
            msg = f"Could not describe this photo. {e}"
            return msg, None, _banner("error", msg), count, mem, history, _history_md(history)

        count += 1
        if not user_key:
            _daily_bump()
        if mem.is_repeat(result, mode):
            msg = "No change since the last description."
            return msg, None, _banner("live", f"{msg} {_usage(count)}"), count, mem, history, _history_md(history)
        mem.remember(result, mode)
        text = result["description"]
        history = _push(history, mode, text)
        audio = _speak(text)
        note = "" if audio else " Spoken audio is unavailable right now (the speech service did not answer), so read the text below."
        return text, audio, _banner("live", f"Done in {result.get('latency_ms', 0) / 1000:.1f} s. {_usage(count)}{note}"), count, mem, history, _history_md(history)
    except Exception as e:  # noqa: BLE001 - a public page must never show a traceback
        msg = "Something went wrong on our side. Please try again."
        return msg, None, _banner("error", f"{msg} ({type(e).__name__})"), count, mem, history, _history_md(history or [])


def describe_scene(image, user_key, count, mem, history):
    return describe("scene", image, user_key, count, mem, history)


def describe_read(image, user_key, count, mem, history):
    return describe("read", image, user_key, count, mem, history)


def pick_sample(evt: gr.SelectData):
    return SAMPLE_NAMES[evt.index] if evt.index is not None else SAMPLE_NAMES[0]


def sample_scene(name, count, mem, history):
    return _sample_result("scene", name or SAMPLE_NAMES[0], None, count, mem or Memory(), history or [])


def sample_read(name, count, mem, history):
    return _sample_result("read", name or SAMPLE_NAMES[0], None, count, mem or Memory(), history or [])


def status_banner(user_key, count):
    reason = demo_reason((user_key or "").strip(), count)
    if reason:
        return _banner("demo", f"<b>Demo mode.</b> {reason} Try the sample images, or add your own free key under Settings.")
    return _banner("live", f"<b>Ready.</b> Take a photo, then press a button. {_usage(count)}")


# ---- page ----------------------------------------------------------------------------
CSS = """
.gradio-container { font-size: 19px !important; max-width: 1180px !important; margin: 0 auto !important; }
#hero { text-align: center; padding: 12px 0 4px; }
#hero h1 { font-size: 3rem; margin: 0 0 6px; letter-spacing: -0.02em; }
#hero p { font-size: 1.3rem; margin: 0; opacity: 0.85; }
.sl-banner { border-radius: 12px; padding: 14px 18px; font-size: 1.15rem; line-height: 1.5; margin: 10px 0 4px;
             border: 2px solid transparent; }
.sl-banner b, .sl-banner i, .sl-banner a { color: inherit !important; }
.sl-live  { background: #e6f7ec; border-color: #2e9e5b; color: #0f3d21; }
.sl-demo  { background: #fff5d6; border-color: #d9a400; color: #4a3600; }
.sl-error { background: #fde8e8; border-color: #d33; color: #5a0f0f; }
.sl-info  { background: #e8f0fe; border-color: #3b6fd6; color: #102a5c; }
button.sl-btn, .sl-btn button { min-height: 78px; font-size: 1.35rem !important; font-weight: 700; border-radius: 14px; }
#result textarea { font-size: 1.55rem !important; line-height: 1.5; font-weight: 500; }
#result label span { font-size: 1.05rem; }
.sl-steps { font-size: 1.1rem; line-height: 1.7; }
button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 4px solid #ffbf00 !important; outline-offset: 2px; }
.tab-nav button { font-size: 1.15rem !important; padding: 10px 18px !important; }
footer { display: none !important; }
"""

SHORTCUTS_JS = """
() => {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); const b = document.getElementById('btn-scene'); if (b) b.click(); }
    else if (e.key === 'r' || e.key === 'R') { const b = document.getElementById('btn-read'); if (b) b.click(); }
    else if (e.key === 'Escape') { document.querySelectorAll('audio').forEach(a => a.pause()); }
  });
}
"""

ABOUT = f"""
### Who this is for
Sightline is for people with low vision who want to know what is in front of them: what is on the
table, what a sign or label says, whether someone has walked into the room. Everything it finds is
read aloud, so the screen never has to be read.

### How it works
1. **Take a photo.** Tap the shutter button on the camera. Nothing is captured until you do.
2. **Press a button** or a key. *Describe the scene* (`space`) tells you what is there and where,
   using directions like "to your left" and "in front of you". *Read the text* (`r`) reads every
   word in view, in order, without summarising.
3. **Listen.** The description plays automatically. Press `esc` to stop it.

Sightline remembers your last three descriptions and only tells you what changed, so pressing the
button again on the same view gives "No change" instead of repeating itself.

### Privacy, always
- Capture is **manual only**. There is no motion detection, no timer, no background recording.
- Photos are held in memory only for the request and are **never stored**.
- People are described **only by presence and action** ("a person seated at a desk"). The model is
  told never to guess age, gender, race, emotion, or any other attribute, and this cannot be turned off.
- A key you paste under Settings is used for that request only and is not saved.

### Free-tier limits
This runs on Google AI Studio's free tier ({config.MODEL}), about 10 to 15 descriptions a minute and a
few hundred a day, shared by everyone using this page. Each browser session gets {config.SESSION_CAP}
live descriptions. When the shared quota runs out, the page switches to demo mode with three sample
images, and a yellow banner says so. Paste your own free key under Settings to keep going.

Speech comes from `edge-tts`, an unofficial client for Microsoft Edge's read-aloud voice. It may stop
working without notice; when it does, the text is still shown.
"""

with gr.Blocks(title="Sightline", css=CSS, theme=gr.themes.Soft(primary_hue="indigo", text_size=gr.themes.sizes.text_lg)) as demo:
    gr.HTML('<div id="hero"><h1>👁️ Sightline</h1><p>Point the camera at something and hear what is there.</p></div>')
    banner = gr.HTML()

    count = gr.State(0)
    memory = gr.State(None)
    history = gr.State([])
    selected_sample = gr.State(SAMPLE_NAMES[0])

    with gr.Tabs():
        with gr.Tab("📷 Use my camera"):
            with gr.Row(equal_height=False):
                with gr.Column(scale=5):
                    gr.Markdown('<div class="sl-steps"><b>1.</b> Tap the camera shutter to take a photo. &nbsp; <b>2.</b> Press a button below, or use the keys <kbd>space</kbd> / <kbd>r</kbd>.</div>')
                    image = gr.Image(sources=["webcam"], type="pil", label="Camera", height=420)
                    with gr.Row():
                        scene_btn = gr.Button("🔎 Describe the scene  (space)", variant="primary", elem_id="btn-scene", elem_classes="sl-btn")
                        read_btn = gr.Button("📖 Read the text  (r)", variant="secondary", elem_id="btn-read", elem_classes="sl-btn")
                with gr.Column(scale=5):
                    result = gr.Textbox(label="What Sightline sees", lines=6, elem_id="result", show_copy_button=True)
                    audio = gr.Audio(label="Spoken description (esc stops it)", type="filepath", autoplay=True)
                    with gr.Accordion("Recent descriptions", open=False):
                        history_md = gr.Markdown(_history_md([]))

        with gr.Tab("🖼️ Try a sample"):
            gr.Markdown('<div class="sl-steps">No camera handy? Pick a sample, then press a button. These play saved descriptions and never use the API.</div>')
            gallery = gr.Gallery(
                value=[(str(config.SAMPLES_DIR / n), SAMPLE_CAPTIONS.get(n, n)) for n in SAMPLE_NAMES],
                columns=3, height=260, allow_preview=False, label="Samples (click one to select)")
            with gr.Row():
                sample_scene_btn = gr.Button("🔎 Describe this sample", variant="primary", elem_classes="sl-btn")
                sample_read_btn = gr.Button("📖 Read the text in this sample", variant="secondary", elem_classes="sl-btn")

        with gr.Tab("⚙️ Settings"):
            gr.Markdown(
                '<div class="sl-steps">Sightline uses a shared free key with a daily limit. To use your own, get a free key at '
                '<a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a> '
                '(no billing needed) and paste it here. It is used only for your requests and is never stored.</div>')
            key = gr.Textbox(type="password", label="Your own Google AI Studio key (optional)", placeholder="Paste your key here")
            gr.Markdown(f"Model: `{config.MODEL}` · Voice: `{config.VOICE}` · Live descriptions per session: {config.SESSION_CAP}")

        with gr.Tab("ℹ️ About & privacy"):
            gr.Markdown(ABOUT)

    outputs = [result, audio, banner, count, memory, history, history_md]
    scene_btn.click(describe_scene, [image, key, count, memory, history], outputs)
    read_btn.click(describe_read, [image, key, count, memory, history], outputs)
    gallery.select(pick_sample, None, selected_sample)
    sample_scene_btn.click(sample_scene, [selected_sample, count, memory, history], outputs)
    sample_read_btn.click(sample_read, [selected_sample, count, memory, history], outputs)
    key.change(status_banner, [key, count], banner)
    demo.load(status_banner, [key, count], banner, js=SHORTCUTS_JS)

if __name__ == "__main__":
    demo.launch()

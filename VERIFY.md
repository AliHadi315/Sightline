# VERIFY.md

Run these in order from the project root with the virtual environment active.
Each step lists the exact command and what you should see.

## 1. Install

```bash
pip install -r requirements-desktop.txt
```

Expected: finishes without errors. `pip list` shows `google-genai`, `edge-tts`, `gradio`, `fastapi`,
`opencv-python`, `pygame-ce`, `Pillow`. (`pygame-ce` is the community build; it is imported as `pygame`.
`requirements.txt` alone is the slim set the Vercel function installs.)
If `import cv2` later fails with "The function is not implemented" when opening a window, an
`opencv-python-headless` install is shadowing the GUI build: `pip uninstall opencv-python opencv-python-headless`
then `pip install opencv-python`.

## 2. Configuration and key

```bash
copy .env.example .env
```

Edit `.env` and paste your free AI Studio key after `GEMINI_API_KEY=`. Then:

```bash
python -c "import config; print(config.MODEL, bool(config.GEMINI_API_KEY))"
```

Expected: `gemini-3.1-flash-lite True`. `False` means the key was not read; check `.env`.

## 3. Core boundary (no OpenCV / pygame / Gradio in the shared core)

```bash
python -c "import re,sys; bad=[f for f in ('vision.py','speech.py','memory.py') if re.search(r'^\s*(import|from)\s+(cv2|pygame|gradio)', open(f).read(), re.M)]; print('boundary ok' if not bad else 'VIOLATION: '+', '.join(bad))"
```

Expected: `boundary ok`.

## 4. Memory self-check (no network)

```bash
python memory.py
```

Expected: `memory ok`. Covers empty description = no change, near-duplicate suppression,
real change detection, per-mode tracking, and the three-item limit.

## 5. Sample and eval images

```bash
python make_samples.py
```

Expected: five `wrote ...` lines. `samples/` contains `desk.jpg`, `sign.jpg`, `kitchen.jpg`;
`evals/frames/` contains those plus `door.jpg` and `table.jpg`.

## 6. Speech (edge-tts, network required)

```bash
python speech.py "Sightline speech test. A desk is in front of you."
```

Expected: `wrote ...\debug\speech_test.mp3 (N bytes)` with N above 10000. Play the file to hear
the sentence. If you see `speech FAILED`, edge-tts could not reach Microsoft; the app still
works with text-only output. Try `pip install -U edge-tts`.

## 7. Gemini scene call

```bash
python vision.py samples/desk.jpg
```

Expected: `encoded N bytes` (N well under 100000) followed by JSON with `description`
(one or two sentences mentioning a laptop, mug, or notebook), an `objects` list,
`text_visible: null`, and `latency_ms`.

## 8. Gemini read call

```bash
python vision.py samples/sign.jpg read
```

Expected: `description` contains the text `EXIT`, `Meeting Room 2B`, `Please knock before entering`
and `Open 9:00 - 17:00`, in that order. `text_visible` holds the same text.

## 9. Log file

```bash
jq . logs/log.jsonl
```

(Without `jq`: `python -c "import json;[json.loads(l) for l in open('logs/log.jsonl')];print('valid jsonl')"`.)

Expected: one object per call from steps 7 and 8, each with `ts`, `mode`, `model`, `latency_ms`,
`tokens` (prompt/output/total), `raw`, and `error: null`.

## 10. Missing-key handling

```bash
python -c "import os; os.environ['GEMINI_API_KEY']=''; import config; config.GEMINI_API_KEY=None; import vision; print(vision.describe(b'', 'scene'))"
```

Expected: a `VisionError` traceback ending with
`No Gemini API key. Put GEMINI_API_KEY in .env (...)`. This proves the message is a plain
sentence the front ends can show. The front ends themselves never print tracebacks.

## 11. Desktop app

```bash
python main.py
```

Expected, in order:

1. Console prints `Sightline running with gemini-3.1-flash-lite. [space] scene ...`. A window opens with
   the live camera, `FPS`, `IDLE`, `mode: SCENE`, and the hotkey line at the bottom.
2. Press `space`. State goes `CAPTURING` → `THINKING` → `SPEAKING`, the full description appears in
   the black panel under the video and in the console, and you hear it spoken. `debug/last_frame.jpg` now exists and is at most 768 px on its long edge.
3. Watch the FPS number while `THINKING` is shown: it stays the same as when idle.
4. Press `space` again immediately: `Cooling down, wait 2.xs` appears and no call is made.
5. Press `space` again without moving anything after 3 s: `No change` appears and nothing is spoken.
6. Hold a page of text to the camera and press `r`: the text is read verbatim.
7. Press `esc` during speech: audio stops within a fraction of a second and state returns to `IDLE`.
8. Press `space` about 12 times in a row (waiting out each cooldown) to exceed the per-minute
   limit: the app retries, then says "Rate limit reached, try again in a moment".
9. Press `q`: the window closes, no traceback.

Error paths: run with the camera unplugged or in use → `Camera 0 is not available...` and exit.
Empty `.env` key → `No GEMINI_API_KEY found...` and exit. Disconnect the network and press `space`
→ `Network error. Check your internet connection.` on screen, the loop keeps running.

## 12. Web demo, live mode

```bash
python app.py
```

Open <http://127.0.0.1:7860>. Expected:

1. A green banner reads `Ready. Take a photo, then press a button. Live descriptions used this session: 0 / 10.`
   Four tabs are visible: *Use my camera*, *Try a sample*, *Settings*, *About & privacy*.
2. Allow the camera, click the shutter, press **Describe the scene**: the description appears in
   large text and plays automatically. The banner shows `Done in N s` and `1 / 10`.
3. With text in view, take a new photo and press **Read the text** (or the `r` key): the text is
   read verbatim.
4. Press `space` with the page focused: same as clicking **Describe the scene**. Press `esc` while
   audio plays: it stops.
5. Open *Recent descriptions* under the audio player: the results so far are listed, newest first.
6. On the *Try a sample* tab click the sign image, then **Read the text in this sample**: the saved
   text plays and a blue banner says `No API call made`.
7. Press **Describe the scene** eleven times on the camera tab: after the tenth the banner turns
   yellow with `Demo mode. This browser session has used its 10 live descriptions.` and a sample plays instead.

## 13. Web demo, demo mode (no key)

Stop the server, temporarily blank `GEMINI_API_KEY` in `.env`, and run `python app.py` again.

Expected: a yellow banner `Demo mode. No API key is configured on this server. Try the sample images ...`.
**Describe the scene** on the camera tab plays a saved sample description. Paste a key on the
*Settings* tab: the banner turns green with `Ready.` and the camera buttons make real calls.
Restore `.env` afterwards.

## 13b. Website (React site + API + Gradio on one port)

```bash
cd web && npm install && npm run build && cd ..
```

Expected: `tsc` reports no errors and Vite prints `✓ built` with `dist/index.html` and two files under
`dist/assets/`. Then:

```bash
python server.py
```

Open <http://127.0.0.1:7860>. Expected:

1. Landing page: amber "Open the app" button, headline "Point the camera. Hear what is there.", the
   feature grid, the three steps, the privacy band, the FAQ. No errors in the browser console.
2. `/app`: allow the camera, press **Describe the scene** (or `space`): the phase chip goes READY →
   CAPTURING → LOOKING → SPEAKING, the description appears in large serif text and is spoken. The
   status strip counts `1 / 10 live this session`.
3. Press `esc` while it speaks: audio stops. **Play again** replays it.
4. Click the sign sample, then **Read the text**: the saved text is read; the note says
   `No API call made`.
5. Deny or lack a camera: the viewfinder says "No camera. Upload a photo or pick a sample." and
   **Upload a photo instead** works with any JPEG.
6. <http://127.0.0.1:7860/gradio> shows the Gradio interface; <http://127.0.0.1:7860/api/docs> shows
   the API reference; an unknown path such as `/anything` falls back to the site.

API smoke test without a browser:

```bash
python -c "import server; from fastapi.testclient import TestClient as T; c=T(server.api); print(c.get('/api/status').json()['live'], c.post('/api/describe', data={'mode':'read','sample':'sign.jpg'}).json()['description'])"
```

Expected: `True EXIT. Meeting Room 2B. Please knock before entering. Open 9:00 - 17:00.`

## 13c. Vercel deployment

```bash
vercel
```

Expected: the CLI builds `web/` remotely, bundles `api/index.py` with `requirements.txt`, and prints a
preview URL. Opening it shows the landing page; `/app` works in demo mode until `GEMINI_API_KEY` is
added under *Settings → Environment Variables* and the project is redeployed (`vercel --prod`).
`<url>/api/status` returns JSON with `"live": true` once the key is set.

## 14. Eval harness

```bash
python run_evals.py --sleep 5
```

Expected: five lines of `PASS`/`FAIL` with descriptions, about 5 s apart, then a table and
`Score: N/5 frames = NN.N%  (model gemini-3.1-flash-lite)`, and `Details written to ...evals\results.json`.
With the synthetic frames, expect 4 or 5 of 5 to pass. Exit code is 0 only when all pass.

## 15. Privacy checks

```bash
python -c "import vision; p=vision.SYSTEM_INSTRUCTION.lower(); print('privacy ok' if all(w in p for w in ('never','age','gender','race','emotion')) else 'MISSING')"
```

Expected: `privacy ok`.

```bash
python -c "import re; s=open('main.py').read()+open('app.py').read(); print('manual-trigger ok' if not re.search(r'absdiff|Timer|schedule|every\(|interval', s) else 'AUTO-CAPTURE FOUND')"
```

Expected: `manual-trigger ok`. After a full desktop session, `debug/` holds exactly one
`last_frame.jpg` and one `last_speech.mp3`, no numbered frames.

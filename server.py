"""Sightline local server: the JSON API (api/index.py), the built site in web/dist, and the Gradio UI at /gradio.

    python server.py            # http://127.0.0.1:7860

On Vercel the same API runs as a serverless function and the site is served statically; this file
is only for running everything on one port locally.
"""
import json
import os

import gradio as gr
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

import app as gradio_app
import config
from api.index import app as api

DIST = config.ROOT / "web" / "dist"

# Apply the same security headers Vercel sends (single source of truth: vercel.json), so the
# Content-Security-Policy can be tested locally before a deploy.
_vercel = json.loads((config.ROOT / "vercel.json").read_text(encoding="utf-8"))
SECURITY_HEADERS = {h["key"]: h["value"] for block in _vercel.get("headers", []) if block["source"] == "/(.*)" for h in block["headers"]}


@api.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    if not request.url.path.startswith("/gradio"):  # Gradio needs inline scripts the CSP does not allow
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)
    return response


api = gr.mount_gradio_app(api, gradio_app.demo, path="/gradio")

if (DIST / "assets").exists():
    api.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@api.get("/{path:path}", include_in_schema=False)
def site(path: str):
    """Serve the built site with SPA fallback; if it is not built, point at the Gradio UI."""
    candidate = DIST / path if path else DIST / "index.html"
    if path and candidate.is_file() and DIST in candidate.resolve().parents:
        return FileResponse(candidate)
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>Sightline</h1><p>The website is not built yet. Run <code>cd web && npm run build</code>, "
                        "or use the <a href='/gradio'>Gradio interface</a>.</p>")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))

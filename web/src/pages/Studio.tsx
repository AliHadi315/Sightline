import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Eye, BookOpenText, Square, Play, KeyRound, Images, Upload, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { describe, getSamples, getStatus, loadKey, saveKey, speak, type Described, type Mode, type Observation, type Sample, type Status } from "@/lib/api";

type Phase = "idle" | "capturing" | "thinking" | "speaking";

interface HistoryItem { time: string; mode: string; text: string }

const MAX_EDGE = 1024;
const HISTORY_LIMIT = 8;
const MEMORY_LIMIT = 3;

export default function Studio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<"pending" | "on" | "off">("pending");
  const [uploaded, setUploaded] = useState<{ url: string; blob: Blob } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<Status | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sample, setSample] = useState<string | null>(null);
  const [ownKey, setOwnKey] = useState(loadKey);
  const [memory, setMemory] = useState<Observation[]>([]); // last few descriptions, sent back so the model reports only changes
  const [result, setResult] = useState<Described | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState("");
  const [voice, setVoice] = useState<"server" | "browser" | null>(null);
  const busy = phase === "capturing" || phase === "thinking";
  const [elapsed, setElapsed] = useState(0);
  const hasKey = ownKey.trim().length > 0;

  // elapsed-seconds display while waiting for the model (display only; never triggers a capture)
  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 10) / 100), 100);
    return () => window.clearInterval(id);
  }, [busy]);

  const refreshStatus = useCallback(async (key = ownKey) => {
    try { setStatus(await getStatus(!!key.trim())); } catch { setStatus(null); }
  }, [ownKey]);

  // camera: the live view stays in this browser; one frame is sent only when a button is pressed
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCamera("on");
      } catch {
        setCamera("off");
      }
    })();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => { refreshStatus(); getSamples().then(setSamples).catch(() => setSamples([])); }, [refreshStatus]);

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    window.speechSynthesis?.cancel();
    setPhase("idle");
  }, []);

  // last resort: the browser's own voice, which needs no network and cannot go down
  const speakInBrowser = useCallback((text: string): boolean => {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.onend = () => setPhase("idle");
    u.onerror = () => setPhase("idle");
    setPhase("speaking");
    synth.speak(u);
    return true;
  }, []);

  const playText = useCallback(async (text: string): Promise<"server" | "browser" | null> => {
    setLastText(text);
    setPhase("speaking");
    const url = await speak(text, ownKey.trim() || undefined);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(url);
    if (url && audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => setPhase("idle"));
      setVoice("server");
      return "server";
    }
    const ok = speakInBrowser(text);
    setVoice(ok ? "browser" : null);
    if (!ok) setPhase("idle");
    return ok ? "browser" : null;
  }, [audioUrl, ownKey, speakInBrowser]);

  const playAgain = useCallback(() => {
    if (voice === "server" && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); setPhase("speaking"); }
    else if (lastText) speakInBrowser(lastText);
  }, [voice, lastText, speakInBrowser]);

  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    if (uploaded) return uploaded.blob;
    const v = videoRef.current;
    if (!v || camera !== "on" || !v.videoWidth) return null;
    const scale = Math.min(1, MAX_EDGE / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.85));
  }, [camera, uploaded]);

  const run = useCallback(async (mode: Mode) => {
    if (busy) return;
    stopAudio();
    setError(null);
    if (!sample && !hasKey) {
      setError("Add your free Gemini key below to describe your own camera. The samples work without one.");
      keyRef.current?.focus();
      return;
    }
    setPhase("capturing");
    try {
      let blob: Blob | undefined;
      if (!sample) {
        const b = await captureBlob();
        if (!b) {
          setError(camera === "off" ? "No camera available. Upload a photo or pick a sample below." : "The camera is not ready yet. Try again in a moment.");
          setPhase("idle");
          return;
        }
        blob = b;
      }
      setPhase("thinking");
      const r = await describe({ mode, blob, sample: sample ?? undefined, key: ownKey.trim() || undefined, history: memory });
      setResult(r);
      if (r.source === "live") {
        setMemory((m) => {
          const kept = m.filter((o) => o.mode === mode).slice(-(MEMORY_LIMIT - 1));
          return [...m.filter((o) => o.mode !== mode), ...kept, { mode, description: r.description, objects: r.objects ?? [] }];
        });
      }
      if (r.description) {
        setHistory((h) => [{ time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), mode: r.source === "sample" ? `sample ${mode}` : mode, text: r.description }, ...h].slice(0, HISTORY_LIMIT));
      }
      if (r.description && r.source !== "repeat") {
        const used = await playText(r.description);
        if (used === "browser") setResult({ ...r, message: r.message + " Spoken with your device's own voice because the speech service is down." });
        if (used === null) setResult({ ...r, message: r.message + " No voice is available right now, so read the text." });
      } else {
        setPhase("idle");
      }
    } catch {
      setError("Could not reach the server. Check the connection and try again.");
      setPhase("idle");
    }
  }, [busy, sample, hasKey, captureBlob, camera, ownKey, memory, playText, stopAudio]);

  // keyboard: space = scene, r = read, esc = stop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "Space") { e.preventDefault(); run("scene"); }
      else if (e.key === "r" || e.key === "R") run("read");
      else if (e.key === "Escape") stopAudio();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, stopAudio]);

  const onUpload = (f: File | undefined) => {
    if (!f) return;
    setSample(null);
    setUploaded({ url: URL.createObjectURL(f), blob: f });
  };

  const onKeyChange = (value: string) => {
    setOwnKey(value);
    saveKey(value);
    refreshStatus(value);
  };

  const phaseLabel: Record<Phase, string> = { idle: "Ready", capturing: "Capturing", thinking: "Looking", speaking: "Speaking" };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 md:py-12">
      {/* before you start */}
      <section aria-label="Before you start" className="mb-6 grid gap-4 rounded-2xl border border-cyan/30 bg-cyan-soft p-5 md:grid-cols-[auto_1fr] md:items-start">
        <ShieldCheck className="h-8 w-8 text-cyan" aria-hidden />
        <div className="space-y-3">
          <p className="text-lg leading-relaxed">
            <strong>This page uses your camera, and nothing is saved.</strong> The live view stays in your browser.
            One photo is sent to Google's Gemini only when you press a button, and it is discarded right after.
            No photos, descriptions, or keys are stored on our server.
          </p>
          <p className="text-lg leading-relaxed">
            <strong>Bring your own free Gemini key.</strong> There is no shared key on this site. Get one in a minute at{" "}
            <a className="text-cream underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>{" "}
            (no billing needed), paste it below, and it is sent only with your own requests. It stays in this tab and is forgotten when you close it.
          </p>
          <label className="block">
            <span className="readout mb-1 block">Your Gemini API key</span>
            <input
              ref={keyRef}
              type="password"
              value={ownKey}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder="Paste your free Google AI Studio key"
              autoComplete="off"
              className="w-full max-w-xl rounded-xl bg-ink px-4 py-3 text-lg hairline placeholder:text-muted"
            />
          </label>
        </div>
      </section>

      {/* status */}
      <div
        role="status"
        className={cn(
          "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-lg",
          hasKey ? "border border-signal/30 bg-signal-soft" : "border border-amber/40 bg-amber-soft",
        )}
      >
        <span>
          {hasKey ? (
            <><strong>Live.</strong> Press a button or use <kbd className="kbd">space</kbd> / <kbd className="kbd">r</kbd>.</>
          ) : (
            <><strong>Demo mode.</strong> Samples work now; add your key above to describe your own camera.</>
          )}
        </span>
        {status && <span className="readout">{hasKey ? "your key" : "no key"} · {result?.model ?? status.model}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* left: viewfinder + buttons */}
        <section aria-label="Camera" className="space-y-4">
          <div className="card brackets relative aspect-[4/3] overflow-hidden bg-[#0a0e13]">
            <span className="br" />
            {busy && <span className="scanline animate-scan" aria-hidden />}
            <video ref={videoRef} playsInline muted className={cn("h-full w-full object-cover", (camera !== "on" || uploaded || sample) && "hidden")} />
            {uploaded && !sample && <img src={uploaded.url} alt="Uploaded photo" className="h-full w-full object-contain" />}
            {sample && <img src={samples.find((s) => s.name === sample)?.image} alt={`Sample: ${sample}`} className="h-full w-full object-contain" />}
            {camera !== "on" && !uploaded && !sample && (
              <div className="absolute inset-0 grid place-items-center p-8 text-center text-muted">
                {camera === "pending" ? (
                  <span className="flex items-center gap-3 text-xl"><Loader2 className="h-6 w-6 animate-spin" /> Starting the camera…</span>
                ) : (
                  <span className="flex flex-col items-center gap-3 text-xl"><CameraOff className="h-10 w-10" /> No camera. Upload a photo or pick a sample.</span>
                )}
              </div>
            )}
            {/* HUD readout */}
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-md bg-ink/85 px-3 py-1.5 font-mono text-xs font-bold tracking-[0.14em]">
              <span className="relative grid h-3 w-3 place-items-center">
                {phase !== "idle" && <span className="absolute h-3 w-3 rounded-full bg-cyan animate-pulse_ring" />}
                <span className={cn("h-2.5 w-2.5 rounded-full", phase === "idle" ? "bg-signal" : "bg-cyan")} />
              </span>
              {phaseLabel[phase].toUpperCase()}
              {busy && <span className="font-normal text-muted">{elapsed.toFixed(1).padStart(4, "0")}s</span>}
            </div>
            <div className="readout absolute bottom-5 left-5 z-10 rounded-md bg-ink/85 px-3 py-1" aria-hidden>
              {sample ? "sample" : uploaded ? "upload" : camera === "on" ? "camera" : "no input"} · {result?.objects?.length ?? 0} objects
            </div>
            {(uploaded || sample) && (
              <button
                className="absolute right-4 top-4 btn btn-ghost bg-ink/85 px-4 py-1.5 text-sm"
                onClick={() => { setUploaded(null); setSample(null); }}
              >
                <Camera className="h-4 w-4" /> Back to camera
              </button>
            )}
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <button className="btn btn-cyan btn-lg" onClick={() => run("scene")} disabled={busy} aria-keyshortcuts="Space">
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Eye className="h-7 w-7" />} Describe the scene
              <kbd className="kbd ml-1 text-ink/70 border-ink/20 bg-ink/10">space</kbd>
            </button>
            <button className="btn btn-signal btn-lg" onClick={() => run("read")} disabled={busy} aria-keyshortcuts="r">
              <BookOpenText className="h-7 w-7" /> Read the text
              <kbd className="kbd ml-1 text-ink/70 border-ink/20 bg-ink/10">r</kbd>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-ghost px-5 py-3 text-base" onClick={stopAudio} aria-keyshortcuts="Escape">
              <Square className="h-4 w-4" /> Stop speaking <kbd className="kbd ml-1">esc</kbd>
            </button>
            <button className="btn btn-ghost px-5 py-3 text-base" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload a photo instead
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
          </div>
        </section>

        {/* right: result */}
        <section aria-label="Result" className="space-y-4">
          <div className="card min-h-[280px] p-7">
            <div className="eyebrow mb-3">What Sightline sees</div>
            <p aria-live="polite" className="font-display text-[1.7rem] font-semibold leading-snug text-cream md:text-[2rem]">
              {result?.description || (error ? "" : "Press a button to hear what is in front of you.")}
            </p>
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-soft px-4 py-3 text-lg text-rose">{error}</p>}
            {result && (
              <p className={cn("mt-4 text-base", result.source === "error" ? "text-rose" : "text-muted")}>{result.message}</p>
            )}
            {result?.objects && result.objects.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Objects">
                {result.objects.map((o, i) => (
                  <li key={o} className="animate-box-in rounded-md border border-cyan/40 bg-cyan-soft px-2.5 py-1 font-mono text-xs text-cyan" style={{ animationDelay: `${i * 70}ms` }}>{o}</li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex items-center gap-3">
              <audio ref={audioRef} onEnded={() => setPhase("idle")} onPause={() => phase === "speaking" && setPhase("idle")} className="hidden" />
              <button className="btn btn-ghost px-5 py-3 text-base" disabled={!lastText} onClick={playAgain}>
                <Play className="h-4 w-4" /> Play again
              </button>
              {result?.latency_ms != null && <span className="text-sm text-muted">{(result.latency_ms / 1000).toFixed(1)} s</span>}
            </div>
          </div>

          <details className="card p-6" open={history.length > 0}>
            <summary className="cursor-pointer font-display text-xl font-bold">Recent descriptions</summary>
            <ol className="mt-4 space-y-3">
              {history.length === 0 && <li className="text-muted">Nothing yet.</li>}
              {history.map((h, i) => (
                <li key={i} className="border-l-2 border-cyan/50 pl-4">
                  <div className="text-xs uppercase tracking-widest text-muted">{h.time} · {h.mode}</div>
                  <div className="text-lg">{h.text}</div>
                </li>
              ))}
            </ol>
          </details>
        </section>
      </div>

      {/* samples */}
      <section aria-label="Samples" className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <Images className="h-6 w-6 text-cyan" aria-hidden />
          <h2 className="font-display text-2xl font-bold">Try a sample</h2>
          <span className="text-muted">Saved descriptions, no key and no API call needed. Pick one, then press a button.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {samples.map((s) => (
            <button
              key={s.name}
              onClick={() => { setSample(sample === s.name ? null : s.name); setUploaded(null); }}
              aria-pressed={sample === s.name}
              className={cn("card overflow-hidden text-left transition-transform hover:-translate-y-0.5", sample === s.name && "ring-4 ring-cyan")}
            >
              <img src={s.image} alt={s.caption} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4 text-lg">{s.caption}</div>
            </button>
          ))}
        </div>
      </section>

      <p className="mt-10 flex items-center gap-2 text-muted">
        <KeyRound className="h-4 w-4 text-signal" aria-hidden />
        Your key is used only for your own requests and never leaves this tab except inside them.
      </p>
    </div>
  );
}

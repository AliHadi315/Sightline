import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Eye, BookOpenText, Square, Play, KeyRound, Images, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { describe, getSamples, getStatus, speak, type Described, type Mode, type Observation, type Sample, type Status } from "@/lib/api";

type Phase = "idle" | "capturing" | "thinking" | "speaking";

interface HistoryItem { time: string; mode: string; text: string }

const MAX_EDGE = 1024;
const HISTORY_LIMIT = 8;
const MEMORY_LIMIT = 3;

export default function Studio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<"pending" | "on" | "off">("pending");
  const [uploaded, setUploaded] = useState<{ url: string; blob: Blob } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<Status | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sample, setSample] = useState<string | null>(null);
  const [ownKey, setOwnKey] = useState("");
  const [count, setCount] = useState(0);                 // live descriptions used this session (the API is stateless)
  const [memory, setMemory] = useState<Observation[]>([]); // last few descriptions, sent back so the model reports only changes
  const [result, setResult] = useState<Described | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = phase === "capturing" || phase === "thinking";
  const [elapsed, setElapsed] = useState(0);

  // elapsed-seconds display while waiting for the model (display only; never triggers a capture)
  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 10) / 100), 100);
    return () => window.clearInterval(id);
  }, [busy]);

  const refreshStatus = useCallback(async (key = ownKey, n = count) => {
    try { setStatus(await getStatus(!!key.trim(), n)); } catch { setStatus(null); }
  }, [ownKey, count]);

  // camera
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
    setPhase("idle");
  }, []);

  const playText = useCallback(async (text: string) => {
    setPhase("speaking");
    const url = await speak(text);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(url);
    if (url && audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => setPhase("idle"));
    } else {
      setPhase("idle");
    }
    return !!url;
  }, [audioUrl]);

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
      const r = await describe({ mode, blob, sample: sample ?? undefined, key: ownKey.trim() || undefined, count, history: memory });
      setResult(r);
      const nextCount = Math.max(count, r.count);
      setCount(nextCount);
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
        const ok = await playText(r.description);
        if (!ok) setResult({ ...r, message: r.message + " Spoken audio is unavailable right now, so read the text." });
      } else {
        setPhase("idle");
      }
      refreshStatus(ownKey, nextCount);
    } catch {
      setError("Could not reach the server. Check the connection and try again.");
      setPhase("idle");
    }
  }, [busy, sample, captureBlob, camera, ownKey, count, memory, playText, refreshStatus, stopAudio]);

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

  const demoReason = status?.demo_reason ?? null;
  const phaseLabel: Record<Phase, string> = { idle: "Ready", capturing: "Capturing", thinking: "Looking", speaking: "Speaking" };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 md:py-12">
      {/* status */}
      <div
        role="status"
        className={cn(
          "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-lg",
          demoReason ? "border border-amber/40 bg-amber-soft" : "border border-teal/30 bg-teal-soft",
        )}
      >
        <span>
          {demoReason ? (
            <><strong>Demo mode.</strong> {demoReason} Samples still work, or add your own key in Settings.</>
          ) : (
            <><strong>Live.</strong> Press a button or use <kbd className="kbd">space</kbd> / <kbd className="kbd">r</kbd>.</>
          )}
        </span>
        {status && (
          <span className="text-muted">
            {count} / {status.session_cap} live this session · {result?.model ?? status.model}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* left: viewfinder + buttons */}
        <section aria-label="Camera" className="space-y-4">
          <div className="card relative aspect-[4/3] overflow-hidden bg-[#121110]">
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
            {/* phase chip */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/85 px-4 py-1.5 text-sm font-bold">
              <span className="relative grid h-3 w-3 place-items-center">
                {phase !== "idle" && <span className="absolute h-3 w-3 rounded-full bg-amber animate-pulse_ring" />}
                <span className={cn("h-2.5 w-2.5 rounded-full", phase === "idle" ? "bg-teal" : "bg-amber")} />
              </span>
              {phaseLabel[phase].toUpperCase()}
              {busy && <span className="font-normal text-muted">{elapsed.toFixed(1)} s</span>}
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
            <button className="btn btn-amber btn-lg" onClick={() => run("scene")} disabled={busy} aria-keyshortcuts="Space">
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Eye className="h-7 w-7" />} Describe the scene
              <kbd className="kbd ml-1 text-ink/70 border-ink/20 bg-ink/10">space</kbd>
            </button>
            <button className="btn btn-teal btn-lg" onClick={() => run("read")} disabled={busy} aria-keyshortcuts="r">
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
            <p aria-live="polite" className="font-display text-[1.7rem] leading-snug text-cream md:text-[2rem]">
              {result?.description || (error ? "" : "Press a button to hear what is in front of you.")}
            </p>
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-soft px-4 py-3 text-lg text-rose">{error}</p>}
            {result && (
              <p className={cn("mt-4 text-base", result.source === "error" ? "text-rose" : "text-muted")}>{result.message}</p>
            )}
            {result?.objects && result.objects.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Objects">
                {result.objects.map((o) => (
                  <li key={o} className="rounded-full hairline px-3 py-1 text-sm text-muted">{o}</li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex items-center gap-3">
              <audio ref={audioRef} onEnded={() => setPhase("idle")} onPause={() => phase === "speaking" && setPhase("idle")} className="hidden" />
              <button className="btn btn-ghost px-5 py-3 text-base" disabled={!audioUrl} onClick={() => { audioRef.current?.play(); setPhase("speaking"); }}>
                <Play className="h-4 w-4" /> Play again
              </button>
              {result?.latency_ms != null && <span className="text-sm text-muted">{(result.latency_ms / 1000).toFixed(1)} s</span>}
            </div>
          </div>

          <details className="card p-6" open={history.length > 0}>
            <summary className="cursor-pointer font-display text-xl font-medium">Recent descriptions</summary>
            <ol className="mt-4 space-y-3">
              {history.length === 0 && <li className="text-muted">Nothing yet.</li>}
              {history.map((h, i) => (
                <li key={i} className="border-l-2 border-amber/50 pl-4">
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
          <Images className="h-6 w-6 text-amber" aria-hidden />
          <h2 className="font-display text-2xl font-medium">Try a sample</h2>
          <span className="text-muted">Saved descriptions, no API call. Pick one, then press a button.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {samples.map((s) => (
            <button
              key={s.name}
              onClick={() => { setSample(sample === s.name ? null : s.name); setUploaded(null); }}
              aria-pressed={sample === s.name}
              className={cn("card overflow-hidden text-left transition-transform hover:-translate-y-0.5", sample === s.name && "ring-4 ring-amber")}
            >
              <img src={s.image} alt={s.caption} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4 text-lg">{s.caption}</div>
            </button>
          ))}
        </div>
      </section>

      {/* settings */}
      <section aria-label="Settings" className="mt-10 card p-6">
        <div className="mb-3 flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-teal" aria-hidden />
          <h2 className="font-display text-2xl font-medium">Use your own free key</h2>
        </div>
        <p className="mb-4 max-w-3xl text-muted">
          The shared key has a daily limit. A free key from{" "}
          <a className="text-cream underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>{" "}
          removes that limit for you. It is sent only with your requests and is never stored, not even in this browser.
        </p>
        <input
          type="password"
          value={ownKey}
          onChange={(e) => { setOwnKey(e.target.value); refreshStatus(e.target.value, count); }}
          placeholder="Paste your Google AI Studio key"
          aria-label="Your own Google AI Studio key"
          className="w-full max-w-xl rounded-xl bg-raised px-4 py-3 text-lg hairline placeholder:text-muted"
        />
      </section>
    </div>
  );
}

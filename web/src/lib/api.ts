export type Mode = "scene" | "read";

export interface Status {
  model: string;
  voice: string;
  live: boolean;
  demo_reason: string | null;
}

export interface Described {
  description: string;
  objects?: string[];
  text_visible?: string | null;
  latency_ms?: number;
  model?: string;
  mode: Mode;
  source: "live" | "sample" | "repeat" | "error";
  sample?: string;
  demo_reason?: string | null;
  message: string;
}

export interface Sample {
  name: string;
  caption: string;
  image: string;
  scene: { description: string; objects: string[]; text_visible: string | null };
  read: { description: string; objects: string[]; text_visible: string | null };
}

/** What the browser remembers for the model: its own last few descriptions (the API is stateless). */
export interface Observation {
  mode: Mode;
  description: string;
  objects: string[];
}

const KEY_STORAGE = "sightline_gemini_key";

/** The visitor's own key lives in session storage: it survives a reload and is gone when the tab closes. */
export function loadKey(): string {
  try { return sessionStorage.getItem(KEY_STORAGE) ?? ""; } catch { return ""; }
}

export function saveKey(key: string): void {
  try {
    if (key.trim()) sessionStorage.setItem(KEY_STORAGE, key.trim());
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch { /* storage blocked: the key still works for this page load */ }
}

/** Ask the server whether Google accepts a key. valid: true | false | null (could not check). */
export async function checkKey(key: string): Promise<{ valid: boolean | null; message: string }> {
  const form = new FormData();
  form.append("key", key);
  try {
    const r = await fetch("/api/check_key", { method: "POST", body: form });
    if (!r.ok) return { valid: null, message: "Could not check the key right now." };
    return r.json();
  } catch {
    return { valid: null, message: "Could not check the key right now." };
  }
}

export async function getStatus(ownKey: boolean): Promise<Status> {
  const r = await fetch(`/api/status?own_key=${ownKey ? 1 : 0}`);
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

export async function getSamples(): Promise<Sample[]> {
  const r = await fetch("/api/samples");
  if (!r.ok) throw new Error(`samples ${r.status}`);
  return r.json();
}

export async function describe(opts: { mode: Mode; blob?: Blob; sample?: string; key?: string; history: Observation[] }): Promise<Described> {
  const form = new FormData();
  form.append("mode", opts.mode);
  form.append("key", opts.key ?? "");
  form.append("sample", opts.sample ?? "");
  form.append("history", JSON.stringify(opts.history));
  if (opts.blob) form.append("image", opts.blob, "frame.jpg");
  const r = await fetch("/api/describe", { method: "POST", body: form });
  if (r.status === 429) {
    return { source: "error", mode: opts.mode, description: "", message: "Too many requests from your connection. Wait a minute and try again." };
  }
  if (!r.ok) throw new Error(`describe ${r.status}`);
  return r.json();
}

/** Fetch spoken audio for a text (mp3 from edge-tts or WAV from Gemini TTS); object URL to play, or null if both failed. */
export async function speak(text: string, key?: string): Promise<string | null> {
  const form = new FormData();
  form.append("text", text);
  form.append("key", key ?? "");
  try {
    const r = await fetch("/api/speak", { method: "POST", body: form });
    if (!r.ok) return null;
    const blob = await r.blob();
    return blob.size > 0 ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

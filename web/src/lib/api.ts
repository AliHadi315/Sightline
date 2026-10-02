export type Mode = "scene" | "read";

export interface Status {
  model: string;
  voice: string;
  session_cap: number;
  count: number;
  daily_used: number;
  daily_cap: number;
  shared_key: boolean;
  live: boolean;
  demo_reason: string | null;
}

export interface Described {
  description: string;
  objects?: string[];
  text_visible?: string | null;
  latency_ms?: number;
  model?: string;
  count: number;
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

export async function getStatus(ownKey: boolean, count: number): Promise<Status> {
  const r = await fetch(`/api/status?own_key=${ownKey ? 1 : 0}&count=${count}`);
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

export async function getSamples(): Promise<Sample[]> {
  const r = await fetch("/api/samples");
  if (!r.ok) throw new Error(`samples ${r.status}`);
  return r.json();
}

export async function describe(opts: {
  mode: Mode;
  blob?: Blob;
  sample?: string;
  key?: string;
  count: number;
  history: Observation[];
}): Promise<Described> {
  const form = new FormData();
  form.append("mode", opts.mode);
  form.append("key", opts.key ?? "");
  form.append("sample", opts.sample ?? "");
  form.append("count", String(opts.count));
  form.append("history", JSON.stringify(opts.history));
  if (opts.blob) form.append("image", opts.blob, "frame.jpg");
  const r = await fetch("/api/describe", { method: "POST", body: form });
  if (!r.ok) throw new Error(`describe ${r.status}`);
  return r.json();
}

/** Fetch the spoken mp3 for a text; returns an object URL to play, or null if speech failed. */
export async function speak(text: string): Promise<string | null> {
  const form = new FormData();
  form.append("text", text);
  try {
    const r = await fetch("/api/speak", { method: "POST", body: form });
    if (!r.ok) return null;
    const blob = await r.blob();
    return blob.size > 0 ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

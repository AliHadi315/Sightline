import { Hand, ShieldOff, Trash2, KeyRound } from "lucide-react";

const rules = [
  {
    icon: Hand,
    title: "Capture is manual only",
    text: "A frame is sent only when you press a key or a button. There is no motion detection, no timer, and no automatic capture, in the desktop app or on this site. The live camera view never leaves your browser.",
  },
  {
    icon: ShieldOff,
    title: "No demographic inference",
    text: "The model is instructed never to state or guess a person's age, gender, race, ethnicity, emotional state, health, or any other attribute. People are described only by presence and action, such as “a person seated at a desk”. This is part of the system prompt and cannot be turned off.",
  },
  {
    icon: Trash2,
    title: "No frame archive",
    text: "This site stores no uploaded frames. The photo is held in memory for the request and discarded. The desktop app keeps frames in memory and writes a single debug file, debug/last_frame.jpg, that is overwritten on every capture.",
  },
  {
    icon: KeyRound,
    title: "Your key is yours",
    text: "A key you paste in Settings is sent only with your own requests and is kept nowhere, not on the server and not in your browser's storage. Reload the page and it is gone.",
  },
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 md:py-24">
      <p className="eyebrow mb-3">Privacy rules</p>
      <h1 className="font-display text-display-lg font-medium">Non-negotiable, in both front ends.</h1>
      <p className="mt-4 max-w-2xl text-xl text-muted">
        Sightline looks at the world on someone's behalf. That trust is only worth something if the tool never keeps,
        guesses, or watches more than it was asked to.
      </p>
      <ol className="mt-12 space-y-5">
        {rules.map((r) => (
          <li key={r.title} className="card grid gap-5 p-7 md:grid-cols-[auto_1fr]">
            <r.icon className="h-10 w-10 text-amber" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-medium">{r.title}</h2>
              <p className="mt-2 text-lg leading-relaxed text-muted">{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 rounded-2xl bg-surface p-7 hairline">
        <h2 className="font-display text-2xl font-medium">What does leave your device</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-lg text-muted">
          <li>The single frame you captured, sent to Google's Gemini API through the server, for that one request.</li>
          <li>The description text, sent to Microsoft's Edge read-aloud service through the unofficial edge-tts client to make the audio.</li>
          <li>One log line per call on the server (timestamp, mode, latency, token counts, the model's text reply, any error). No image is logged.</li>
        </ul>
      </div>
    </div>
  );
}

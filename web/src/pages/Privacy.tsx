import { Hand, ShieldOff, Trash2, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/lib/meta";

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
    text: "There is no shared key on this site. The free Gemini key you paste on the app page is sent only inside your own requests, is never stored on the server, and lives only in this tab's session storage: it survives a reload and is gone when the tab closes.",
  },
];

export default function Privacy() {
  usePageMeta("Privacy", "Sightline's privacy rules: manual capture only, no demographic inference, nothing stored, no cookies, your own key.");
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 md:py-24">
      <p className="eyebrow mb-3">Privacy rules</p>
      <h1 className="font-display text-display-lg font-bold">Non-negotiable, in both front ends.</h1>
      <p className="mt-4 max-w-2xl text-xl text-muted">
        Sightline looks at the world on someone's behalf. That trust is only worth something if the tool never keeps,
        guesses, or watches more than it was asked to.
      </p>
      <ol className="mt-12 space-y-5">
        {rules.map((r) => (
          <li key={r.title} className="card grid gap-5 p-7 md:grid-cols-[auto_1fr]">
            <r.icon className="h-10 w-10 text-cyan" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-bold">{r.title}</h2>
              <p className="mt-2 text-lg leading-relaxed text-muted">{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 rounded-2xl bg-surface p-7 hairline">
        <h2 className="font-display text-2xl font-bold">What does leave your device</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-lg text-muted">
          <li>The single frame you captured, sent to Google's Gemini API through the server, for that one request.</li>
          <li>The description text, sent to Microsoft's Edge read-aloud service through the unofficial edge-tts client to make the audio.</li>
          <li>Nothing else. This public site keeps no log at all. When you run Sightline on your own machine, one log line per call is written locally (timestamp, mode, latency, token counts, the model's text reply, any error); no image is ever logged.</li>
        </ul>
      </div>
      <section aria-labelledby="policy" className="mt-12 space-y-4 text-lg leading-relaxed text-muted [&_strong]:text-cream">
        <h2 id="policy" className="font-display text-2xl font-bold text-cream">Privacy policy</h2>
        <p><strong>Who runs this.</strong> Sightline is a personal open-source project by Ali Hadi Meselmani. Questions about privacy can be raised on the project's <a className="text-cream underline" href="https://github.com/AliHadi315/Sightline" target="_blank" rel="noreferrer">GitHub page</a>.</p>
        <p><strong>What we collect.</strong> Nothing. No account, no sign-up, no analytics, no tracking pixels, no advertising, no cookies. The site sets no cookies at all, which is why there is no cookie banner. The only thing stored in your browser is the Gemini key you choose to paste, in this tab's session storage, so you do not have to paste it again after a reload; it is deleted when the tab closes.</p>
        <p><strong>Who else sees your data.</strong> A captured frame goes to Google (Gemini API) under your own key and Google's terms. Description text may go to Microsoft (Edge read-aloud) to be spoken. The site is hosted on Vercel, which, like any host, sees connection metadata such as your IP address and may keep short-lived access logs for operating the service. Sightline itself keeps none of it.</p>
        <p><strong>Rate limiting.</strong> To keep the free service available, the server counts requests per connection for one minute in memory and refuses excess requests. The counter holds no personal data beyond the IP address and is discarded within a minute.</p>
        <p><strong>Your rights.</strong> Because nothing is retained, there is nothing to export or delete on our side. To stop Google from having your key, revoke it in Google AI Studio.</p>
        <p>Last updated 29 October 2026. See also the <Link to="/terms" className="text-cream underline">terms of use</Link>.</p>
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import { usePageMeta } from "@/lib/meta";

const sections = [
  {
    title: "What Sightline is, and is not",
    text: "Sightline is a free, open-source tool that describes what a camera sees and reads visible text aloud. It is an aid, not a safety, medical or mobility device. Descriptions come from an AI model and can be wrong, incomplete or late. Do not rely on Sightline to cross a road, take medication, operate machinery, or make any decision where a mistake could hurt you or someone else.",
  },
  {
    title: "Your key, your account",
    text: "To describe your own camera you use your own Google AI Studio key. Google's terms and free-tier limits apply to that key. Sightline sends it only with your own requests and never stores it. You are responsible for keeping it private; if it leaks, revoke it in Google AI Studio.",
  },
  {
    title: "Third-party services",
    text: "A frame you capture is sent to Google's Gemini API to be described. The description text may be sent to Microsoft's Edge read-aloud service, through an unofficial client, to be spoken. The site is hosted on Vercel. Each of those providers has its own terms and may change or withdraw its service at any time, which can make parts of Sightline stop working without notice.",
  },
  {
    title: "Acceptable use",
    text: "Do not use Sightline to identify, profile or surveil people, and do not point it at others without their knowledge where they would expect privacy. The model is instructed never to guess personal attributes, and you agree not to try to make it. Do not use the site to send abusive or automated traffic; requests are rate-limited.",
  },
  {
    title: "No warranty",
    text: "Sightline is provided as is, without warranty of any kind, under the MIT licence of its source code. To the extent the law allows, its author is not liable for any loss or harm arising from its use or from the failure of any service it depends on.",
  },
  {
    title: "Changes",
    text: "These terms and the privacy rules may be updated as the project evolves. The current versions are always the ones published on this site. Continued use after a change means you accept it.",
  },
];

export default function Terms() {
  usePageMeta("Terms of use", "Terms of use for Sightline: an assistive aid, not a safety device; your own Gemini key; third-party services; no warranty.");
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 md:py-24">
      <p className="eyebrow mb-3">Terms of use</p>
      <h1 className="font-display text-display-lg font-bold">Plain terms, in plain language.</h1>
      <p className="mt-4 max-w-2xl text-xl text-muted">
        Last updated 29 October 2026. Read with the <Link to="/privacy" className="text-cream underline">privacy rules</Link>, which are part of these terms.
      </p>
      <ol className="mt-12 space-y-8">
        {sections.map((s, i) => (
          <li key={s.title} className="card p-7">
            <div className="readout mb-2">{String(i + 1).padStart(2, "0")}</div>
            <h2 className="font-display text-2xl font-bold">{s.title}</h2>
            <p className="mt-2 text-lg leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

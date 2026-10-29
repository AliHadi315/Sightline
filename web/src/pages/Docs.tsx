import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePageMeta } from "@/lib/meta";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

const toc = [
  ["what", "What it is"],
  ["flow", "How a description happens"],
  ["privacy", "Privacy rules"],
  ["limits", "Free-tier limits"],
  ["speech", "How it speaks"],
  ["under", "Under the hood"],
];

export default function Docs() {
  usePageMeta("About", "What Sightline is, how a description happens, the privacy rules, free-tier limits and how it speaks.");
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[220px_1fr] md:py-24">
      <nav aria-label="On this page" className="md:sticky md:top-24 md:self-start">
        <p className="eyebrow mb-3">About</p>
        <ul className="space-y-2">
          {toc.map(([id, label]) => (
            <li key={id}><a className="text-muted hover:text-cream" href={`#${id}`}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14 text-lg leading-relaxed text-muted [&_strong]:text-cream">
        <div>
          <h1 className="font-display text-display-lg font-bold text-cream">About Sightline.</h1>
          <p className="mt-4 max-w-2xl text-xl">
            A scene narrator for people with low vision. Point a camera at anything, press once, and hear what is
            there or have the text read aloud. Built to be used without looking at the screen, and built to keep
            nothing.
          </p>
        </div>

        <Section id="what" title="What it is">
          <p>
            Sightline answers two questions out loud. <strong>Scene</strong> tells you what is in front of you and where,
            using directions like “to your left” and “in front of you”, most important thing first. <strong>Read</strong>{" "}
            reads every word in view, top to bottom, exactly as written: labels, letters, signs, screens.
          </p>
          <p>
            It remembers the last three descriptions and reports only what changed, so pressing again on the same view
            gives “No change” instead of repeating itself.
          </p>
        </Section>

        <Section id="flow" title="How a description happens">
          <ol className="list-decimal space-y-3 pl-6">
            <li><strong>You point the camera.</strong> The live view stays in your browser. Nothing leaves it on its own.</li>
            <li><strong>You press once.</strong> <kbd className="kbd">space</kbd> or the cyan button for the scene, <kbd className="kbd">r</kbd> or the green button for text. That one frame is scaled down, sent to Google's Gemini model with your own key, and discarded as soon as the answer arrives.</li>
            <li><strong>You listen.</strong> The answer appears in large type and is spoken automatically. <kbd className="kbd">esc</kbd> stops the voice; “Play again” repeats it.</li>
          </ol>
          <p>
            No camera handy? Three sample photos play saved descriptions without a key. A photo from your device can be
            uploaded instead of a live frame.
          </p>
        </Section>

        <Section id="privacy" title="Privacy rules">
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Manual capture only.</strong> No motion detection, no timers, no background watching.</li>
            <li><strong>No demographic inference.</strong> People are described by presence and action only. The model is told never to guess age, gender, race, emotion or health, and that cannot be switched off.</li>
            <li><strong>Nothing stored.</strong> No photos, descriptions or keys are kept on the server. Your key lives in this tab and is gone when you close it.</li>
          </ul>
          <p>
            <Link to="/privacy" className="inline-flex items-center gap-2 text-cream underline">The full rules <ArrowRight className="h-4 w-4" /></Link>
          </p>
        </Section>

        <Section id="limits" title="Free-tier limits">
          <p>
            Everything runs on free tiers, which is why you bring your own Google AI Studio key: it is free, needs no
            billing, and gives you roughly 10 to 15 descriptions a minute and a few hundred a day.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>On a <strong>rate limit</strong>, Sightline retries briefly, then says “Rate limit reached, try again in a moment”.</li>
            <li>If the vision model is <strong>overloaded or slow</strong>, it switches to a fallback model instead of waiting.</li>
            <li>When a key's <strong>daily quota</strong> is gone, you are told; the samples keep working.</li>
          </ul>
        </Section>

        <Section id="speech" title="How it speaks">
          <p>
            Three voices stand behind every description. First Microsoft Edge's read-aloud voice through an unofficial
            client, which has the nicest sound but can break without notice. Then Gemini's own text-to-speech on your key,
            limited to a handful of requests a day on the free tier. Finally your device's built-in voice, which needs no
            network and cannot go down. The text is always shown, whatever the voices do.
          </p>
        </Section>

        <Section id="under" title="Under the hood">
          <p>
            One shared core handles vision, speech and memory. Two front ends use it unchanged: this website, and a desktop
            app with a live camera window and the same hotkeys. An eval harness scores the
            scene prompt against reference photos. The whole thing is open source.
          </p>
          <p>
            <a href="https://github.com/AliHadi315/Sightline" target="_blank" rel="noreferrer" className="btn btn-ghost px-5 py-3 text-base">
              Source and setup on GitHub <ArrowRight className="h-4 w-4" />
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

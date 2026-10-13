import { Eye, BookOpenText, Repeat, Hand, ShieldOff, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const tiles = [
  {
    icon: Eye,
    code: "SCN",
    title: "Scene detection",
    text: "“A laptop is open in front of you, a mug to its right.” The most important thing first, then where everything is, in plain spatial language.",
    span: "lg:col-span-2",
  },
  {
    icon: BookOpenText,
    code: "OCR",
    title: "Read mode",
    text: "Reads every word in view, top to bottom, exactly as written. Labels, letters, signs, screens.",
  },
  {
    icon: Repeat,
    code: "DIFF",
    title: "Only what changed",
    text: "Remembers the last three descriptions and reports what is new instead of repeating itself.",
  },
  {
    icon: Hand,
    code: "MAN",
    title: "You press, it looks",
    text: "Capture is manual. No motion detection, no timers, no background watching. The camera is yours.",
    span: "lg:col-span-2",
  },
  {
    icon: ShieldOff,
    code: "PRIV",
    title: "No guessing about people",
    text: "Never age, gender, race, or mood. A person is described by presence and action only.",
  },
  {
    icon: Gauge,
    code: "LIM",
    title: "Free, and honest about limits",
    text: "Runs on free tiers with automatic model fallback. When a limit is hit it says so out loud and keeps working with samples.",
    span: "lg:col-span-2",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow mb-3">Capabilities</p>
          <h2 className="font-display text-display-lg font-bold">
            Two questions, answered out loud: <span className="text-cyan">what is here</span>, and{" "}
            <span className="text-signal">what does it say</span>.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <article
              key={t.title}
              className={cn(
                "card group flex min-h-[220px] flex-col justify-between overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40",
                t.span,
              )}
            >
              <div className="flex items-start justify-between">
                <t.icon className="h-9 w-9 stroke-[1.5] text-cyan" aria-hidden />
                <span className="readout rounded border border-line px-2 py-0.5 group-hover:border-cyan/40 group-hover:text-cyan">{t.code}</span>
              </div>
              <div className="mt-8">
                <h3 className="font-display text-2xl font-bold">{t.title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-muted">{t.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

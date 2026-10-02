import { Eye, BookOpenText, Repeat, Hand, ShieldOff, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

/* Bento feature grid, adapted from the 21st.dev "Feature Section with Bento Grid" pattern. */
const tiles = [
  {
    icon: Eye,
    title: "Scene mode",
    text: "“A laptop is open in front of you, a mug to its right.” The most important thing first, then where everything is, in plain spatial language.",
    span: "lg:col-span-2",
    accent: "text-amber",
  },
  {
    icon: BookOpenText,
    title: "Read mode",
    text: "Reads every word in view, top to bottom, exactly as written. Labels, letters, signs, screens.",
    accent: "text-teal",
  },
  {
    icon: Repeat,
    title: "Only what changed",
    text: "It remembers the last three descriptions and tells you what is new instead of repeating itself.",
    accent: "text-amber",
  },
  {
    icon: Hand,
    title: "You press, it looks",
    text: "Capture is manual. No motion detection, no timers, no background watching. The camera is yours.",
    span: "lg:col-span-2",
    accent: "text-teal",
  },
  {
    icon: ShieldOff,
    title: "No guessing about people",
    text: "Never age, gender, race, or mood. A person is described by presence and action only.",
    accent: "text-amber",
  },
  {
    icon: Gauge,
    title: "Free, and honest about limits",
    text: "Runs on free tiers. When a limit is hit it says so out loud and keeps working with samples.",
    span: "lg:col-span-2",
    accent: "text-teal",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow mb-3">What it does</p>
          <h2 className="font-display text-display-lg font-medium">
            Two questions, answered out loud: <em className="italic text-amber">what</em> is here, and{" "}
            <em className="italic text-teal">what does it say</em>.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <article key={t.title} className={cn("card flex min-h-[220px] flex-col justify-between p-7 transition-transform duration-300 hover:-translate-y-1", t.span)}>
              <t.icon className={cn("h-9 w-9 stroke-[1.5]", t.accent)} aria-hidden />
              <div className="mt-8">
                <h3 className="font-display text-2xl font-medium">{t.title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-muted">{t.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

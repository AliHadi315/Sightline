import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText } from "lucide-react";
import Mockup from "./Mockup";

const appear = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] as const },
});

const stats = [
  ["2 s", "typical answer"],
  ["2 modes", "scene · read"],
  ["0 frames", "stored"],
  ["$0", "to run"],
];

export default function Hero() {
  return (
    <section className="grain relative overflow-hidden px-5 pb-16 pt-16 sm:px-8 md:pb-24 md:pt-24">
      <div className="absolute inset-0 dotgrid" aria-hidden />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col gap-7">
          <motion.p {...appear(0)} className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-cyan" /> Assistive vision · for low vision
          </motion.p>
          <motion.h1 {...appear(0.1)} className="font-display text-display-xl font-bold text-cream">
            Point.
            <br />
            Press.
            <br />
            <span className="text-cyan">Hear.</span>
          </motion.h1>
          <motion.p {...appear(0.2)} className="max-w-xl text-xl leading-relaxed text-muted md:text-2xl">
            Sightline looks through your camera and tells you what is there, or reads any text aloud, word for word.
            One press, one honest description. Nothing is recorded.
          </motion.p>
          <motion.div {...appear(0.3)} className="flex flex-wrap items-center gap-4">
            <Link to="/app" className="btn btn-cyan btn-lg">
              Open the app <ArrowRight className="h-6 w-6" />
            </Link>
            <Link to="/docs" className="btn btn-ghost btn-lg">
              <BookOpenText className="h-6 w-6" /> About the project
            </Link>
          </motion.div>
          <motion.dl {...appear(0.4)} className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
            {stats.map(([v, l]) => (
              <div key={l}>
                <dt className="readout">{l}</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-cream">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Mockup />
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute right-[-10%] top-[20%] h-[600px] w-[700px] rounded-full bg-cyan/10 blur-[140px] animate-appear-zoom" />
      </div>
    </section>
  );
}

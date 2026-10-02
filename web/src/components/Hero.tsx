import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText } from "lucide-react";
import Mockup from "./Mockup";

const appear = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] as const },
});

export default function Hero() {
  return (
    <section className="grain relative overflow-hidden px-5 pb-16 pt-20 sm:px-8 md:pb-24 md:pt-28">
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
        <motion.p {...appear(0)} className="eyebrow">
          For people with low vision
        </motion.p>
        <motion.h1 {...appear(0.1)} className="font-display text-display-xl font-medium text-cream">
          Point the camera.
          <br />
          <em className="font-light italic text-amber">Hear</em> what is there.
        </motion.h1>
        <motion.p {...appear(0.2)} className="max-w-2xl text-xl leading-relaxed text-muted md:text-2xl">
          Sightline tells you what is in front of you and reads any text out loud, word for word.
          One press, one honest description. Nothing is recorded, ever.
        </motion.p>
        <motion.div {...appear(0.3)} className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/app" className="btn btn-amber btn-lg">
            Open the app <ArrowRight className="h-6 w-6" />
          </Link>
          <Link to="/docs" className="btn btn-ghost btn-lg">
            <BookOpenText className="h-6 w-6" /> Run it yourself
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-6 w-full max-w-5xl animate-drift"
        >
          <Mockup />
        </motion.div>
      </div>
      {/* glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[55%] h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-amber/15 blur-[140px] animate-appear-zoom" />
      </div>
    </section>
  );
}

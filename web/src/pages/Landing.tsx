import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import FAQ from "@/components/FAQ";
import { usePageMeta } from "@/lib/meta";

export default function Landing() {
  usePageMeta("", "Point the camera, press once, hear what is there or have the text read aloud. An assistive scene narrator for people with low vision. Manual capture only, nothing stored.");
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      {/* privacy band */}
      <section className="px-5 sm:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-cyan/30 bg-cyan-soft">
          <div className="grid gap-8 p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:p-12">
            <ShieldCheck className="h-14 w-14 text-cyan" aria-hidden />
            <div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">Privacy is not a setting here.</h2>
              <p className="mt-2 max-w-3xl text-lg text-cream/80">
                Manual capture only. No demographic inference. No frame archive. The same three rules apply to the
                desktop app and to this site, and none of them can be turned off.
              </p>
            </div>
            <Link to="/privacy" className="btn btn-ghost px-6 py-4 text-lg">
              Read the rules <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
      <FAQ />
      {/* final CTA */}
      <section className="px-5 pb-8 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-surface p-10 text-center hairline md:p-16">
          <h2 className="font-display text-display-lg font-bold">Ready when you are.</h2>
          <p className="mx-auto mt-3 max-w-xl text-xl text-muted">
            Works in this browser, on a laptop or a phone. Try the samples first if you like.
          </p>
          <Link to="/app" className="btn btn-cyan btn-lg mt-8">
            Open the app <ArrowRight className="h-6 w-6" />
          </Link>
        </div>
      </section>
      {/* sticky CTA on phones; the hero button scrolls away quickly on a small screen */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 p-3 backdrop-blur-md md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <Link to="/app" className="btn btn-cyan w-full py-4 text-lg">Open the app <ArrowRight className="h-5 w-5" /></Link>
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}

import { cn } from "@/lib/utils";

/** A CSS-drawn picture of the app in action, adapted from the 21st.dev "Hero with Mockup" pattern. */
export default function Mockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative z-10 overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-[0_0_80px_-20px_rgba(245,184,46,0.35)]",
        className,
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
        {/* viewfinder */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#1b1a17]">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_60%,rgba(245,184,46,0.16),transparent_70%)]" />
          {/* desk scene, drawn with boxes */}
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[#6b4a2b]" />
          <div className="absolute left-[34%] top-[28%] h-[38%] w-[32%] rounded-md bg-[#26262b] shadow-lg">
            <div className="m-[6%] h-[80%] rounded-sm bg-[#3d7bd6]" />
          </div>
          <div className="absolute left-[72%] top-[52%] h-[16%] w-[10%] rounded-sm bg-[#ece8df]" />
          <div className="absolute left-[10%] top-[60%] h-[16%] w-[20%] rounded-sm bg-[#efe7c8]" />
          {/* overlay chips */}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1 text-xs font-bold text-cream">
            <span className="relative grid h-2.5 w-2.5 place-items-center">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-amber animate-pulse_ring" />
              <span className="h-2 w-2 rounded-full bg-amber" />
            </span>
            SPEAKING
          </div>
          <div className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-3 py-1 text-xs text-muted">
            space · scene &nbsp; r · read &nbsp; esc · stop
          </div>
        </div>
        {/* description */}
        <div className="flex flex-col justify-between gap-3 rounded-xl bg-raised p-4">
          <div>
            <div className="eyebrow mb-2">What Sightline sees</div>
            <p className="font-display text-[1.35rem] leading-snug text-cream">
              A laptop is open on the desk directly in front of you. A white mug sits to its right, and a
              notebook lies to your left.
            </p>
          </div>
          <div className="flex items-end gap-[3px]">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="w-[5px] rounded-sm bg-amber"
                style={{ height: `${10 + Math.abs(Math.sin(i * 0.9)) * 26}px`, opacity: 0.35 + (i % 4) * 0.15 }}
              />
            ))}
            <span className="ml-3 text-xs text-muted">2.1 s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

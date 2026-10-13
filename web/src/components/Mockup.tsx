import { cn } from "@/lib/utils";

const boxes = [
  { label: "laptop 0.97", left: "33%", top: "26%", width: "34%", height: "44%", delay: "0.9s" },
  { label: "mug 0.91", left: "71%", top: "50%", width: "12%", height: "20%", delay: "1.25s" },
  { label: "notebook 0.88", left: "8%", top: "58%", width: "24%", height: "20%", delay: "1.55s" },
];

/** A CSS-drawn picture of the app detecting a desk scene: viewfinder, scan line, bounding boxes, spoken result. */
export default function Mockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative z-10 overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-glow", className)}
    >
      <div className="grid gap-3 md:grid-cols-[1.15fr_1fr]">
        {/* viewfinder */}
        <div className="brackets relative aspect-[4/3] overflow-hidden rounded-xl bg-[#0a0e13]">
          <span className="br" />
          <span className="scanline animate-scan" />
          <div className="absolute inset-0 dotgrid opacity-60" />
          {/* desk scene */}
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[#4a3826]" />
          <div className="absolute left-[34%] top-[28%] h-[38%] w-[32%] rounded-md bg-[#1d2228] shadow-lg">
            <div className="m-[6%] h-[80%] rounded-sm bg-[#2f6fcf]" />
          </div>
          <div className="absolute left-[72%] top-[52%] h-[16%] w-[10%] rounded-sm bg-[#e3e0d6]" />
          <div className="absolute left-[10%] top-[60%] h-[16%] w-[20%] rounded-sm bg-[#e9e1c4]" />
          {/* detections */}
          {boxes.map((b) => (
            <div key={b.label} className="det animate-box-in" style={{ left: b.left, top: b.top, width: b.width, height: b.height, animationDelay: b.delay }}>
              <span>{b.label}</span>
            </div>
          ))}
          {/* HUD */}
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md bg-ink/85 px-3 py-1 font-mono text-[11px] font-bold tracking-[0.14em] text-cream">
            <span className="relative grid h-2.5 w-2.5 place-items-center">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-cyan animate-pulse_ring" />
              <span className="h-2 w-2 rounded-full bg-cyan" />
            </span>
            SCANNING
          </div>
          <div className="readout absolute bottom-4 left-4 z-10 rounded-md bg-ink/85 px-3 py-1">
            768×576 · 3 objects · 2.1 s
          </div>
        </div>
        {/* result */}
        <div className="flex flex-col justify-between gap-3 rounded-xl bg-raised p-5">
          <div>
            <div className="eyebrow mb-3">What Sightline sees</div>
            <p className="font-display text-[1.35rem] font-semibold leading-snug text-cream">
              A laptop is open on the desk directly in front of you. A white mug sits to its right, and a notebook
              lies to your left.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {["laptop", "mug", "notebook", "desk"].map((o) => (
                <li key={o} className="rounded-md border border-cyan/40 bg-cyan-soft px-2 py-0.5 font-mono text-[11px] text-cyan">{o}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-end gap-[3px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                className="w-[4px] rounded-sm bg-cyan"
                style={{ height: `${8 + Math.abs(Math.sin(i * 0.9)) * 26}px`, opacity: 0.3 + (i % 4) * 0.17 }}
              />
            ))}
            <span className="readout ml-3">speaking</span>
          </div>
        </div>
      </div>
    </div>
  );
}

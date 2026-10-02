const steps = [
  {
    n: "01",
    title: "Point the camera",
    text: "Open the app and allow the camera. The live view is only in your browser. Nothing is sent until you ask.",
  },
  {
    n: "02",
    title: "Press once",
    text: "Space, or the big amber button, describes the scene. R, or the teal button, reads the text. That one frame goes to the model and is forgotten after.",
    keys: ["space", "r"],
  },
  {
    n: "03",
    title: "Listen",
    text: "The answer is shown in large type and spoken automatically. Esc stops the voice. Press again and you only hear what changed.",
    keys: ["esc"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
          <div>
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="font-display text-display-lg font-medium">Three steps. No setup on the page.</h2>
          </div>
          <p className="text-xl leading-relaxed text-muted">
            Sightline was designed to be used without looking at it. Every control has a key, every result is
            spoken, and the state of the app is always one glance or one word away.
          </p>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="card p-7">
              <div className="font-display text-6xl font-light text-amber/70">{s.n}</div>
              <h3 className="mt-6 font-display text-2xl font-medium">{s.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-muted">{s.text}</p>
              {s.keys && (
                <div className="mt-5 flex gap-2">
                  {s.keys.map((k) => (
                    <kbd key={k} className="kbd text-base">{k}</kbd>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

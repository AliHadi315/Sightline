const faqs = [
  {
    q: "Is anything recorded or stored?",
    a: "No. The frame you capture is held in memory for the request and dropped. The site keeps no photos, no keys, and no history on the server. The desktop app writes one debug file that is overwritten every time.",
  },
  {
    q: "Why does it say “demo mode”?",
    a: "The shared free-tier key allows a few hundred descriptions a day for everyone. When that runs out, or when a browser session has used its ten live descriptions, the app plays saved descriptions of three sample images so it never goes silent. Paste your own free key in Settings to keep going.",
  },
  {
    q: "Does it describe people?",
    a: "Only by presence and action, for example “a person seated at a desk”. The model is told never to state or guess age, gender, race, emotion, health, or any other attribute, and that instruction cannot be switched off.",
  },
  {
    q: "Why did the voice stop working?",
    a: "Speech comes from edge-tts, an unofficial client for Microsoft Edge's read-aloud voice. Microsoft can change it without notice. When that happens the description is still shown in large text.",
  },
  {
    q: "Can I run it on my own computer?",
    a: "Yes. The desktop app shows a live camera window with the same hotkeys, and the whole thing needs only a free Google AI Studio key. See the docs page for the exact commands.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="eyebrow mb-3">Questions</p>
          <h2 className="font-display text-display-lg font-medium">Straight answers.</h2>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl font-medium marker:hidden">
                {f.q}
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full hairline text-amber transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-[#0a0908] px-5 py-4 text-[15px] leading-relaxed text-cream hairline">
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="font-display text-3xl font-medium">{title}</h2>
      {children}
    </section>
  );
}

const toc = [
  ["setup", "Setup"],
  ["website", "This website"],
  ["desktop", "Desktop app"],
  ["limits", "Free-tier limits"],
  ["deploy", "Deploy to Hugging Face"],
  ["evals", "Evals and logs"],
];

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[220px_1fr] md:py-24">
      <nav aria-label="On this page" className="md:sticky md:top-24 md:self-start">
        <p className="eyebrow mb-3">Docs</p>
        <ul className="space-y-2">
          {toc.map(([id, label]) => (
            <li key={id}><a className="text-muted hover:text-cream" href={`#${id}`}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14 text-lg leading-relaxed text-muted [&_strong]:text-cream">
        <div>
          <h1 className="font-display text-display-lg font-medium text-cream">Run Sightline yourself.</h1>
          <p className="mt-4 max-w-2xl text-xl">
            Everything is free: a Google AI Studio key, Microsoft's read-aloud voice through edge-tts, and Hugging Face
            Spaces for hosting. No billing account is ever needed.
          </p>
        </div>

        <Section id="setup" title="Setup">
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <strong>Get a free Gemini key.</strong> Go to{" "}
              <a className="text-cream underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>,
              sign in, click <em>Create API key</em>. Do not enable Google Cloud Billing and do not use Vertex AI.
            </li>
            <li><strong>Install.</strong><Code>{`python -m venv venv
venv\\Scripts\\activate        # Windows;  source venv/bin/activate on macOS / Linux
pip install -r requirements-desktop.txt   # core + desktop app + Gradio + local server`}</Code></li>
            <li><strong>Configure.</strong> Copy <code>.env.example</code> to <code>.env</code> and paste your key after <code>GEMINI_API_KEY=</code>.</li>
            <li><strong>Samples.</strong> <code>python make_samples.py</code> draws the sample and eval images.</li>
          </ol>
          <p>The Gemini model is a single constant, <code>MODEL</code> in <code>config.py</code>. Keep it on a current free-tier Flash model.</p>
        </Section>

        <Section id="website" title="This website">
          <p>The site is a small React app in <code>web/</code>, served by <code>server.py</code> together with the JSON API and the classic Gradio interface at <code>/gradio</code>.</p>
          <Code>{`cd web && npm install && npm run build   # once, builds web/dist
python server.py                         # http://127.0.0.1:7860`}</Code>
          <p>
            Keys: <code>GEMINI_API_KEY</code> from the environment, an optional per-request key from Settings, a cap of 10 live
            descriptions per browser session, and a daily counter for the shared key. When live calls are unavailable the app
            switches to demo mode with the three samples and says why.
          </p>
          <p>Keyboard: <kbd className="kbd">space</kbd> describe the scene, <kbd className="kbd">r</kbd> read the text, <kbd className="kbd">esc</kbd> stop speaking.</p>
        </Section>

        <Section id="desktop" title="Desktop app">
          <Code>{`python main.py`}</Code>
          <p>
            A window shows the live camera with an FPS counter, the state (<code>IDLE / CAPTURING / THINKING / SPEAKING</code>),
            the active mode, and the cooldown timer. The full description appears in a panel under the video and is spoken.
          </p>
          <table className="w-full text-left">
            <tbody>
              {[["space", "Describe the scene"], ["r", "Read visible text aloud"], ["esc", "Stop speaking, back to idle"], ["q", "Quit"]].map(([k, v]) => (
                <tr key={k} className="border-t border-line"><td className="py-2 pr-6"><kbd className="kbd text-base">{k}</kbd></td><td className="py-2">{v}</td></tr>
              ))}
            </tbody>
          </table>
          <p>Per press: capture the frame, downscale to 768 px on the long edge, JPEG quality 80, write <code>debug/last_frame.jpg</code>, ask Gemini, speak. Capture, the API call and speech run on a worker thread so the preview never stutters.</p>
        </Section>

        <Section id="limits" title="Free-tier limits and what happens at them">
          <ul className="list-disc space-y-2 pl-6">
            <li>A <strong>3-second cooldown</strong> between triggers in the desktop app, shown on screen.</li>
            <li>On a <strong>429 rate limit</strong>, two retries with exponential backoff, then “Rate limit reached, try again in a moment”.</li>
            <li>When the <strong>daily quota</strong> is gone, the desktop app shows a persistent red banner and stops calling; the site switches to demo mode.</li>
            <li>A <strong>malformed response</strong> never crashes anything; it degrades to a best-effort description or “No change”.</li>
            <li>An empty or near-identical description skips speech and shows <strong>No change</strong>.</li>
          </ul>
          <p><strong>Speech is unofficial.</strong> edge-tts talks to Microsoft Edge's read-aloud endpoint without Microsoft's blessing. It can break at any time; when it does, text still shows. Try <code>pip install -U edge-tts</code> first.</p>
        </Section>

        <Section id="deploy" title="Deploy to Vercel (free Hobby plan)">
          <p>
            The site is served statically and the API runs as one Python serverless function (<code>api/index.py</code>).
            The API is stateless: the browser sends its own last three descriptions and session count with every request.
          </p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>Install the CLI and log in: <code>npm i -g vercel</code>, then <code>vercel login</code>.</li>
            <li>From the project root, deploy. <code>vercel.json</code> already builds <code>web/</code> and routes <code>/api/*</code> to the function.<Code>{`vercel            # preview deployment
vercel --prod     # production URL`}</Code></li>
            <li>In the Vercel project settings add an environment variable <code>GEMINI_API_KEY</code> and redeploy. Without it the site runs in demo mode.</li>
          </ol>
          <p>
            Hugging Face Spaces used to be the free option for a Python app; Gradio Spaces now need a paid plan, so only the
            Gradio interface at <code>/gradio</code> stays local.
          </p>
        </Section>

        <Section id="evals" title="Evals and logs">
          <Code>{`python run_evals.py --sleep 5`}</Code>
          <p>Runs the scene prompt over every frame in <code>evals/expected.json</code>, checks that the required objects appear, prints a PASS/FAIL table and a percentage, and writes <code>evals/results.json</code>. Every Gemini call appends one line to <code>logs/log.jsonl</code>.</p>
        </Section>
      </div>
    </div>
  );
}

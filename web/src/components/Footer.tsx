import { Link } from "react-router-dom";
import { Logo } from "./Nav";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-muted">
            A webcam scene narrator for people with low vision. Free to run, manual capture only,
            no demographic guessing, nothing stored.
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Product</h3>
          <ul className="space-y-2 text-muted">
            <li><Link className="hover:text-cream" to="/app">Open the app</Link></li>
            <li><Link className="hover:text-cream" to="/#features">What it does</Link></li>
            <li><Link className="hover:text-cream" to="/#how">How it works</Link></li>
            <li><Link className="hover:text-cream" to="/#faq">Questions</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4">More</h3>
          <ul className="space-y-2 text-muted">
            <li><Link className="hover:text-cream" to="/privacy">Privacy rules</Link></li>
            <li><Link className="hover:text-cream" to="/docs">Setup and docs</Link></li>
            <li><a className="hover:text-cream" href="/gradio">Classic Gradio interface</a></li>
            <li><a className="hover:text-cream" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Get a free Gemini key</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <p className="max-w-2xl text-sm text-muted">
            Runs on Google AI Studio's free tier and Microsoft Edge's read-aloud voice through the unofficial edge-tts
            client. Speech may stop working without notice; the text always stays.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              Created by <span className="font-bold text-cream">Ali Hadi Meselmani</span>
            </span>
            <a
              href="https://www.linkedin.com/in/alihadimeselmani"
              target="_blank"
              rel="noreferrer"
              aria-label="Ali Hadi Meselmani on LinkedIn"
              title="LinkedIn"
              className="grid h-10 w-10 place-items-center rounded-full hairline text-cream transition-colors hover:bg-amber hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://github.com/AliHadi315"
              target="_blank"
              rel="noreferrer"
              aria-label="Ali Hadi Meselmani on GitHub"
              title="GitHub"
              className="grid h-10 w-10 place-items-center rounded-full hairline text-cream transition-colors hover:bg-amber hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

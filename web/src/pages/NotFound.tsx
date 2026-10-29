import { Link } from "react-router-dom";
import { ArrowRight, Home } from "lucide-react";
import { usePageMeta } from "@/lib/meta";

export default function NotFound() {
  usePageMeta("Page not found", "That page does not exist. Sightline is a scene narrator for people with low vision.");
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-5 py-24 sm:px-8 md:py-32">
      <p className="eyebrow">404 · nothing in frame</p>
      <h1 className="font-display text-display-lg font-bold">That page is not here.</h1>
      <p className="max-w-xl text-xl leading-relaxed text-muted">
        The address may be mistyped, or the page has moved. Everything Sightline does is one click away.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link to="/" className="btn btn-ghost px-6 py-4 text-lg"><Home className="h-5 w-5" /> Home</Link>
        <Link to="/app" className="btn btn-cyan px-6 py-4 text-lg">Open the app <ArrowRight className="h-5 w-5" /></Link>
      </div>
    </div>
  );
}

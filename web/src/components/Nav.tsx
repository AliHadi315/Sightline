import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-md bg-surface hairline">
        <span className="absolute inset-[5px] rounded-sm border border-cyan/60" />
        <span className="h-3 w-3 rounded-full bg-cyan shadow-glow" />
      </span>
      <span className="font-display text-2xl font-bold tracking-tight">Sightline</span>
    </span>
  );
}

const links = [
  { to: "/#features", label: "Capabilities" },
  { to: "/#how", label: "How it works" },
  { to: "/privacy", label: "Privacy" },
  { to: "/docs", label: "About" },
];

export default function Nav() {
  const { pathname } = useLocation();
  const inApp = pathname === "/app";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <Link to="/" aria-label="Sightline home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="text-[15px] text-muted transition-colors hover:text-cream">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="readout hidden items-center gap-2 lg:inline-flex" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-blink" /> vision · online
          </span>
          <Link
            to="/app"
            className={cn("btn px-5 py-2.5 text-base", inApp ? "btn-ghost" : "btn-cyan")}
            aria-current={inApp ? "page" : undefined}
          >
            {inApp ? "In the app" : "Open the app"}
          </Link>
        </div>
      </div>
    </header>
  );
}

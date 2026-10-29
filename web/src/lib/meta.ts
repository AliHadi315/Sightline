import { useEffect } from "react";

const SITE = "Sightline";

/** Per-page title and description. Also keeps the Open Graph tags in step for crawlers that run JS. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE}` : `${SITE} — hear what your camera sees`;
    document.title = full;
    const set = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [kind, name] = selector.replace("meta[", "").replace("]", "").split("=");
        el.setAttribute(kind, name.replace(/"/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", full);
    set('meta[property="og:description"]', "content", description);
    set('meta[name="twitter:title"]', "content", full);
    set('meta[name="twitter:description"]', "content", description);
  }, [title, description]);
}

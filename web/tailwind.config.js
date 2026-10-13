/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090C",
        surface: "#0D1117",
        raised: "#131A23",
        line: "rgba(200,224,240,0.10)",
        cream: "#EEF3F8",
        muted: "#8A98A8",
        cyan: { DEFAULT: "#22E3FF", deep: "#0FB4CC", soft: "rgba(34,227,255,0.12)" },
        signal: { DEFAULT: "#5CF28A", soft: "rgba(92,242,138,0.12)" },
        amber: { DEFAULT: "#FFB547", soft: "rgba(255,181,71,0.14)" },
        rose: { DEFAULT: "#FF6B6B", soft: "rgba(255,107,107,0.14)" },
      },
      fontFamily: {
        display: ["Syne", "system-ui", "sans-serif"],
        body: ["'Atkinson Hyperlegible'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 8vw, 6.75rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2.1rem, 4.6vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(34,227,255,0.55)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -36px rgba(0,0,0,0.9)",
      },
      keyframes: {
        appear: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        "appear-zoom": { from: { opacity: "0", transform: "scale(0.9)" }, to: { opacity: "1", transform: "scale(1)" } },
        pulse_ring: { "0%": { transform: "scale(0.9)", opacity: "0.8" }, "100%": { transform: "scale(1.7)", opacity: "0" } },
        scan: { "0%": { top: "-4%" }, "100%": { top: "104%" } },
        "box-in": { from: { opacity: "0", transform: "scale(1.06)" }, to: { opacity: "1", transform: "scale(1)" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
      },
      animation: {
        appear: "appear 0.7s cubic-bezier(0.2,0.8,0.2,1) forwards",
        "appear-zoom": "appear-zoom 1.2s ease-out forwards",
        pulse_ring: "pulse_ring 1.4s ease-out infinite",
        scan: "scan 3.2s linear infinite",
        "box-in": "box-in 0.45s cubic-bezier(0.2,0.8,0.2,1) both",
        blink: "blink 1.1s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

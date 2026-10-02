/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0D0B",
        surface: "#171512",
        raised: "#221F1A",
        line: "rgba(244,239,230,0.10)",
        cream: "#F4EFE6",
        muted: "#A8A094",
        amber: { DEFAULT: "#F5B82E", deep: "#C98F12", soft: "rgba(245,184,46,0.14)" },
        teal: { DEFAULT: "#5EDDD0", deep: "#2BA79B", soft: "rgba(94,221,208,0.14)" },
        rose: { DEFAULT: "#FF7A7A", soft: "rgba(255,122,122,0.14)" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["'Atkinson Hyperlegible'", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 8vw, 6.5rem)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.2rem, 5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
      },
      boxShadow: {
        glow: "0 0 80px -20px rgba(245,184,46,0.45)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 50px -30px rgba(0,0,0,0.8)",
      },
      keyframes: {
        appear: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        "appear-zoom": { from: { opacity: "0", transform: "scale(0.9)" }, to: { opacity: "1", transform: "scale(1)" } },
        pulse_ring: { "0%": { transform: "scale(0.9)", opacity: "0.8" }, "100%": { transform: "scale(1.6)", opacity: "0" } },
        drift: { "0%": { transform: "translate3d(0,0,0)" }, "50%": { transform: "translate3d(0,-12px,0)" }, "100%": { transform: "translate3d(0,0,0)" } },
      },
      animation: {
        appear: "appear 0.7s cubic-bezier(0.2,0.8,0.2,1) forwards",
        "appear-zoom": "appear-zoom 1.2s ease-out forwards",
        pulse_ring: "pulse_ring 1.4s ease-out infinite",
        drift: "drift 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

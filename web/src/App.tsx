import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Landing from "@/pages/Landing";
import Studio from "@/pages/Studio";
import Privacy from "@/pages/Privacy";
import Docs from "@/pages/Docs";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 btn btn-amber px-4 py-2">
        Skip to content
      </a>
      <ScrollToTop />
      <Nav />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Studio />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

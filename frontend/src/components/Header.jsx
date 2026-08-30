import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { Paw, Plus, Menu, X, Sun, Moon } from "./icons";

const NAV = [
  { id: "zone-hero", label: "Home" },
  { id: "zone-problem", label: "The Problem" },
  { id: "zone-map", label: "System" },
  { id: "zone-methodology", label: "Methodology" },
  { id: "zone-attribution", label: "Attribution" },
];

export default function Header({ onReportClick, live = null }) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("zone-hero");
  const { theme, toggleTheme } = useTheme();
  const tickingRef = useRef(false);

  const go = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  }, []);

  // Continuously track which section is in view via scroll
  useEffect(() => {
    const HEADER_HEIGHT = 56; // h-14 = 56px

    const updateActiveSection = () => {
      const scrollY = window.scrollY + HEADER_HEIGHT + 20; // 20px offset for better detection
      let current = "zone-hero"; // default to hero

      for (let i = NAV.length - 1; i >= 0; i--) {
        const el = document.getElementById(NAV[i].id);
        if (el && el.offsetTop <= scrollY) {
          current = NAV[i].id;
          break;
        }
      }

      setActiveSection(current);
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(updateActiveSection);
      }
    };

    // Initial check
    updateActiveSection();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="relative z-40 border-b border-rule bg-surface/85 backdrop-blur-xl">
      {/* Skip to content link for keyboard users */}
      <a
        href="#zone-map"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-amber focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canopy-950 focus:shadow-float"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <button
          onClick={() => go("zone-hero")}
          className="group flex items-center gap-2.5"
          aria-label="SafePassage home — scroll to top"
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-rule bg-canopy-700 text-amber transition-colors group-hover:border-amber/40 group-hover:shadow-glow-amber">
            <Paw size={17} />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="font-display text-[15px] font-semibold tracking-tight text-bone">
              SafePassage
            </span>
            <span className="hidden font-serif text-[10.5px] italic text-bone-faint sm:block">
              national wildlife corridor intelligence
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === n.id
                  ? "text-bone bg-surface-raised"
                  : "text-bone-dim hover:text-bone"
              }`}
              aria-current={activeSection === n.id ? "location" : undefined}
            >
              {n.label}
              {activeSection === n.id && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-amber" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {live && (
            <span
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide sm:inline-flex ${
                live === "api"
                  ? "border-leaf/30 bg-leaf-muted text-leaf-bright"
                  : "border-amber/30 bg-amber-muted text-amber"
              }`}
              title={
                live === "api"
                  ? "Data streaming from the SafePassage API"
                  : "API unreachable — showing committed offline fixtures"
              }
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${
                    live === "api" ? "bg-leaf-bright animate-ping" : "bg-amber animate-ping"
                  }`}
                />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${live === "api" ? "bg-leaf-bright" : "bg-amber"}`} />
              </span>
              {live === "api" ? "LIVE API" : "OFFLINE"}
            </span>
          )}

          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg border border-rule bg-surface-raised text-bone-dim transition-colors hover:border-rule-hover hover:text-bone hover:bg-surface hover:shadow-glow-amber"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onReportClick}
            className="btn-ember hidden !px-3.5 !py-1.5 text-[13px] sm:inline-flex"
            aria-label="Report a roadkill sighting"
          >
            <Plus size={14} />
            Report a sighting
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-rule text-bone-dim transition-colors hover:border-rule-hover hover:text-bone md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-rule bg-surface-overlay px-4 py-3 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === n.id
                    ? "bg-surface-raised text-bone font-medium"
                    : "text-bone-dim hover:text-bone"
                }`}
              aria-current={activeSection === n.id ? "location" : undefined}
              >
                {n.label}
              </button>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                onReportClick();
              }}
              className="btn-ember mt-2 justify-center !py-2 text-sm"
            >
              <Plus size={14} />
              Report a sighting
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

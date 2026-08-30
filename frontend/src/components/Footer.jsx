import { Paw } from "./icons";

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Footer() {
  return (
    <footer className="border-t border-rule bg-canopy-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rule bg-canopy-700 text-amber">
            <Paw size={16} />
          </span>
          <div>
            <div className="font-display text-sm font-semibold text-bone">SafePassage</div>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-bone-faint">
              Roadkill hotspot predictor and wildlife-crossing planner for India's highways.
              An open-source project in active development — built entirely on open data.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
          <button onClick={() => scrollTo("zone-methodology")} className="text-bone-dim transition-colors hover:text-bone">
            Methodology
          </button>
          <button onClick={() => scrollTo("zone-attribution")} className="text-bone-dim transition-colors hover:text-bone">
            Attribution
          </button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-bone-faint">
            Open data · Zero paid services
          </span>
        </div>
      </div>
    </footer>
  );
}

import { Paw, External } from "./icons";

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Footer() {
  return (
    <footer className="border-t border-rule bg-canopy-950">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand + description */}
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

          {/* Navigation columns */}
          <div className="flex flex-wrap gap-x-10 gap-y-6 text-xs">
            {/* Product */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone-faint mb-3">Product</div>
              <div className="flex flex-col gap-2">
                <button onClick={() => scrollTo("zone-map")} className="text-left text-bone-dim transition-colors hover:text-bone">Interactive Map</button>
                <button onClick={() => scrollTo("zone-dashboard")} className="text-left text-bone-dim transition-colors hover:text-bone">Intelligence Dashboard</button>
                <button onClick={() => scrollTo("zone-methodology")} className="text-left text-bone-dim transition-colors hover:text-bone">Methodology</button>
                <button onClick={() => scrollTo("zone-contribute")} className="text-left text-bone-dim transition-colors hover:text-bone">Report a Sighting</button>
              </div>
            </div>

            {/* Data Sources */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone-faint mb-3">Data Sources</div>
              <div className="flex flex-col gap-2">
                <a href="https://www.inaturalist.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-bone-dim transition-colors hover:text-bone">
                  iNaturalist <External size={10} />
                </a>
                <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-bone-dim transition-colors hover:text-bone">
                  OpenStreetMap <External size={10} />
                </a>
                <a href="https://worldcover2021.esa.int/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-bone-dim transition-colors hover:text-bone">
                  ESA WorldCover <External size={10} />
                </a>
              </div>
            </div>

            {/* Developer */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone-faint mb-3">Developer</div>
              <div className="flex flex-col gap-2">
                <a href="https://github.com/abhay-a-nayak2305/Hack-the-Habitat" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-bone-dim transition-colors hover:text-bone">
                  GitHub Repo <External size={10} />
                </a>
                <a href="https://safepassage-api.onrender.com/docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-bone-dim transition-colors hover:text-bone">
                  API Documentation <External size={10} />
                </a>
                <button onClick={() => scrollTo("zone-attribution")} className="text-left text-bone-dim transition-colors hover:text-bone">Attribution</button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6 text-[11px]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-bone-faint">
            Open data · Zero paid services · One frozen contract
          </span>
          <span className="text-bone-faint">
            Built with open data for India's wildlife
          </span>
        </div>
      </div>
    </footer>
  );
}

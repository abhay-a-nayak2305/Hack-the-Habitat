import { External, Globe, Paw } from "../components/icons";

const SOURCES = [
  { name: "iNaturalist", role: "Roadkill-flagged observations (structured field query)", license: "CC0 / CC-BY per dataset", url: "https://www.inaturalist.org", color: "leaf" },
  { name: "GBIF", role: "Secondary cross-check only", license: "CC0 / CC-BY", url: "https://www.gbif.org", color: "amber" },
  { name: "OpenStreetMap", role: "Road geometry, forest & water layers via Overpass", license: "ODbL", url: "https://www.openstreetmap.org/copyright", color: "amber" },
  { name: "ESA WorldCover", role: "10 m land cover (documented upgrade path)", license: "CC-BY 4.0", url: "https://esa-worldcover.org", color: "leaf" },
  { name: "WDPA", role: "Protected-area boundaries (documented upgrade path)", license: "Standard terms — registered use, credited", url: "https://www.protectedplanet.net", color: "ember" },
];

const STACK = [
  { name: "React", category: "frontend" },
  { name: "Vite", category: "frontend" },
  { name: "Tailwind CSS", category: "frontend" },
  { name: "MapLibre GL JS", category: "frontend" },
  { name: "FastAPI", category: "backend" },
  { name: "scikit-learn", category: "ml" },
  { name: "GeoPandas", category: "ml" },
  { name: "Overpass API", category: "data" },
];

export default function AttributionPage() {
  return (
    <div
      className="py-24 px-6"
      style={{
        backgroundColor: "var(--canopy)",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
        {/* Header */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf/[0.06] px-3 py-1">
            <Globe size={11} className="text-leaf" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-leaf/80">Built on open data, end to end</span>
          </div>
          <h1 className="mt-6 font-display text-display-lg text-bone">
            Attribution
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-bone-dim">
            SafePassage runs entirely on open data and open-source software. Every number on
            this map traces back to one of the sources below — and the honesty ladder makes sure
            you always know exactly how many records sit behind it.
          </p>
        </div>

        {/* Sources */}
        <div className="mt-10 animate-fade-up" style={{ animationDelay: "120ms" }}>
          {SOURCES.map((s, i) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className={`group flex items-start justify-between gap-4 py-5 ${
                i < SOURCES.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full bg-${s.color}`} />
                  <span className="font-display text-[15px] font-semibold text-bone transition-colors group-hover:text-amber">
                    {s.name}
                  </span>
                  <External size={13} className="text-bone-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-bone-dim">{s.role}</p>
              </div>
              <span className="mt-1 shrink-0 whitespace-nowrap rounded-full border border-rule px-2.5 py-1 font-mono text-[10px] text-bone-faint transition-colors group-hover:border-amber/30 group-hover:text-bone-dim">
                {s.license}
              </span>
            </a>
          ))}
        </div>

        {/* The stack */}
        <section className="surface grain mt-10 rounded-panel p-6 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber/25 bg-amber/[0.08] text-amber">
              <Paw size={17} />
            </span>
            <h2 className="font-display text-display-sm text-bone">The stack</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-bone-dim">
            React · Vite · Tailwind CSS · MapLibre GL JS on the client; FastAPI + JSONL persistence
            in the API; scikit-learn, GeoPandas and a leakage-safe gradient-boosted pipeline behind
            the scores. No paid services, no API keys, no billing surprises — the whole system runs
            on what the open-data commons already provides.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {STACK.map((t) => (
              <span key={t.name} className="rounded-lg border border-rule bg-canopy-700 px-2.5 py-1 font-mono text-[10.5px] text-bone-dim">
                {t.name}
              </span>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

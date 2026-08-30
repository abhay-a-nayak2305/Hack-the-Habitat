import { useState } from "react";
import { ChevronDown, Filter, Layers, X } from "./icons";

function Switch({ label, checked, onChange, activeColor = "bg-leaf" }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs text-bone-dim transition-colors hover:text-bone"
    >
      <span className={`relative h-[18px] w-8 rounded-full transition-colors ${checked ? activeColor : "bg-canopy-500"}`}>
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-bone shadow transition-transform ${
            checked ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export default function FilterPanel({
  filters,
  onChange,
  speciesOptions = [],
  highwayOptions = [],
  layers = { hotspots: true, segments: true },
  onToggleLayer,
  onClear,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const activeCount =
    (filters.minScore > 0 ? 1 : 0) +
    (filters.species ? 1 : 0) +
    (filters.highway ? 1 : 0) +
    (filters.endangeredOnly ? 1 : 0);

  return (
    <div className="absolute right-3 top-16 z-20 w-[280px] md:top-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="chip mb-2 flex w-full justify-center border-rule bg-surface/85 backdrop-blur-md"
        aria-expanded={open}
      >
        <Filter size={13} />
        Filters
        {activeCount > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-mono text-[9px] text-bone">
            {activeCount}
          </span>
        )}
        <ChevronDown size={13} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="surface grain scroll-slim max-h-[70vh] overflow-y-auto rounded-panel-lg p-4 animate-scale-in">
          {/* Risk slider */}
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="risk-slider" className="field-label">Minimum risk</label>
              <span className="font-mono text-xs text-amber">{filters.minScore}</span>
            </div>
            <input
              id="risk-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.minScore}
              onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}
              className="risk-range"
              style={{
                background: `linear-gradient(to right, rgba(229,168,75,0.9) ${filters.minScore}%, var(--rule) ${filters.minScore}%)`,
              }}
            />
            <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-bone-faint">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>

          {/* Species */}
          <div className="mb-5">
            <div className="field-label mb-2">Species class</div>
            <div className="flex flex-wrap gap-1.5">
              <button className={`chip ${!filters.species ? "chip-active" : ""}`} onClick={() => onChange({ ...filters, species: null })}>
                All
              </button>
              {speciesOptions.map((s) => (
                <button
                  key={s}
                  className={`chip ${filters.species === s ? "chip-active" : ""}`}
                  onClick={() => onChange({ ...filters, species: filters.species === s ? null : s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Corridors */}
          <div className="mb-5">
            <div className="field-label mb-2">Corridor</div>
            <div className="flex flex-wrap gap-1.5">
              <button className={`chip ${!filters.highway ? "chip-active" : ""}`} onClick={() => onChange({ ...filters, highway: null })}>
                All corridors
              </button>
              {highwayOptions.map((h) => (
                <button
                  key={h}
                  className={`chip ${filters.highway === h ? "chip-active" : ""}`}
                  onClick={() => onChange({ ...filters, highway: filters.highway === h ? null : h })}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <Switch
              label="Endangered only"
              checked={filters.endangeredOnly}
              onChange={(v) => onChange({ ...filters, endangeredOnly: v })}
              activeColor="bg-ember"
            />
            {activeCount > 0 && (
              <button onClick={onClear} className="inline-flex items-center gap-1 text-[11px] text-bone-faint transition-colors hover:text-bone">
                <X size={11} /> Clear all
              </button>
            )}
          </div>

          {/* Layers */}
          <div className="border-t border-rule pt-4">
            <div className="mb-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-bone-faint">
              <Layers size={11} /> Layers
            </div>
            <div className="flex items-center justify-between">
              <Switch label="Hotspot clusters" checked={layers.hotspots} onChange={(v) => onToggleLayer("hotspots", v)} />
              <span className="flex -space-x-0.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ember" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                <span className="h-2.5 w-2.5 rounded-full bg-leaf" />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Switch label="Scored segments" checked={layers.segments} onChange={(v) => onToggleLayer("segments", v)} />
              <span className="h-1 w-7 rounded-full bg-gradient-to-r from-ember via-amber to-leaf" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

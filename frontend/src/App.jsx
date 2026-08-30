import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import ReportSightingForm from "./components/ReportSightingForm";
import { X } from "./components/icons";

// Lazy load below-fold components for better initial render
const ProblemZone = lazy(() => import("./components/ProblemZone"));
const IntelligenceDashboard = lazy(() => import("./components/IntelligenceDashboard"));
const ContributeZone = lazy(() => import("./components/ContributeZone"));
const DossierPanel = lazy(() => import("./components/DossierPanel"));
const MapPage = lazy(() => import("./pages/MapPage"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage"));

export default function App() {
  const [reportOpen, setReportOpen] = useState(false);
  const [live, setLive] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [hotspotsData, setHotspotsData] = useState(null);

  const trackLive = useCallback((source) => {
    if (source === "api") setLive("api");
    else if (source === "fixtures" || source === "error") setLive("offline");
  }, []);

  const selectedHotspot = useMemo(
    () => hotspotsData?.features?.find((f) => f.properties.hotspot_id === selectedId) || null,
    [hotspotsData, selectedId]
  );

  const closeMobileDossier = useCallback(() => setSelectedId(null), []);

  return (
    <div className="flex h-screen flex-col bg-canopy-950 font-body text-bone">
      <Header
        onReportClick={() => setReportOpen(true)}
        live={live}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ minHeight: 0 }}>
        {/* ZONE 1: Hero — full viewport */}
        <section id="zone-hero">
          <Hero onReportClick={() => setReportOpen(true)} />
        </section>

        {/* ZONE 2: The Problem — scroll-triggered storytelling */}
        <section id="zone-problem">
          <Suspense fallback={<div className="min-h-[60vh] bg-canopy-950" />}>
            <ProblemZone />
          </Suspense>
        </section>

        {/* ZONE 3: The Evidence — interactive map (contained) */}
        <section id="zone-map" className="px-4 py-10 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            {/* Section header */}
            <div className="mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf/[0.06] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse-glow" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-leaf/80">
                  The evidence
                </span>
              </div>
              <h2 className="mt-4 font-display text-display-lg text-bone sm:mt-6">
                Explore the <span className="font-serif italic text-leaf">Network</span>
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-bone-dim sm:mt-4">
                Interactive map of wildlife-vehicle collision hotspots across India's national highways.
                Click on any hotspot to see detailed analysis and intervention recommendations.
              </p>
            </div>

            {/* Map container + dossier side panel */}
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-stretch">
              {/* Dossier panel — left side (desktop only) */}
              <div className="hidden w-[320px] shrink-0 md:block">
                <Suspense fallback={<div className="surface rounded-panel p-5 text-center min-h-[560px] flex items-center justify-center"><p className="text-sm text-bone-faint">Loading…</p></div>}>
                  {selectedId && selectedHotspot ? (
                    <div className="min-h-[560px]">
                      <DossierPanel hotspot={selectedHotspot} onClose={() => setSelectedId(null)} />
                    </div>
                  ) : (
                    <div className="surface rounded-panel p-5 text-center min-h-[560px] flex items-center justify-center">
                      <p className="text-sm text-bone-faint">Click a hotspot on the map to see details</p>
                    </div>
                  )}
                </Suspense>
              </div>

              {/* Map — explicit min-height for mobile */}
              <div className="relative flex-1 overflow-hidden rounded-panel border border-rule shadow-panel" style={{ minHeight: "min(70vh, 500px)" }}>
                <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-canopy-900"><p className="text-sm text-bone-faint">Loading map…</p></div>}>
                  <MapPage
                    onLiveChange={trackLive}
                    selectedId={selectedId}
                    onSelectHotspot={setSelectedId}
                    compact
                    onHotspotsLoaded={setHotspotsData}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* ZONE 4: The Intelligence — dashboard */}
        <section id="zone-dashboard">
          <Suspense fallback={<div className="min-h-[50vh] bg-canopy-950" />}>
            <IntelligenceDashboard />
          </Suspense>
        </section>

        {/* ZONE 5: Methodology deep dive */}
        <section id="zone-methodology">
          <Suspense fallback={<div className="min-h-[50vh] bg-canopy-950" />}>
            <MethodologyPage />
          </Suspense>
        </section>

        {/* ZONE 6: Contribute — report sighting CTA */}
        <section id="zone-contribute">
          <Suspense fallback={<div className="min-h-[40vh] bg-canopy-950" />}>
            <ContributeZone onReportClick={() => setReportOpen(true)} />
          </Suspense>
        </section>

        {/* Footer / Attribution */}
        <section id="zone-attribution">
          <Footer />
        </section>
      </main>

      {/* Mobile dossier bottom sheet — visible on small screens when a hotspot is selected */}
      {selectedId && selectedHotspot && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 md:hidden animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Hotspot dossier"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMobileDossier}
          />
          {/* Sheet */}
          <div className="relative max-h-[85vh] overflow-hidden rounded-t-panel-lg bg-surface-overlay shadow-float animate-slide-up">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-bone/20" />
            </div>
            {/* Close button */}
            <button
              onClick={closeMobileDossier}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-bone-faint transition-colors hover:bg-canopy-600 hover:text-bone"
              aria-label="Close dossier"
            >
              <X size={16} />
            </button>
            {/* Dossier content */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 16px)" }}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-bone-faint">Loading dossier…</div>}>
                <DossierPanel hotspot={selectedHotspot} onClose={closeMobileDossier} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      <ReportSightingForm open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

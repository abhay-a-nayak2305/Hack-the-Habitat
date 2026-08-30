import { useState, useMemo } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import ReportSightingForm from "./components/ReportSightingForm";
import ProblemZone from "./components/ProblemZone";
import IntelligenceDashboard from "./components/IntelligenceDashboard";
import ContributeZone from "./components/ContributeZone";
import DossierPanel from "./components/DossierPanel";
import MapPage from "./pages/MapPage";
import MethodologyPage from "./pages/MethodologyPage";
import AttributionPage from "./pages/AttributionPage";

export default function App() {
  const [reportOpen, setReportOpen] = useState(false);
  const [live, setLive] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [hotspotsData, setHotspotsData] = useState(null);

  const trackLive = (source) => {
    if (source === "api") setLive("api");
    else if (source === "fixtures" || source === "error") setLive("offline");
  };

  const selectedHotspot = useMemo(
    () => hotspotsData?.features?.find((f) => f.properties.hotspot_id === selectedId) || null,
    [hotspotsData, selectedId]
  );

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
          <ProblemZone />
        </section>

        {/* ZONE 3: The Evidence — interactive map (contained) */}
        <section id="zone-map" className="py-16 px-6">
          <div className="mx-auto max-w-6xl">
            {/* Section header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf/[0.06] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse-glow" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-leaf/80">
                  The evidence
                </span>
              </div>
              <h2 className="mt-6 font-display text-display-lg text-bone">
                Explore the <span className="font-serif italic text-leaf">Network</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim">
                Interactive map of wildlife-vehicle collision hotspots across India's national highways.
                Click on any hotspot to see detailed analysis and intervention recommendations.
              </p>
            </div>

            {/* Map container + dossier side panel */}
            <div className="flex items-stretch gap-6">
              {/* Dossier panel — left side (height driver) */}
              <div className="hidden w-[320px] shrink-0 md:block">
                {selectedId && selectedHotspot ? (
                  <div className="min-h-[560px]">
                    <DossierPanel hotspot={selectedHotspot} onClose={() => setSelectedId(null)} />
                  </div>
                ) : (
                  <div className="surface rounded-panel p-5 text-center min-h-[560px] flex items-center justify-center">
                    <p className="text-sm text-bone-faint">Click a hotspot on the map to see details</p>
                  </div>
                )}
              </div>

              {/* Map — stretches to match dossier panel height */}
              <div className="relative flex-1 overflow-hidden rounded-panel border border-rule shadow-panel">
                <MapPage
                  onLiveChange={trackLive}
                  selectedId={selectedId}
                  onSelectHotspot={setSelectedId}
                  compact
                  onHotspotsLoaded={setHotspotsData}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ZONE 4: The Intelligence — dashboard */}
        <section id="zone-dashboard">
          <IntelligenceDashboard />
        </section>

        {/* ZONE 5: Methodology deep dive */}
        <section id="zone-methodology">
          <MethodologyPage />
        </section>

        {/* ZONE 6: Contribute — report sighting CTA */}
        <section id="zone-contribute">
          <ContributeZone onReportClick={() => setReportOpen(true)} />
        </section>

        {/* Footer / Attribution */}
        <section id="zone-attribution">
          <Footer />
        </section>
      </main>

      <ReportSightingForm open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

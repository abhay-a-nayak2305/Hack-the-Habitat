import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Header from "../components/Header";
import DossierPanel from "../components/DossierPanel";
import CorridorLeaderboard from "../components/CorridorLeaderboard";
import FilterPanel from "../components/FilterPanel";
import SeasonalityCalendar from "../components/SeasonalityCalendar";
import RiskGauge from "../components/RiskGauge";

const HOTSPOT = {
  geometry: { type: "Point", coordinates: [76.42, 11.67] },
  properties: {
    hotspot_id: "HS-000001",
    nearest_highway: "NH-766",
    risk_score: 82,
    confidence: 0.3,
    observation_count: 3,
    endangered_flag: true,
    intervention: "wildlife_crossing",
    model_version: "v0.3",
    species_mix: { Mammalia: 2, Aves: 1 },
    season_curve: [0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0],
  },
};

describe("SeasonalityCalendar", () => {
  it("renders one bar per month and marks the peak", () => {
    render(<SeasonalityCalendar curve={HOTSPOT.properties.season_curve} />);
    expect(screen.getByTitle(/Aug: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Peak month: Aug/)).toBeInTheDocument();
  });

  it("renders a flat-state note for an empty curve", () => {
    render(<SeasonalityCalendar curve={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]} />);
    expect(screen.getByText(/honesty ladder keeps the curve flat/i)).toBeInTheDocument();
  });
});

describe("RiskGauge", () => {
  it("announces the score for accessibility", () => {
    render(<RiskGauge score={82} />);
    expect(screen.getByRole("img", { name: /Risk score 82 of 100/i })).toBeInTheDocument();
  });
});

describe("CorridorLeaderboard", () => {
  it("ranks corridors by max risk and reports clicks", () => {
    const onSelect = vi.fn();
    render(
      <CorridorLeaderboard
        features={[
          HOTSPOT,
          { ...HOTSPOT, properties: { ...HOTSPOT.properties, hotspot_id: "HS-000002", nearest_highway: "NH-48", risk_score: 20 } },
        ]}
        onSelectHotspot={onSelect}
      />
    );
    // NH-766 (max 82) ranks above NH-48 (max 20)
    const first = screen.getAllByRole("button")[0];
    expect(first).toHaveAccessibleName(/NH-766/);
    fireEvent.click(first);
    expect(onSelect).toHaveBeenCalledWith("NH-766");
  });
});

describe("FilterPanel", () => {
  it("exposes the risk slider, species chips, corridor chips and layer switches", () => {
    const onChange = vi.fn();
    render(
      <FilterPanel
        filters={{ minScore: 0, species: null, highway: null, endangeredOnly: false }}
        onChange={onChange}
        speciesOptions={["Mammalia"]}
        highwayOptions={["NH-766"]}
        layers={{ hotspots: true, segments: true }}
        onToggleLayer={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole("slider", { name: "Minimum risk" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mammalia" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ species: "Mammalia" }));
    expect(screen.getByRole("switch", { name: "Hotspot clusters" })).toBeInTheDocument();
  });
});

describe("Header", () => {
  it("navigates between pages and opens the report form", () => {
    const onNavigate = vi.fn();
    const onReportClick = vi.fn();
    render(<Header page="map" onNavigate={onNavigate} onReportClick={onReportClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Methodology" }));
    expect(onNavigate).toHaveBeenCalledWith("methodology");
    fireEvent.click(screen.getByRole("button", { name: /Report a sighting/i }));
    expect(onReportClick).toHaveBeenCalled();
  });
});

describe("DossierPanel", () => {
  it("shows the intervention, species mix and endangered badge", () => {
    render(<DossierPanel hotspot={HOTSPOT} onClose={() => {}} />);
    expect(screen.getByText("Wildlife crossing")).toBeInTheDocument();
    expect(screen.getByText(/Endangered/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mammalia/).length).toBeGreaterThan(0);
  });

  it("renders nothing without a hotspot", () => {
    const { container } = render(<DossierPanel hotspot={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

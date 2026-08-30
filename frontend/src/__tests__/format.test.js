import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INTERVENTION_LABELS,
  MONTHS,
  riskColor,
  riskLabel,
  speciesMixToList,
} from "../utils/format";

const fixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/fixtures/hotspots.geojson"), "utf-8")
);

describe("riskColor", () => {
  it("maps score bands to the palette", () => {
    expect(riskColor(85)).toBe("#C1502E");
    expect(riskColor(70)).toBe("#C1502E");
    expect(riskColor(69)).toBe("#E3A857");
    expect(riskColor(40)).toBe("#E3A857");
    expect(riskColor(39)).toBe("#6B7A5E");
    expect(riskColor(0)).toBe("#6B7A5E");
  });
});

describe("riskLabel", () => {
  it("labels score bands", () => {
    expect(riskLabel(90)).toBe("High risk");
    expect(riskLabel(55)).toBe("Medium risk");
    expect(riskLabel(10)).toBe("Low risk");
  });
});

describe("speciesMixToList", () => {
  it("sorts species by count descending and tolerates null", () => {
    expect(speciesMixToList({ Aves: 2, Mammalia: 5 })).toEqual([
      ["Mammalia", 5],
      ["Aves", 2],
    ]);
    expect(speciesMixToList(null)).toEqual([]);
  });
});

describe("schema constants", () => {
  it("INTERVENTION_LABELS covers the Schema v1 enum exactly", () => {
    expect(Object.keys(INTERVENTION_LABELS).sort()).toEqual(
      ["fencing", "none", "signage", "speed_limit", "wildlife_crossing"].sort()
    );
  });

  it("MONTHS has 12 entries", () => {
    expect(MONTHS).toHaveLength(12);
  });
});

describe("fixture fallback", () => {
  it("served fixtures are Schema v1 FeatureCollections", () => {
    expect(fixtures.type).toBe("FeatureCollection");
    expect(fixtures.features.length).toBeGreaterThan(0);
    for (const f of fixtures.features) {
      expect(f.properties.risk_score).toBeGreaterThanOrEqual(0);
      expect(f.properties.risk_score).toBeLessThanOrEqual(100);
      expect(f.properties.season_curve).toHaveLength(12);
    }
  });
});

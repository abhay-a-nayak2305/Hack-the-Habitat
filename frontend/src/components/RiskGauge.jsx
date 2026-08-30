import { useId } from "react";
import { RISK_HIGH, RISK_MID, RISK_LOW, riskLabel } from "../utils/format";

/**
 * Radial risk gauge — an SVG arc from 0 (leaf) through 100 (ember).
 * Now uses the new design system typography (DM Sans + JetBrains Mono).
 */
export default function RiskGauge({ score, size = 150 }) {
  const uid = useId();
  const r = 54;
  const len = Math.PI * r;
  const frac = Math.max(0, Math.min(1, (Number(score) || 0) / 100));
  const color = score >= 70 ? RISK_HIGH : score >= 40 ? RISK_MID : RISK_LOW;

  return (
    <div className="relative" style={{ width: size, height: size * 0.62 }}>
      <svg viewBox="0 0 120 74" width={size} height={size * 0.62} role="img" aria-label={`Risk score ${score} of 100 — ${riskLabel(score)}`}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={RISK_LOW} />
            <stop offset="55%" stopColor={RISK_MID} />
            <stop offset="100%" stopColor={RISK_HIGH} />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d="M 10 64 A 50 50 0 0 1 110 64"
          fill="none"
          stroke="var(--rule)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d="M 10 64 A 50 50 0 0 1 110 64"
          fill="none"
          stroke={`url(#${uid})`}
          strokeOpacity="0.4"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${len} ${len}`}
          strokeDashoffset={len * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
        {/* score */}
        <text x="60" y="56" textAnchor="middle" fill="var(--bone)"
          style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {score}
        </text>
        <text x="60" y="70" textAnchor="middle" fill={color}
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: "0.18em" }}>
          {"/ 100"}
        </text>
      </svg>
    </div>
  );
}

import { MONTHS } from "../utils/format";

export default function SeasonalityCalendar({ curve }) {
  if (!curve || curve.length !== 12) return null;
  const max = Math.max(...curve, 1);
  const peak = curve.indexOf(max);
  const total = curve.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="text-xs text-bone-faint italic">
        No dated observations in this cluster yet — the honesty ladder keeps
        the curve flat until the evidence arrives.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-[3px] h-16">
        {curve.map((v, i) => {
          const h = Math.max(4, Math.round((v / max) * 56));
          const isPeak = v === max && v > 0;
          const pct = Math.round((v / total) * 100);
          return (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className={`w-full rounded-sm transition-all duration-300 ${
                  isPeak ? "bg-ember" : "bg-canopy-500 group-hover:bg-leaf/70"
                }`}
                style={{ height: `${h}px` }}
                title={`${MONTHS[i]}: ${v} observation${v === 1 ? "" : "s"} (${pct}%)`}
              />
              <span className={`text-[8.5px] ${isPeak ? "text-bone" : "text-bone-faint"}`}>
                {MONTHS[i][0]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-bone-faint">
        Peak month: <span className="text-bone">{MONTHS[peak]}</span>
        <span className="ml-1.5 font-mono text-[10px] text-ember">{peak + 1}/12</span>
      </p>
    </div>
  );
}

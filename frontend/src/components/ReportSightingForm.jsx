import { useState, useEffect, useRef } from "react";
import { submitSighting } from "../hooks/useSafePassageData";
import { Check, Locate, X } from "./icons";

const CLASSES = ["Mammalia", "Aves", "Reptilia", "Amphibia", "Other"];
const initial = { latitude: "", longitude: "", species: "", taxonomic_class: "Mammalia", highway: "", notes: "" };

export default function ReportSightingForm({ open, onClose }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});
  const [geoError, setGeoError] = useState(null);
  const [viewportHeight, setViewportHeight] = useState("100dvh");
  const formRef = useRef(null);

  // Handle mobile keyboard pushing the form off-screen
  useEffect(() => {
    if (!open) return;
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      }
    };
    window.visualViewport?.addEventListener("resize", updateHeight);
    updateHeight();
    return () => window.visualViewport?.removeEventListener("resize", updateHeight);
  }, [open]);

  if (!open) return null;

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({
          ...form,
          latitude: pos.coords.latitude.toFixed(5),
          longitude: pos.coords.longitude.toFixed(5),
        });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Location access denied. You can enter coordinates manually below.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("Location information unavailable. Enter coordinates manually.");
            break;
          case err.TIMEOUT:
            setGeoError("Location request timed out. Try again or enter coordinates.");
            break;
          default:
            setGeoError("Could not get your location. Enter coordinates manually.");
            break;
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const validate = () => {
    const next = {};
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) next.latitude = "Latitude must be between -90 and 90.";
    if (Number.isNaN(lon) || lon < -180 || lon > 180) next.longitude = "Longitude must be between -180 and 180.";
    if (!form.species.trim()) next.species = "Species name is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      await submitSighting({ ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => {
      setForm(initial);
      setStatus("idle");
      setErrors({});
      setGeoError(null);
    }, 300);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Report a roadkill sighting"
      onClick={(e) => e.target === e.currentTarget && close()}
      style={{ height: viewportHeight }}
    >
      <div className="surface-overlay grain w-full max-w-md rounded-panel-lg animate-scale-in">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 className="font-display text-display-sm text-bone">Report a sighting</h2>
            <p className="mt-1 text-xs text-bone-dim">30 seconds of your eyes on the road feeds tomorrow's model run.</p>
          </div>
          <button onClick={close} aria-label="Close" className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-bone-faint transition-colors hover:bg-canopy-600 hover:text-bone">
            <X size={16} />
          </button>
        </div>

        {status === "done" ? (
          <div className="px-6 py-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-leaf/40 bg-leaf-muted text-leaf-bright">
              <Check size={26} />
            </span>
            <div className="mt-4 font-display text-display-sm text-bone">Recorded.</div>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-bone-dim">
              Your report is appended to the structured dataset. Run the pipeline to fold it
              into tomorrow's hotspots — this is the honesty ladder, in action.
            </p>
            <button onClick={close} className="btn-ghost mt-6 w-full justify-center">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 pb-6 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" required value={form.latitude} onChange={update("latitude")} placeholder="11.6700" mono error={errors.latitude} />
              <Field label="Longitude" required value={form.longitude} onChange={update("longitude")} placeholder="76.4200" mono error={errors.longitude} />
            </div>
            <button type="button" onClick={useMyLocation} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber transition-colors hover:text-amber-bright">
              <Locate size={13} />
              Use my current location
            </button>
            {geoError && (
              <p role="alert" className="mt-1.5 text-[11px] text-amber/80">{geoError}</p>
            )}

            <div className="mt-3">
              <Field label="Species (common name)" required value={form.species} onChange={update("species")} placeholder="Chital, Indian peafowl…" error={errors.species} />
            </div>

            <div className="mt-3">
              <div className="field-label">Taxonomic class</div>
              <div className="flex flex-wrap gap-1.5">
                {CLASSES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`chip ${form.taxonomic_class === c ? "chip-active" : ""}`}
                    onClick={() => setForm({ ...form, taxonomic_class: c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <Field label="Nearest highway (optional)" value={form.highway} onChange={update("highway")} placeholder="NH-766" />
            </div>
            <div className="mt-3">
              <Field label="Notes (optional)" value={form.notes} onChange={update("notes")} textarea rows={2} placeholder="Anything else we should know…" />
            </div>

            <button type="submit" disabled={status === "sending"} className="btn-primary mt-5 w-full justify-center !py-2.5">
              {status === "sending" ? "Submitting…" : "Submit sighting"}
            </button>

            {status === "error" && (
              <p role="alert" className="mt-3 text-xs text-ember">
                Couldn't reach the server. Your report is safe to retry — nothing was recorded.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, value, onChange, placeholder, mono, error, textarea, rows, id }) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {required && <span className="ml-0.5 text-ember">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`field ${error ? "border-ember/50 focus:border-ember focus:shadow-[0_0_0_3px_rgba(224,77,40,0.1)]" : ""}`}
        />
      ) : (
        <input
          id={fieldId}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`field ${mono ? "font-mono" : ""} ${error ? "border-ember/50 focus:border-ember focus:shadow-[0_0_0_3px_rgba(224,77,40,0.1)]" : ""}`}
        />
      )}
      {error && <p id={errorId} role="alert" className="mt-1 text-[11px] text-ember">{error}</p>}
    </div>
  );
}

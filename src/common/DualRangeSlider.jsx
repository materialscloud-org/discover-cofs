// A two-thumb range slider, styled as RangeSlider: two native
// <input type="range"> on one track (keyboard and screen readers keep
// working), the track filled between the thumbs, and a number box at each end
// to type the bounds (applied on Enter or blur, clamped to the range).
// (from molecular-vibration-explorer; the track fills the width, the label is optional)
// TODO: elevate up to mc-react-library (with RangeSlider)
import { useId, useState } from "react";

const BLUE = "#337ab7"; // Materials Cloud link blue
const TRACK = "#e2e8f0"; // slate-200

// Written out in full: Tailwind only generates classes it finds literally.
// The inputs are transparent and ignore the pointer; only their thumbs take it.
const INPUT_CLASSES = [
  "pointer-events-none absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none",
  "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[#337ab7]/40",
  // the thumb, WebKit/Blink
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#337ab7] [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
  // the thumb and track, Firefox
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#337ab7]",
  "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:transition-transform",
  "[&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-track]:bg-transparent",
].join(" ");

/** value: [low, high]; onChange receives a new [low, high], low <= high */
export default function DualRangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  className = "",
}) {
  const id = useId();
  const [lo, hi] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  // when the thumbs meet, the one that can still move must be on top
  const loOnTop = lo > (min + max) / 2;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <label id={id} className="text-sm">
          {label}
        </label>
      )}
      <NumberBox
        label="minimum"
        value={lo}
        min={min}
        max={hi}
        step={step}
        onChange={(v) => onChange([v, hi])}
      />
      <div role="group" aria-label={label || undefined} className="relative h-4 min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            background: `linear-gradient(to right, ${TRACK} ${pct(lo)}%, ${BLUE} ${pct(lo)}%, ${BLUE} ${pct(hi)}%, ${TRACK} ${pct(hi)}%)`,
          }}
        />
        <input
          type="range"
          aria-label="minimum"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className={`${INPUT_CLASSES} ${loOnTop ? "z-20" : "z-10"}`}
        />
        <input
          type="range"
          aria-label="maximum"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className={`${INPUT_CLASSES} z-10`}
        />
      </div>
      <NumberBox
        label="maximum"
        value={hi}
        min={lo}
        max={max}
        step={step}
        onChange={(v) => onChange([lo, v])}
      />
    </div>
  );
}

/** a typed bound: kept as text while editing, applied on Enter or blur */
function NumberBox({ label, value, min, max, step, onChange }) {
  const [draft, setDraft] = useState(null);
  const text = draft ?? String(value);
  const commit = () => {
    setDraft(null);
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v)) return; // back to the value
    // toFixed: 0.1-steps would leave float noise (0.30000000000000004)
    const clamped = Math.min(max, Math.max(min, Number((Math.round(v / step) * step).toFixed(6))));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <input
      type="number"
      aria-label={`${label} value`}
      className="w-16 shrink-0 rounded border border-gray-300 px-2 py-0.5 text-sm tabular-nums"
      value={text}
      min={min}
      max={max}
      step={step}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

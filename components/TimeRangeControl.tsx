"use client";

import { RANGE_KEYS, RANGE_LABEL, type RangeKey } from "@/lib/range";
import { haptic } from "@/lib/haptics";

// Horizontal segmented control for the rolling time-range presets.
export function TimeRangeControl({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (k: RangeKey) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1">
      {RANGE_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => {
            haptic(5);
            onChange(k);
          }}
          className={`flex-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            value === k ? "bg-surface-2 text-text" : "text-muted"
          }`}
        >
          {RANGE_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

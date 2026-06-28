// Rolling time-range presets used by the dashboard hero and export screen.

export type RangeKey = "24H" | "7D" | "1M" | "3M" | "1Y" | "custom";

export const RANGE_KEYS: RangeKey[] = ["24H", "7D", "1M", "3M", "1Y", "custom"];

export const RANGE_LABEL: Record<RangeKey, string> = {
  "24H": "24H",
  "7D": "7D",
  "1M": "1M",
  "3M": "3M",
  "1Y": "1Y",
  custom: "Custom",
};

const DAYS: Record<Exclude<RangeKey, "custom">, number> = {
  "24H": 1,
  "7D": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export interface Range {
  start: string;
  end: string;
  label: string; // human description of the window
}

export function rangeFor(
  key: RangeKey,
  customStart?: string,
  customEnd?: string
): Range {
  if (key === "custom") {
    const end = customEnd || iso(new Date());
    const start = customStart || end;
    return { start, end, label: `${start} – ${end}` };
  }
  const today = new Date();
  const end = iso(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (DAYS[key] - 1));
  const start = iso(startDate);
  const label =
    key === "24H" ? "Today" : `Last ${DAYS[key]} days`;
  return { start, end, label };
}

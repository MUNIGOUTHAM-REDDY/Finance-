"use client";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

// A large, thumb-friendly numeric keypad that edits a decimal string.
export function AmountKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  function press(k: string) {
    if (navigator.vibrate) navigator.vibrate(8);
    if (k === "del") {
      onChange(value.length <= 1 ? "0" : value.slice(0, -1));
      return;
    }
    if (k === ".") {
      if (value.includes(".")) return;
      onChange(value + ".");
      return;
    }
    // Limit to two decimal places.
    if (value.includes(".") && value.split(".")[1]?.length >= 2) return;
    if (value === "0") {
      onChange(k);
      return;
    }
    onChange(value + k);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className="rounded-xl bg-surface-2 py-4 text-2xl font-medium text-text transition active:scale-95 active:bg-border"
        >
          {k === "del" ? "⌫" : k}
        </button>
      ))}
    </div>
  );
}

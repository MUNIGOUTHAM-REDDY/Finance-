// Light haptic feedback where supported (Android/Chrome; iOS Safari ignores it).
export function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }
}

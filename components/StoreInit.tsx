"use client";

import { useEffect } from "react";
import { getProfile } from "@/lib/store";
import { setActiveCurrency } from "@/lib/format";

// Reads device-local profile settings once on load (e.g. active currency).
export function StoreInit() {
  useEffect(() => {
    setActiveCurrency(getProfile().currency);
  }, []);
  return null;
}

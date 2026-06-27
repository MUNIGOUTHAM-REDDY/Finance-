"use client";

import { PlusIcon } from "@/components/icons";
import { useQuickAdd } from "@/components/QuickAdd";

export function Fab() {
  const { open } = useQuickAdd();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-40 flex justify-center">
      <div className="flex w-full max-w-md justify-end px-5">
        <button
          type="button"
          onClick={open}
          aria-label="Add transaction"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition active:scale-95"
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}

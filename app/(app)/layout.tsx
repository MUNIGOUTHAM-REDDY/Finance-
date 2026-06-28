import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Fab } from "@/components/Fab";
import { QuickAddProvider } from "@/components/QuickAdd";
import { StoreInit } from "@/components/StoreInit";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QuickAddProvider>
      <StoreInit />
      <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5">
        {children}
      </div>
      <Fab />
      <BottomNav />
    </QuickAddProvider>
  );
}

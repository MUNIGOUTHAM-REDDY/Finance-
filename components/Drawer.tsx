"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  InsightsIcon,
  BudgetIcon,
  ProfileIcon,
  SettingsIcon,
  WalletIcon,
} from "@/components/icons";
import { Export as ExportGlyph } from "@phosphor-icons/react";
import { haptic } from "@/lib/haptics";

const DrawerContext = createContext<{ open: () => void }>({ open: () => {} });
export const useDrawer = () => useContext(DrawerContext);

const TOOLS: { href: string; label: string; sub: string; Icon: (p: { className?: string }) => JSX.Element }[] = [
  { href: "/insights", label: "Insights", sub: "Trends & breakdowns", Icon: InsightsIcon },
  { href: "/budgets", label: "Budgets", sub: "Limits & alerts", Icon: BudgetIcon },
  { href: "/export", label: "Export", sub: "CSV / JSON backup", Icon: (p) => <ExportGlyph {...p} /> },
  { href: "/profile", label: "Profile", sub: "Your details", Icon: ProfileIcon },
  { href: "/settings", label: "Settings", sub: "Categories & data", Icon: SettingsIcon },
];

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <DrawerContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="animate-fade absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div className="animate-drawer absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto border-r border-border bg-surface p-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
                <WalletIcon className="h-6 w-6" weight="fill" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text">SpendTrack</p>
                <p className="text-xs text-muted">On this device</p>
              </div>
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Tools
            </p>
            <nav className="space-y-1">
              {TOOLS.map(({ href, label, sub, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => haptic(6)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition active:bg-surface-2"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-text">{label}</p>
                    <p className="text-xs text-muted">{sub}</p>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </DrawerContext.Provider>
  );
}

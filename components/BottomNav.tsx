"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ListIcon,
  WalletIcon,
  RepeatIcon,
  UsersIcon,
} from "@/components/icons";

const tabs = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/transactions", label: "Activity", Icon: ListIcon },
  { href: "/accounts", label: "Accounts", Icon: WalletIcon },
  { href: "/recurring", label: "Recurring", Icon: RepeatIcon },
  { href: "/loans", label: "Loans", Icon: UsersIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

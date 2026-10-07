import Link from "next/link";
import { Suspense } from "react";

import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
] as const;

export function AppHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            BuildScope
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <Suspense fallback={<div className="h-8 w-32 animate-pulse rounded-md bg-muted" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

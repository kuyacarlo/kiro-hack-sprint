"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/issue", label: "Issue" },
  { href: "/verification", label: "Verify" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="glass sticky top-0 z-50 border-b border-[var(--color-border)]/50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <Link href="/" className="press flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
            Carbon<span className="text-[var(--color-accent)]">Credit</span>
          </span>
        </Link>

        {/* Nav */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-0.5 rounded-[var(--radius-full)] border border-[var(--color-border)]/50 bg-[var(--color-muted)]/50 p-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`press relative flex items-center rounded-[var(--radius-full)] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-[var(--duration-fast)] ${
                      isActive
                        ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-sm"
                        : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Status */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="dot-pulse" />
          <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">Testnet</span>
        </div>
      </div>
    </header>
  );
}

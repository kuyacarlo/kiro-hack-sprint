"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "./providers/WalletProvider";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/issue", label: "Issue" },
  { href: "/verification", label: "Verify" },
];

export function Navigation() {
  const pathname = usePathname();
  const { address, connected, connecting, connect, disconnect } = useWallet();

  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

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
        <nav aria-label="Main navigation" className="hidden md:block">
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

        {/* Wallet Button */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="dot-pulse" />
            <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">Testnet</span>
          </div>
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-muted)] px-3 py-1.5 font-mono text-[11px] text-[var(--color-foreground)]">
                {shortAddress}
              </span>
              <button
                onClick={disconnect}
                className="press rounded-[var(--radius-full)] border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)] transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="press rounded-[var(--radius-full)] bg-[var(--color-accent)] px-4 py-1.5 text-[12px] font-semibold text-[var(--color-on-accent)] shadow-sm transition-all duration-[var(--duration-fast)] hover:brightness-110 disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

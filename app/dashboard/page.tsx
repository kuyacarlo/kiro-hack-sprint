"use client";

import { useEffect, useState } from "react";
import { fetchContractStats, fetchCredits, type ContractStats, type CarbonCredit } from "@/lib/api";

/* ─── SVG Icons ─── */
function IconCredits() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2.5-.5 8.5"/><path d="M11.7 13.2c.8-2.8 2.4-4.4 2.8-3.9.4.5-1 2.3-3.4 5.4-2.3 3.1-4.4 4.5-4.8 4s1.1-2.1 3.4-5.2"/>
    </svg>
  );
}

function IconRecycle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 12.006 3a1.784 1.784 0 0 1 1.569.882l4.245 7.34"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>
    </svg>
  );
}

function IconCoins() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>
    </svg>
  );
}

function IconCircle({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" fill={color} opacity="0.2"/>
      <circle cx="6" cy="6" r="3" fill={color}/>
    </svg>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  icon,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  delay: string;
}) {
  return (
    <div className={`animate-fade-up ${delay} card-hover rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-sm)]`}>
      <div className="flex items-center gap-2.5 text-[var(--color-muted-foreground)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)/10]">
          <span className="text-[var(--color-accent)]">{icon}</span>
        </div>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; color: string }> = {
    Listed: { bg: "bg-[var(--color-accent)/10]", text: "text-[var(--color-accent)]", color: "var(--color-accent)" },
    Sold: { bg: "bg-[var(--info)/10]", text: "text-[var(--info)]", color: "var(--info)" },
    Retired: { bg: "bg-[var(--color-muted)]", text: "text-[var(--color-muted-foreground)]", color: "var(--color-muted-foreground)" },
  };
  const c = config[status] ?? config.Retired;
  return (
    <span className={`badge-glow inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <IconCircle color={c.color} />
      {status}
    </span>
  );
}

/* ─── Skeleton Loader ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-28 rounded-[var(--radius-xl)]" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-[var(--radius-xl)]" />
    </div>
  );
}

/* ─── Main Page ─── */
export default function DashboardPage() {
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [credits, setCredits] = useState<CarbonCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, creditsData] = await Promise.all([
          fetchContractStats(),
          fetchCredits(),
        ]);
        if (statsData.ok) setStats(statsData);
        else setError(statsData.admin ? "Failed to load stats" : "Contract not configured — deploy the Soroban contract first");
        if (creditsData.ok) setCredits(creditsData.credits);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="animate-fade-up rounded-[var(--radius-xl)] border border-[var(--error)]/20 bg-[var(--error)]/5 p-6">
        <div className="flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
          </svg>
          <div>
            <p className="font-medium text-[var(--error)]">Dashboard Error</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const listedCredits = credits.filter((c) => c.status === "Listed");
  const soldCredits = credits.filter((c) => c.status === "Sold");
  const retiredCredits = credits.filter((c) => c.status === "Retired");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">Dashboard</h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          Contract overview and marketplace analytics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Credits Issued"
          value={stats?.nextId ? stats.nextId - 1 : 0}
          icon={<IconCredits />}
          delay="delay-1"
        />
        <StatCard
          label="Tonnes Issued"
          value={stats?.totalIssuedTonnes?.toLocaleString() ?? "0"}
          icon={<IconLeaf />}
          delay="delay-2"
        />
        <StatCard
          label="Tonnes Retired"
          value={stats?.totalRetiredTonnes?.toLocaleString() ?? "0"}
          icon={<IconRecycle />}
          delay="delay-3"
        />
        <StatCard
          label="Fee (BPS)"
          value={stats?.feeBps ?? 0}
          icon={<IconCoins />}
          delay="delay-4"
        />
      </div>

      {/* Status breakdown */}
      <div className="animate-fade-up delay-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-xs)]">
          <IconCircle color="var(--color-accent)" />
          <div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{listedCredits.length}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Active Listings</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-xs)]">
          <IconCircle color="var(--info)" />
          <div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{soldCredits.length}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Sold</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-xs)]">
          <IconCircle color="var(--color-muted-foreground)" />
          <div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{retiredCredits.length}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Retired</p>
          </div>
        </div>
      </div>

      {/* Recent Credits */}
      {credits.length > 0 && (
        <div className="animate-fade-up delay-4 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Recent Credits</h2>
          <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-xs)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">ID</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Project</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Tonnes</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Region</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {credits.slice(0, 10).map((credit) => (
                  <tr key={credit.id} className="transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-muted)]">
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--color-muted-foreground)]">#{credit.id}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-foreground)]">{credit.projectName}</td>
                    <td className="px-5 py-3.5 text-[var(--color-muted-foreground)]">{credit.projectType}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[var(--color-foreground)]">{credit.tonnes.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-[var(--color-muted-foreground)]">{credit.region}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={credit.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Info */}
      {stats && (
        <div className="animate-fade-up delay-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-xs)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Contract Info</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs text-[var(--color-muted-foreground)]">Admin</dt>
              <dd className="truncate rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-1.5 font-mono text-xs text-[var(--color-foreground)]">{stats.admin ?? "N/A"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-[var(--color-muted-foreground)]">Payment Token</dt>
              <dd className="truncate rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-1.5 font-mono text-xs text-[var(--color-foreground)]">{stats.paymentToken ?? "N/A"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-[var(--color-muted-foreground)]">Treasury</dt>
              <dd className="truncate rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-1.5 font-mono text-xs text-[var(--color-foreground)]">{stats.treasury ?? "N/A"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

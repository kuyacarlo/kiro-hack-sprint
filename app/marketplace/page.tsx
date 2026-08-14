"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchCredits,
  buyCredit,
  retireCredit,
  listCredit,
  type CarbonCredit,
} from "@/lib/api";

type ActionState = {
  loading: boolean;
  error: string | null;
  success: string | null;
};

/* ─── Icons ─── */
function IconCircle({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" fill={color} opacity="0.2"/>
      <circle cx="5" cy="5" r="2.5" fill={color}/>
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  );
}

function IconArchive() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconSeedling() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12"/><path d="M12 12c0-4 3-7 7-7-1 4-3 7-7 7z"/><path d="M12 12c0-4-3-7-7-7 1 4 3 7 7 7z"/>
    </svg>
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

/* ─── Credit Card ─── */
function CreditCard({
  credit,
  onBuy,
  onRetire,
  onList,
  index,
}: {
  credit: CarbonCredit;
  onBuy: (id: number) => void;
  onRetire: (id: number) => void;
  onList: (id: number, action: "list" | "unlist") => void;
  index: number;
}) {
  const priceDisplay = credit.price
    ? (Number(credit.price) / 1e7).toFixed(2)
    : "0.00";

  const delayClass = `delay-${Math.min(index % 6 + 1, 6)}`;

  return (
    <div className={`animate-fade-up ${delayClass} card-hover shine-effect flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-sm)]`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[var(--color-foreground)]">
              {credit.projectName}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{credit.projectType}</p>
          </div>
          <StatusBadge status={credit.status} />
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Tonnes</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--color-foreground)]">{credit.tonnes.toLocaleString()}</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Price</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--color-foreground)]">{priceDisplay} <span className="text-[10px] text-[var(--color-muted-foreground)]">XLM</span></p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Region</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">{credit.region}</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Vintage</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">{credit.vintageYear}</p>
          </div>
        </div>

        {/* Registry ID */}
        <p className="truncate rounded-[var(--radius-sm)] bg-[var(--color-muted)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
          Registry: {credit.registryId}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
        {credit.status === "Listed" && (
          <button
            onClick={() => onBuy(credit.id)}
            className="press-effect flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:shadow-[var(--shadow-md)] hover:brightness-110"
          >
            <IconCart />
            Buy Credit
          </button>
        )}
        {credit.status === "Sold" && (
          <>
            <button
              onClick={() => onRetire(credit.id)}
              className="press-effect flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--error)]/20 px-3 py-2.5 text-xs font-semibold text-[var(--error)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--error)]/5"
            >
              <IconArchive />
              Retire
            </button>
            <button
              onClick={() => onList(credit.id, "list")}
              className="press-effect flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 py-2.5 text-xs font-semibold text-[var(--color-foreground)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-muted)]"
            >
              <IconRefresh />
              Re-list
            </button>
          </>
        )}
        {credit.status === "Retired" && (
          <div className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-[var(--color-muted-foreground)]">
            <IconLock />
            Permanently retired
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function MarketplacePage() {
  const [credits, setCredits] = useState<CarbonCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "Listed" | "Sold" | "Retired">("all");
  const [action, setAction] = useState<ActionState>({ loading: false, error: null, success: null });
  const [secretKey, setSecretKey] = useState("");
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "buy" | "retire" | "list" | "unlist";
    creditId: number;
  } | null>(null);

  const loadCredits = useCallback(async () => {
    try {
      const data = await fetchCredits();
      if (data.ok) setCredits(data.credits);
    } catch (e) {
      console.error("Failed to load credits", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  const handleActionRequest = (type: "buy" | "retire" | "list" | "unlist", creditId: number) => {
    setPendingAction({ type, creditId });
    setShowSecretModal(true);
    setAction({ loading: false, error: null, success: null });
  };

  const executeAction = async () => {
    if (!pendingAction || !secretKey.trim()) return;
    setAction({ loading: true, error: null, success: null });

    try {
      let result;
      switch (pendingAction.type) {
        case "buy":
          result = await buyCredit(pendingAction.creditId, secretKey);
          break;
        case "retire":
          result = await retireCredit(pendingAction.creditId, secretKey);
          break;
        case "list":
        case "unlist":
          result = await listCredit(pendingAction.creditId, secretKey, pendingAction.type);
          break;
      }

      if (result.ok) {
        setAction({ loading: false, error: null, success: `Transaction successful! Hash: ${result.hash?.slice(0, 12)}...` });
        setShowSecretModal(false);
        setSecretKey("");
        setPendingAction(null);
        await loadCredits();
      } else {
        setAction({ loading: false, error: result.error ?? "Action failed", success: null });
      }
    } catch (e) {
      setAction({ loading: false, error: e instanceof Error ? e.message : "Action failed", success: null });
    }
  };

  const filteredCredits = filter === "all" ? credits : credits.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-72 rounded-[var(--radius-xl)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">Marketplace</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            {filteredCredits.length} credit{filteredCredits.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <div className="animate-fade-up delay-1 flex items-center rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-muted)]/80 p-1">
          {(["all", "Listed", "Sold", "Retired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[var(--radius-full)] px-4 py-1.5 text-xs font-medium transition-all duration-[var(--duration-fast)] ${
                filter === f
                  ? "bg-[var(--color-accent)] text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Success toast */}
      {action.success && (
        <div className="animate-slide-in-right flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--success)]/20 bg-[var(--success)]/5 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
          </svg>
          <span className="text-sm font-medium text-[var(--success)]">{action.success}</span>
        </div>
      )}

      {/* Credits grid */}
      {filteredCredits.length === 0 ? (
        <div className="animate-fade-up flex flex-col items-center gap-4 rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border)] py-20 text-center">
          <IconSeedling />
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">No credits found</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {filter !== "all" ? `No ${filter.toLowerCase()} credits available` : "Issue new credits to get started"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCredits.map((credit, index) => (
            <CreditCard
              key={credit.id}
              credit={credit}
              index={index}
              onBuy={(id) => handleActionRequest("buy", id)}
              onRetire={(id) => handleActionRequest("retire", id)}
              onList={(id, action) => handleActionRequest(action, id)}
            />
          ))}
        </div>
      )}

      {/* Secret Key Modal */}
      {showSecretModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSecretModal(false);
              setPendingAction(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="animate-scale-up w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-7 shadow-[var(--shadow-2xl)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent)/10]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
              </div>
              <div>
                <h2 id="modal-title" className="text-lg font-semibold text-[var(--color-foreground)]">
                  Sign Transaction
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Dev mode — enter secret key to sign
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="secret-key" className="block text-xs font-medium text-[var(--color-muted-foreground)]">
                Stellar Secret Key
              </label>
              <input
                id="secret-key"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="S..."
                autoFocus
                className="mt-1.5 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-colors duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </div>

            {action.error && (
              <p className="mt-3 text-xs text-[var(--error)]">{action.error}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowSecretModal(false);
                  setPendingAction(null);
                  setSecretKey("");
                }}
                className="press-effect flex-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={action.loading || !secretKey.trim()}
                className="press-effect flex-1 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:shadow-[var(--shadow-md)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action.loading ? "Signing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

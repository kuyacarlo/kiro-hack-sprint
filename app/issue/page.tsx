"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { issueCredit, runVerification, type IssueCreditInput, type VerificationResult } from "@/lib/api";

type BBox = { west: number; south: number; east: number; north: number };
type NdviOverlay = { bbox: BBox; ndviMean: number; passed: boolean };

// Dynamic import with SSR disabled (Leaflet requires window)
const MapSelector = dynamic(
  () => import("../components/MapSelector").then((m) => m.MapSelector),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          <span className="text-xs text-[var(--color-muted-foreground)]">Loading map...</span>
        </div>
      </div>
    ),
  }
);

const PROJECT_TYPES = [
  "Reforestation",
  "Afforestation",
  "Avoided Deforestation",
  "Soil Carbon",
  "Blue Carbon",
  "Renewable Energy",
  "Methane Capture",
  "Direct Air Capture",
  "Other",
];

const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
  "Global",
];

type FormState = {
  issuer: string;
  projectName: string;
  projectType: string;
  vintageYear: string;
  tonnes: string;
  price: string;
  region: string;
  registryId: string;
};

const initialForm: FormState = {
  issuer: "",
  projectName: "",
  projectType: "",
  vintageYear: new Date().getFullYear().toString(),
  tonnes: "",
  price: "",
  region: "",
  registryId: "",
};

export default function IssueCreditPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ hash: string; creditId?: number } | null>(null);

  // Map & NDVI state
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [ndviResult, setNdviResult] = useState<VerificationResult | null>(null);
  const [ndviLoading, setNdviLoading] = useState(false);
  const [ndviError, setNdviError] = useState<string | null>(null);

  const ndviOverlays: NdviOverlay[] = useMemo(() => {
    if (!ndviResult || ndviResult.ndviMean == null || !bbox) return [];
    return [{ bbox, ndviMean: ndviResult.ndviMean, passed: ndviResult.buyable ?? false }];
  }, [ndviResult, bbox]);

  const handleBBoxFromMap = useCallback((newBbox: BBox) => {
    setBbox(newBbox);
    setNdviResult(null);
    setNdviError(null);
  }, []);

  const handleRunNdvi = async () => {
    if (!bbox) {
      setNdviError("Draw an area on the map first");
      return;
    }
    setNdviError(null);
    setNdviLoading(true);
    try {
      const data = await runVerification({
        bbox,
        sampleGridSize: 16,
        minNdviBps: 3500,
      });
      if (data.ok) {
        setNdviResult(data);
      } else {
        setNdviError(data.error ?? "NDVI verification failed");
      }
    } catch (e) {
      setNdviError(e instanceof Error ? e.message : "NDVI verification failed");
    } finally {
      setNdviLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.issuer.trim()) return setError("Issuer address is required");
    if (!form.projectName.trim()) return setError("Project name is required");
    if (!form.projectType) return setError("Select a project type");
    if (!form.region) return setError("Select a region");
    if (!form.registryId.trim()) return setError("Registry ID is required");
    if (!form.tonnes || Number(form.tonnes) <= 0) return setError("Tonnes must be greater than 0");
    if (!form.price || Number(form.price) <= 0) return setError("Price must be greater than 0");
    if (!form.vintageYear || Number(form.vintageYear) < 1000) return setError("Invalid vintage year");

    setSubmitting(true);
    try {
      const input: IssueCreditInput = {
        issuer: form.issuer.trim(),
        projectName: form.projectName.trim(),
        projectType: form.projectType,
        vintageYear: Number(form.vintageYear),
        tonnes: Number(form.tonnes),
        price: form.price.trim(),
        region: form.region,
        registryId: form.registryId.trim(),
      };

      const result = await issueCredit(input);
      if (result.ok) {
        setSuccess({ hash: result.hash ?? "", creditId: result.creditId });
        setForm(initialForm);
      } else {
        setError(result.error ?? "Failed to issue credit");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue credit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">Issue Credit</h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          Verify project area on the map, then issue a carbon credit on Stellar
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="animate-slide-in-right rounded-[var(--radius-xl)] border border-[var(--success)]/20 bg-[var(--success)]/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--success)]">Credit issued successfully</p>
              {success.hash && (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Tx: <span className="font-mono">{success.hash.slice(0, 24)}...</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Map Verification */}
      <section className="animate-fade-up delay-1 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
            1
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Verify Project Area</h2>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)] pl-10">
          Hold <kbd className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[10px]">Shift</kbd> + drag on the map to select your project area, then run NDVI to confirm vegetation cover.
        </p>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2">
            <MapSelector
              bbox={bbox}
              onBBoxChange={handleBBoxFromMap}
              ndviOverlays={ndviOverlays}
              className="h-[360px] shadow-[var(--shadow-md)]"
            />
          </div>

          {/* NDVI Panel */}
          <div className="space-y-4">
            {/* Selected coordinates */}
            {bbox && (
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-xs)]">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Selected Area</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px] text-[var(--color-foreground)]">
                  <div><span className="text-[var(--color-muted-foreground)]">W:</span> {bbox.west.toFixed(4)}</div>
                  <div><span className="text-[var(--color-muted-foreground)]">E:</span> {bbox.east.toFixed(4)}</div>
                  <div><span className="text-[var(--color-muted-foreground)]">S:</span> {bbox.south.toFixed(4)}</div>
                  <div><span className="text-[var(--color-muted-foreground)]">N:</span> {bbox.north.toFixed(4)}</div>
                </div>
              </div>
            )}

            {/* Run NDVI button */}
            <button
              onClick={handleRunNdvi}
              disabled={ndviLoading || !bbox}
              className="press-effect w-full rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ndviLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                  </svg>
                  Run NDVI Check
                </span>
              )}
            </button>

            {/* NDVI Error */}
            {ndviError && (
              <div className="rounded-[var(--radius-md)] border border-[var(--error)]/20 bg-[var(--error)]/5 px-3 py-2">
                <span className="text-[11px] text-[var(--error)]">{ndviError}</span>
              </div>
            )}

            {/* NDVI Result */}
            {ndviResult && ndviResult.ndviMean != null && (
              <div className={`animate-scale-up space-y-3 rounded-[var(--radius-xl)] border p-4 ${
                ndviResult.buyable
                  ? "border-[var(--success)]/20 bg-[var(--success)]/5"
                  : "border-[var(--error)]/20 bg-[var(--error)]/5"
              }`}>
                <div className="flex items-center gap-2">
                  {ndviResult.buyable ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                    </svg>
                  )}
                  <span className={`text-sm font-semibold ${ndviResult.buyable ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                    {ndviResult.buyable ? "Eligible" : "Not Eligible"}
                  </span>
                </div>

                {/* Gauge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-muted-foreground)]">NDVI</span>
                    <span className={`font-bold ${ndviResult.buyable ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                      {(ndviResult.ndviMean * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-muted)]">
                    <div
                      className={`h-full rounded-[var(--radius-full)] transition-all duration-700 ${
                        ndviResult.buyable ? "bg-[var(--color-accent)]" : "bg-[var(--error)]"
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, ndviResult.ndviMean * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-[var(--radius-sm)] bg-[var(--color-background)]/50 px-2 py-1.5">
                    <span className="text-[var(--color-muted-foreground)]">BPS</span>
                    <p className="font-mono font-medium text-[var(--color-foreground)]">{ndviResult.ndviBps}</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-[var(--color-background)]/50 px-2 py-1.5">
                    <span className="text-[var(--color-muted-foreground)]">Threshold</span>
                    <p className="font-mono font-medium text-[var(--color-foreground)]">{ndviResult.minNdviBps} BPS</p>
                  </div>
                </div>
              </div>
            )}

            {/* No area selected */}
            {!bbox && (
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-6 text-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                </svg>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  Draw a rectangle on the map to select the project area
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Step 2: Issue Form */}
      <section className="animate-fade-up delay-2 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
            2
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Credit Details</h2>
          {ndviResult?.buyable && (
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-accent)/10] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
              </svg>
              NDVI Verified
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="animate-slide-in-right rounded-[var(--radius-lg)] border border-[var(--error)]/20 bg-[var(--error)]/5 p-4 pl-10">
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
              </svg>
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pl-10">
          {/* Issuer Address */}
          <div className="space-y-1.5">
            <label htmlFor="issuer" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Issuer Address <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="issuer"
              name="issuer"
              type="text"
              value={form.issuer}
              onChange={handleChange}
              placeholder="G..."
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>

          {/* Project Name */}
          <div className="space-y-1.5">
            <label htmlFor="projectName" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Project Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="projectName"
              name="projectName"
              type="text"
              value={form.projectName}
              onChange={handleChange}
              placeholder="e.g. Amazon Rainforest Conservation"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>

          {/* Project Type & Region */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="projectType" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Project Type <span className="text-[var(--error)]">*</span>
              </label>
              <select
                id="projectType"
                name="projectType"
                value={form.projectType}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              >
                <option value="">Select type...</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="region" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Region <span className="text-[var(--error)]">*</span>
              </label>
              <select
                id="region"
                name="region"
                value={form.region}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              >
                <option value="">Select region...</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vintage Year, Tonnes, Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="vintageYear" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Vintage Year <span className="text-[var(--error)]">*</span>
              </label>
              <input
                id="vintageYear"
                name="vintageYear"
                type="number"
                min="2000"
                max="2100"
                value={form.vintageYear}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tonnes" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Tonnes CO2 <span className="text-[var(--error)]">*</span>
              </label>
              <input
                id="tonnes"
                name="tonnes"
                type="number"
                min="1"
                step="1"
                value={form.tonnes}
                onChange={handleChange}
                placeholder="1000"
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="price" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Price (XLM) <span className="text-[var(--error)]">*</span>
              </label>
              <input
                id="price"
                name="price"
                type="text"
                value={form.price}
                onChange={handleChange}
                placeholder="250.00"
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </div>
          </div>

          {/* Registry ID */}
          <div className="space-y-1.5">
            <label htmlFor="registryId" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Registry ID <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="registryId"
              name="registryId"
              type="text"
              value={form.registryId}
              onChange={handleChange}
              placeholder="e.g. VCS-1234"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-all duration-[var(--duration-fast)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="press-effect w-full rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Issuing Credit..." : "Issue Carbon Credit"}
            </button>
          </div>
        </form>
      </section>

      {/* Info */}
      <div className="animate-fade-up delay-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)] p-5">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <div className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            <strong className="text-[var(--color-foreground)]">Workflow:</strong> First verify your project area using the satellite map (Step 1). Draw a rectangle over the project site and run the NDVI check. Once vegetation is confirmed, fill in the credit details (Step 2) and issue on-chain. The NDVI verification is optional but recommended for credibility.
          </div>
        </div>
      </div>
    </div>
  );
}

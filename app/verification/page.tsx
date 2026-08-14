"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { runVerification, fetchOpenEOStatus, type VerificationResult, type OpenEOStatus } from "@/lib/api";

// Dynamic import with SSR disabled (Leaflet requires window)
const MapSelector = dynamic(
  () => import("../components/MapSelector").then((m) => m.MapSelector),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          <span className="text-xs text-[var(--color-muted-foreground)]">Loading map...</span>
        </div>
      </div>
    ),
  }
);

type BBox = { west: number; south: number; east: number; north: number };
type BBoxStr = { west: string; south: string; east: string; north: string };

type NdviOverlay = {
  bbox: BBox;
  ndviMean: number;
  passed: boolean;
};

const PRESET_LOCATIONS: { name: string; bbox: BBox }[] = [
  { name: "Amazon (Brazil)", bbox: { west: -60.5, south: -3.5, east: -59.5, north: -2.5 } },
  { name: "Borneo (Malaysia)", bbox: { west: 116.0, south: 1.5, east: 117.0, north: 2.5 } },
  { name: "Congo Basin (DRC)", bbox: { west: 20.0, south: -2.0, east: 21.0, north: -1.0 } },
  { name: "Sumatra (Indonesia)", bbox: { west: 101.5, south: -0.5, east: 102.5, north: 0.5 } },
  { name: "Queensland (AU)", bbox: { west: 145.5, south: -16.5, east: 146.5, north: -15.5 } },
  { name: "Costa Rica", bbox: { west: -84.5, south: 9.5, east: -83.5, north: 10.5 } },
];

function NdviGauge({ value, minThreshold }: { value: number; minThreshold: number }) {
  const thresholdNormalized = Math.max(0, Math.min(1, minThreshold / 10000));
  const percentage = Math.max(0, Math.min(100, Math.round(value * 100)));
  const passed = value * 10000 >= minThreshold;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">NDVI</span>
        <span className={`text-base font-bold ${passed ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-muted)]">
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-[var(--color-foreground)]/60"
          style={{ left: `${thresholdNormalized * 100}%` }}
        />
        <div
          className={`h-full rounded-[var(--radius-full)] transition-all duration-700 ease-out ${
            passed ? "bg-gradient-to-r from-[#059669] to-[#34D399]" : "bg-gradient-to-r from-[var(--error)] to-[#F87171]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [bboxStr, setBboxStr] = useState<BBoxStr>({ west: "", south: "", east: "", north: "" });
  const [gridSize, setGridSize] = useState("16");
  const [minNdvi, setMinNdvi] = useState("3500");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<(VerificationResult & { bbox: BBox })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openeoStatus, setOpeneoStatus] = useState<OpenEOStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const ndviOverlays: NdviOverlay[] = useMemo(() => {
    return results
      .filter((r) => r.ndviMean != null)
      .map((r) => ({
        bbox: r.bbox,
        ndviMean: r.ndviMean!,
        passed: r.buyable ?? false,
      }));
  }, [results]);

  const handleBBoxFromMap = useCallback((newBbox: BBox) => {
    setBbox(newBbox);
    setBboxStr({
      west: newBbox.west.toString(),
      south: newBbox.south.toString(),
      east: newBbox.east.toString(),
      north: newBbox.north.toString(),
    });
    setError(null);
  }, []);

  const handlePreset = (preset: { bbox: BBox }) => {
    handleBBoxFromMap(preset.bbox);
  };

  const handleBboxStrChange = (key: keyof BBoxStr, value: string) => {
    setBboxStr((prev) => ({ ...prev, [key]: value }));
    const w = key === "west" ? parseFloat(value) : parseFloat(bboxStr.west);
    const s = key === "south" ? parseFloat(value) : parseFloat(bboxStr.south);
    const e = key === "east" ? parseFloat(value) : parseFloat(bboxStr.east);
    const n = key === "north" ? parseFloat(value) : parseFloat(bboxStr.north);
    if ([w, s, e, n].every((v) => !isNaN(v))) {
      setBbox({ west: w, south: s, east: e, north: n });
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const status = await fetchOpenEOStatus();
      setOpeneoStatus(status);
    } catch (e) {
      setOpeneoStatus({ ok: false, error: e instanceof Error ? e.message : "Failed" });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRunVerification = async () => {
    if (!bbox) {
      setError("Select an area on the map or enter coordinates");
      return;
    }
    if (bbox.west >= bbox.east || bbox.south >= bbox.north) {
      setError("Invalid bounding box — check coordinates");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await runVerification({
        bbox,
        sampleGridSize: parseInt(gridSize) || 16,
        minNdviBps: parseInt(minNdvi) || 3500,
      });

      if (data.ok) {
        setResults((prev) => [{ ...data, bbox }, ...prev]);
      } else {
        setError(data.error ?? "Verification failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const latestResult = results[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">NDVI Verification</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            Select an area on the map to analyze vegetation via Sentinel-2 satellite
          </p>
        </div>
        <button
          onClick={handleCheckStatus}
          disabled={checkingStatus}
          className="animate-fade-up delay-1 press-effect inline-flex items-center gap-2 self-start rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-medium text-[var(--color-muted-foreground)] shadow-[var(--shadow-xs)] transition-all duration-[var(--duration-fast)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
          </svg>
          {checkingStatus ? "Checking..." : "Check openEO"}
        </button>
      </div>

      {/* OpenEO Status */}
      {openeoStatus && (
        <div className={`animate-slide-in-right rounded-[var(--radius-lg)] border px-4 py-3 text-sm ${
          openeoStatus.ok
            ? "border-[var(--success)]/20 bg-[var(--success)]/5"
            : "border-[var(--error)]/20 bg-[var(--error)]/5"
        }`}>
          {openeoStatus.ok ? (
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
              </svg>
              <span className="text-xs font-medium text-[var(--success)]">
                Connected — {openeoStatus.collections} collections • {openeoStatus.authStatus}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--error)]">{openeoStatus.error}</span>
          )}
        </div>
      )}

      {/* Main layout: Map + Controls side panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Map */}
        <div className="animate-fade-up delay-1 lg:col-span-3">
          <MapSelector
            bbox={bbox}
            onBBoxChange={handleBBoxFromMap}
            ndviOverlays={ndviOverlays}
            className="h-[500px] shadow-[var(--shadow-md)]"
          />
        </div>

        {/* Side panel: Controls + Results */}
        <div className="animate-fade-up delay-2 space-y-5 lg:col-span-1">
          {/* Preset locations */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Presets</h3>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="press-effect rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-muted-foreground)] transition-all duration-[var(--duration-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Coordinate inputs */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Coordinates</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["west", "south", "east", "north"] as const).map((key) => (
                <div key={key}>
                  <label className="text-[9px] font-medium uppercase text-[var(--color-muted-foreground)]">{key}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={bboxStr[key]}
                    onChange={(e) => handleBboxStrChange(key, e.target.value)}
                    placeholder={key === "west" || key === "east" ? "Lng" : "Lat"}
                    className="mt-0.5 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Parameters</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-medium uppercase text-[var(--color-muted-foreground)]">Grid (px)</label>
                <input
                  type="number"
                  min="4"
                  max="64"
                  value={gridSize}
                  onChange={(e) => setGridSize(e.target.value)}
                  className="mt-0.5 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20"
                />
              </div>
              <div>
                <label className="text-[9px] font-medium uppercase text-[var(--color-muted-foreground)]">Min NDVI</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={minNdvi}
                  onChange={(e) => setMinNdvi(e.target.value)}
                  className="mt-0.5 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-[var(--radius-md)] border border-[var(--error)]/20 bg-[var(--error)]/5 px-3 py-2">
              <span className="text-[10px] text-[var(--error)]">{error}</span>
            </div>
          )}

          {/* Run button */}
          <button
            onClick={handleRunVerification}
            disabled={loading || !bbox}
            className="press-effect w-full rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                </svg>
                Run NDVI Analysis
              </span>
            )}
          </button>

          {/* Latest Result */}
          {latestResult && latestResult.ndviMean != null && (
            <div className={`animate-scale-up space-y-3 rounded-[var(--radius-xl)] border p-4 ${
              latestResult.buyable
                ? "border-[var(--success)]/20 bg-[var(--success)]/5"
                : "border-[var(--error)]/20 bg-[var(--error)]/5"
            }`}>
              {/* Verdict */}
              <div className="flex items-center gap-2">
                {latestResult.buyable ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                  </svg>
                )}
                <span className={`text-sm font-semibold ${latestResult.buyable ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                  {latestResult.buyable ? "Eligible" : "Not Eligible"}
                </span>
              </div>

              {/* Gauge */}
              <NdviGauge value={latestResult.ndviMean} minThreshold={latestResult.minNdviBps ?? 3500} />

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-background)]/50 px-2 py-1.5">
                  <span className="text-[var(--color-muted-foreground)]">BPS</span>
                  <p className="font-mono font-medium text-[var(--color-foreground)]">{latestResult.ndviBps}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-background)]/50 px-2 py-1.5">
                  <span className="text-[var(--color-muted-foreground)]">Source</span>
                  <p className="font-medium text-[var(--color-foreground)]">{latestResult.source}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History of results */}
      {results.length > 1 && (
        <div className="animate-fade-up space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Analysis History</h2>
          <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-xs)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Area</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">NDVI</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">BPS</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {results.map((r, i) => (
                  <tr key={i} className="transition-colors hover:bg-[var(--color-muted)]">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[var(--color-muted-foreground)]">
                      {r.bbox.south.toFixed(2)},{r.bbox.west.toFixed(2)} → {r.bbox.north.toFixed(2)},{r.bbox.east.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[var(--color-foreground)]">
                      {r.ndviMean != null ? (r.ndviMean * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[var(--color-foreground)]">{r.ndviBps ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-[10px] font-medium ${
                        r.buyable
                          ? "bg-[var(--color-accent)/10] text-[var(--color-accent)]"
                          : "bg-[var(--error)]/10 text-[var(--error)]"
                      }`}>
                        {r.buyable ? "Pass" : "Fail"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)] p-5">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <div className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            <strong className="text-[var(--color-foreground)]">How it works:</strong> Select an area by holding Shift and dragging on the map, or click a preset location. The system queries Copernicus Sentinel-2 satellite imagery via openEO, computes the mean NDVI (vegetation index), and determines eligibility based on the threshold (default 35%). Results are overlaid on the map — green for pass, red for fail.
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type NdviOverlay = {
  bbox: BBox;
  ndviMean: number;
  passed: boolean;
};

type MapSelectorProps = {
  bbox: BBox | null;
  onBBoxChange: (bbox: BBox) => void;
  ndviOverlays: NdviOverlay[];
  className?: string;
};

export function MapSelector({ bbox, onBBoxChange, ndviOverlays, className }: MapSelectorProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const drawStartRef = useRef<L.LatLng | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [0, 20],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    });

    // Satellite tile layer (ESRI World Imagery — free, no key)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 18,
      }
    ).addTo(map);

    // Labels overlay
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
        opacity: 0.7,
      }
    ).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw rectangle handler
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (!e.originalEvent.shiftKey) return;
      map.dragging.disable();
      drawStartRef.current = e.latlng;
      setIsDrawing(true);

      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!drawStartRef.current) return;
      const bounds = L.latLngBounds(drawStartRef.current, e.latlng);

      if (rectangleRef.current) {
        rectangleRef.current.setBounds(bounds);
      } else {
        rectangleRef.current = L.rectangle(bounds, {
          color: "#10b981",
          weight: 2,
          fillOpacity: 0.15,
          fillColor: "#10b981",
          dashArray: "6 3",
        }).addTo(map);
      }
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      map.dragging.enable();
      if (!drawStartRef.current) return;

      const start = drawStartRef.current;
      const end = e.latlng;
      drawStartRef.current = null;
      setIsDrawing(false);

      const west = Math.min(start.lng, end.lng);
      const east = Math.max(start.lng, end.lng);
      const south = Math.min(start.lat, end.lat);
      const north = Math.max(start.lat, end.lat);

      // Minimum area check
      if (Math.abs(east - west) > 0.001 && Math.abs(north - south) > 0.001) {
        const newBbox: BBox = {
          west: parseFloat(west.toFixed(4)),
          south: parseFloat(south.toFixed(4)),
          east: parseFloat(east.toFixed(4)),
          north: parseFloat(north.toFixed(4)),
        };
        onBBoxChange(newBbox);

        if (rectangleRef.current) {
          rectangleRef.current.setStyle({
            dashArray: undefined,
            weight: 2,
            color: "#10b981",
            fillOpacity: 0.2,
          });
        }
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
    };
  }, [mapReady, onBBoxChange]);

  // Update rectangle when bbox changes externally (presets)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !bbox) return;
    const map = mapRef.current;

    if (rectangleRef.current) {
      map.removeLayer(rectangleRef.current);
    }

    const bounds = L.latLngBounds(
      [bbox.south, bbox.west],
      [bbox.north, bbox.east]
    );

    rectangleRef.current = L.rectangle(bounds, {
      color: "#10b981",
      weight: 2,
      fillOpacity: 0.2,
      fillColor: "#10b981",
    }).addTo(map);

    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
  }, [bbox, mapReady]);

  // Render NDVI overlays
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    // Remove previous overlay layers (keep only tile layers and the selection rect)
    map.eachLayer((layer) => {
      if (layer instanceof L.Rectangle && layer !== rectangleRef.current) {
        map.removeLayer(layer);
      }
    });

    ndviOverlays.forEach((overlay) => {
      const bounds = L.latLngBounds(
        [overlay.bbox.south, overlay.bbox.west],
        [overlay.bbox.north, overlay.bbox.east]
      );

      const color = overlay.passed ? "#10b981" : "#ef4444";
      const rect = L.rectangle(bounds, {
        color,
        weight: 3,
        fillOpacity: 0.25,
        fillColor: color,
      }).addTo(map);

      rect.bindPopup(
        `<div style="font-family: system-ui; font-size: 12px; line-height: 1.5;">
          <strong>NDVI: ${(overlay.ndviMean * 100).toFixed(1)}%</strong><br/>
          Status: <span style="color: ${color}; font-weight: 600;">${overlay.passed ? "PASSED" : "FAILED"}</span>
        </div>`
      );
    });
  }, [ndviOverlays, mapReady]);

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] ${className ?? ""}`}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: "400px" }} />

      {/* Drawing instruction overlay */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000]">
        <div className="glass rounded-[var(--radius-lg)] px-3 py-2 text-[11px] font-medium text-[var(--color-muted-foreground)] shadow-[var(--shadow-md)]">
          {isDrawing ? (
            <span className="text-[var(--color-accent)]">Release to set area</span>
          ) : (
            <span>Hold <kbd className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[10px]">Shift</kbd> + drag to select area</span>
          )}
        </div>
      </div>

      {/* Coordinates display */}
      {bbox && (
        <div className="pointer-events-none absolute top-3 right-3 z-[1000]">
          <div className="glass rounded-[var(--radius-lg)] px-3 py-2 font-mono text-[10px] text-[var(--color-muted-foreground)] shadow-[var(--shadow-md)]">
            {bbox.south.toFixed(3)}, {bbox.west.toFixed(3)} → {bbox.north.toFixed(3)}, {bbox.east.toFixed(3)}
          </div>
        </div>
      )}
    </div>
  );
}

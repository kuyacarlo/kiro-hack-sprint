// Carbon estimation from satellite NDVI.
//
// Model (documented, hackathon-grade):
//   1. NDVI -> fractional vegetation cover (FVC) via the standard linear mixing
//      formula: FVC = ((NDVI - NDVI_soil) / (NDVI_veg - NDVI_soil))^2
//      with NDVI_soil = 0.10 (bare soil) and NDVI_veg = 0.90 (dense canopy).
//   2. FVC -> standing carbon stock: C (tC/ha) = FVC * C_max, where C_max is
//      the assumed maximum carbon density for the region class (default
//      15 tC/ha, a temperate/agricultural mixed-vegetation default).
//   3. tC -> tCO2e via the CO2/C molecular ratio: 3.664.
//
// Only "vegetated" pixels (NDVI >= 0.20) contribute to the estimate.

export type GeometryInput = {
  bbox: { west: number; south: number; east: number; north: number };
  polygon?: Array<[number, number]>;
  center?: { lat: number; lng: number; radiusKm: number };
};

export type CarbonEstimate = {
  /** Vegetation cover fraction from the NDVI raster (pixels >= 0.2 / total). */
  vegetationFraction: number;
  /** Estimated carbon stock per hectare, in tCO2e. */
  tco2ePerHa: number;
  /** Total estimated carbon stock for the selected area, in tCO2e. */
  totalTco2e: number;
  /** Area of the selected geometry in hectares. */
  areaHa: number;
  /** Assumed maximum carbon density used in the model, tC/ha. */
  maxCarbonDensityTcPerHa: number;
  model: "fvc-linear-mixing";
};

export const NDVI_SOIL = 0.1;
export const NDVI_VEG = 0.9;
export const DEFAULT_MAX_CARBON_DENSITY_TC_HA = 15;
export const CO2E_PER_TC = 3.664;
export const NDVI_VEGETATION_THRESHOLD = 0.2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Fraction of NDVI pixels that count as vegetated (>= 0.2). */
export function vegetationFractionFromNdvi(ndviMean: number, ndviThreshold = NDVI_VEGETATION_THRESHOLD) {
  if (!Number.isFinite(ndviMean)) return 0;
  return clamp((ndviMean - ndviThreshold) / (NDVI_VEG - ndviThreshold), 0, 1);
}

/** NDVI -> fractional vegetation cover, 0..1. */
export function fvcFromNdvi(ndviMean: number) {
  if (!Number.isFinite(ndviMean)) return 0;
  const fvc = (ndviMean - NDVI_SOIL) / (NDVI_VEG - NDVI_SOIL);
  return clamp(fvc * fvc, 0, 1);
}

/** Carbon stock per hectare in tCO2e, from NDVI. */
export function tco2ePerHaFromNdvi(
  ndviMean: number,
  maxCarbonDensityTcPerHa = DEFAULT_MAX_CARBON_DENSITY_TC_HA,
) {
  return fvcFromNdvi(ndviMean) * maxCarbonDensityTcPerHa * CO2E_PER_TC;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Area of a [lng, lat] polygon ring in hectares, computed on an
 * equirectangular (equidistant cylindrical) projection centered on the
 * polygon's centroid. Good enough for small parcels (< ~100 km across).
 */
export function polygonAreaHa(polygon: Array<[number, number]>) {
  if (polygon.length < 3) return 0;
  let latSum = 0;
  for (const [, lat] of polygon) latSum += lat;
  const centerLat = latSum / polygon.length;
  const latRad = (centerLat * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [lng1, lat1] = polygon[i];
    const [lng2, lat2] = polygon[(i + 1) % polygon.length];
    area += (lng2 * mPerDegLng) * (lat1 * mPerDegLat) - (lng1 * mPerDegLng) * (lat2 * mPerDegLat);
  }
  return Math.abs(area / 2) / 10_000; // m² -> ha
}

/** Bounding box of a [lng, lat] polygon ring. */
export function polygonToBBox(polygon: Array<[number, number]>) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of polygon) {
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }
  return { west, south, east, north };
}

/** Approximate area of a bbox in hectares (haversine-based). */
export function bboxAreaHa(bbox: { west: number; south: number; east: number; north: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bbox.north - bbox.south);
  const dLng = toRad(bbox.east - bbox.west);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(bbox.south)) * Math.cos(toRad(bbox.north)) * Math.sin(dLng / 2) ** 2;
  const distanceKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
  const widthKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.sin(toRad(bbox.east - bbox.west) / 2) ** 2));
  return (distanceKm * widthKm * 100) / 2; // rough rectangular ha (diagonal halved)
}

export function circleAreaHa(radiusKm: number) {
  return Math.PI * radiusKm * radiusKm * 100;
}

/** Resolve a geometry input into its bbox and true area (ha). */
export function resolveGeometry(input: GeometryInput): {
  bbox: { west: number; south: number; east: number; north: number };
  areaHa: number;
  shape: "bbox" | "polygon" | "circle";
} {
  if (input.polygon && input.polygon.length >= 3) {
    return {
      bbox: polygonToBBox(input.polygon),
      areaHa: polygonAreaHa(input.polygon),
      shape: "polygon",
    };
  }
  if (input.center && Number.isFinite(input.center.radiusKm)) {
    const { lat, lng, radiusKm } = input.center;
    const dLat = radiusKm / 111.32;
    const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    return {
      bbox: { west: lng - dLng, south: lat - dLat, east: lng + dLng, north: lat + dLat },
      areaHa: circleAreaHa(radiusKm),
      shape: "circle",
    };
  }
  return { bbox: input.bbox, areaHa: bboxAreaHa(input.bbox), shape: "bbox" };
}

/** Full carbon estimate for an area from a mean NDVI + vegetated fraction. */
export function estimateCarbon(
  ndviMean: number,
  vegetationFraction: number,
  areaHa: number,
  maxCarbonDensityTcPerHa = DEFAULT_MAX_CARBON_DENSITY_TC_HA,
): CarbonEstimate {
  const tco2ePerHa = tco2ePerHaFromNdvi(ndviMean, maxCarbonDensityTcPerHa);
  const vegetatedHa = areaHa * vegetationFraction;
  return {
    vegetationFraction,
    tco2ePerHa,
    totalTco2e: tco2ePerHa * vegetatedHa,
    areaHa,
    maxCarbonDensityTcPerHa,
    model: "fvc-linear-mixing",
  };
}
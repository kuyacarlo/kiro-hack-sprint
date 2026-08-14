import {
  estimateCarbon,
  NDVI_VEGETATION_THRESHOLD,
  resolveGeometry,
} from "@/lib/verification/estimate";

export const runtime = "nodejs";

type BBox = { west: number; south: number; east: number; north: number };
type Polygon = Array<[number, number]>;
type Body = {
  bbox?: BBox;
  /** Ring of [lng, lat] coordinates drawn on the map. */
  polygon?: Polygon;
  /** Google-Maps place selection: center + radius in km. */
  center?: { lat: number; lng: number; radiusKm: number };
  /** Free-text place name from the map, used later for attestation. */
  locationName?: string;
  sampleGridSize?: number;
  temporalExtent?: { start: string; end: string };
  minNdviBps?: number;
};

type Json = Record<string, unknown>;

function trimSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as Json;
}

async function fetchJsonWithRetry(url: string, init?: RequestInit, retries = 3): Promise<Json> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchJson(url, init);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

async function resolveOpenEoApiBase(openeoBase: string) {
  const normalizedBase = trimSlash(openeoBase);
  const wellKnown = (await fetchJson(`${normalizedBase}/.well-known/openeo`)) as {
    versions?: Array<{ url?: string }>;
  };
  const discovered = wellKnown.versions?.find((entry) => Boolean(entry.url))?.url;
  return trimSlash(discovered ?? `${normalizedBase}/1.2.0`);
}

async function getOidcAccessToken(openeoApiBase: string) {
  const clientId = process.env.OPENEO_CLIENT_ID ?? "";
  const clientSecret = process.env.OPENEO_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("Missing OPENEO_CLIENT_ID/OPENEO_CLIENT_SECRET");
  }

  const oidc = (await fetchJsonWithRetry(`${openeoApiBase}/credentials/oidc`)) as {
    providers?: Array<{ id?: string; issuer?: string }>;
  };
  const provider = oidc.providers?.find((p) => p.issuer)?.issuer;
  if (!provider) {
    throw new Error("No OIDC issuer found from /credentials/oidc");
  }

  const discovery = (await fetchJsonWithRetry(
    `${trimSlash(provider)}/.well-known/openid-configuration`,
  )) as { token_endpoint?: string };
  if (!discovery.token_endpoint) {
    throw new Error("OIDC discovery missing token_endpoint");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetchWithRetry(discovery.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(`OIDC token request failed (${tokenRes.status}): ${tokenText.slice(0, 200)}`);
  }
  const tokenJson = JSON.parse(tokenText) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("OIDC token response missing access_token");
  }
  return tokenJson.access_token;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10) + "T00:00:00Z";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidBBox(bbox: BBox) {
  return (
    isFiniteNumber(bbox.west) &&
    isFiniteNumber(bbox.south) &&
    isFiniteNumber(bbox.east) &&
    isFiniteNumber(bbox.north) &&
    (bbox.west === 0 && bbox.east === 0 && bbox.south === 0 && bbox.north === 0 ||
     bbox.west < bbox.east && bbox.south < bbox.north)
  );
}

function clampSampleGridSize(value: unknown) {
  if (!isFiniteNumber(value)) {
    return 16;
  }

  return Math.max(4, Math.min(64, Math.round(value)));
}

async function decodeNdviStatsFromGeoTiff(input: ArrayBuffer) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const { data, info } = await sharp(Buffer.from(input))
    .raw({ depth: "float" })
    .toBuffer({ resolveWithObject: true });

  const floatValues = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
  let sum = 0;
  let count = 0;
  let vegetatedCount = 0;

  const channels = Math.max(info.channels, 1);
  for (let index = 0; index < floatValues.length; index += channels) {
    const value = floatValues[index];
    if (Number.isFinite(value) && value >= -1 && value <= 1) {
      sum += value;
      count += 1;
      if (value >= NDVI_VEGETATION_THRESHOLD) {
        vegetatedCount += 1;
      }
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    ndviMean: sum / count,
    vegetationFraction: vegetatedCount / count,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const hasBbox =
      body?.bbox && isFiniteNumber(body.bbox.west) && isFiniteNumber(body.bbox.south) &&
      isFiniteNumber(body.bbox.east) && isFiniteNumber(body.bbox.north);
    const hasPolygon =
      Array.isArray(body?.polygon) && body.polygon.length >= 3 &&
      body.polygon.every((p) => Array.isArray(p) && p.length === 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1]));
    const hasCenter =
      Boolean(body?.center) && isFiniteNumber(body.center?.lat) && isFiniteNumber(body.center?.lng) &&
      isFiniteNumber(body.center?.radiusKm) && (body.center?.radiusKm ?? 0) > 0;

    if (!hasBbox && !hasPolygon && !hasCenter) {
      return Response.json(
        { ok: false, error: "Provide one of: bbox, polygon ([[lng,lat],...]), or center {lat,lng,radiusKm}" },
        { status: 400 },
      );
    }

    const geometry = resolveGeometry({
      bbox: body.bbox as BBox,
      polygon: body.polygon,
      center: body.center,
    });
    const bbox = geometry.bbox;
    if (!isValidBBox(bbox)) {
      return Response.json({ ok: false, error: "selected area is invalid" }, { status: 400 });
    }

    const openeoSh = trimSlash(
      process.env.OPENEO_SH_BASE_URL ?? "https://openeosh.dataspace.copernicus.eu",
    );
    const openeoApiBase = await resolveOpenEoApiBase(openeoSh);

    const token = await getOidcAccessToken(openeoApiBase);

    const temporalExtent = body.temporalExtent ?? {
      start: daysAgoIso(30),
      end: new Date().toISOString().slice(0, 10) + "T23:59:59Z",
    };

    const minNdviBps = typeof body.minNdviBps === "number" ? body.minNdviBps : 3500;
    const sampleGridSize = clampSampleGridSize(body.sampleGridSize);

    const processBody = {
      process: {
        process_graph: {
          loadcollection: {
            process_id: "load_collection",
            arguments: {
              id: "sentinel-2-l2a",
              spatial_extent: {
                ...bbox,
                width: sampleGridSize,
                height: sampleGridSize,
              },
              temporal_extent: [temporalExtent.start, temporalExtent.end],
              bands: ["B04", "B08"],
            },
          },
          ndvi1: {
            process_id: "ndvi",
            arguments: {
              data: { from_node: "loadcollection" },
              nir: "B08",
              red: "B04",
              target_band: "NDVI",
            },
          },
          save: {
            process_id: "save_result",
            arguments: { data: { from_node: "ndvi1" }, format: "GTIFF" },
            result: true,
          },
        },
        parameters: [],
      },
    };

    const resultRes = await fetchWithRetry(`${openeoApiBase}/result`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(processBody),
    });

    if (!resultRes.ok) {
      const resultText = await resultRes.text();
      return Response.json(
        { ok: false, error: `openEO /result failed (${resultRes.status})`, details: resultText.slice(0, 500) },
        { status: 502 },
      );
    }

    let stats: { ndviMean: number; vegetationFraction: number } | null = null;
    try {
      const raster = await resultRes.arrayBuffer();
      stats = await decodeNdviStatsFromGeoTiff(raster);
    } catch {
      // If raster decoding fails, keep null and return diagnostics.
    }

    if (stats === null) {
      return Response.json(
        { ok: false, error: "Could not decode NDVI GeoTIFF result" },
        { status: 502 },
      );
    }

    const rawNdviBps = Math.round(stats.ndviMean * 10000);
    const ndviBps = Math.max(0, rawNdviBps);
    const buyable = ndviBps >= minNdviBps;
    const source = "openEO-SentinelHub";
    const carbon = estimateCarbon(stats.ndviMean, stats.vegetationFraction, geometry.areaHa);

    return Response.json({
      ok: true,
      bbox,
      geometry: {
        shape: geometry.shape,
        areaHa: Math.round(geometry.areaHa * 100) / 100,
        polygon: body.polygon ?? null,
        center: body.center ?? null,
        locationName: body.locationName ?? null,
      },
      temporalExtent,
      ndviMean: stats.ndviMean,
      rawNdviBps,
      ndviBps,
      minNdviBps,
      buyable,
      vegetationFraction: Math.round(stats.vegetationFraction * 1000) / 1000,
      carbon: {
        tco2ePerHa: Math.round(carbon.tco2ePerHa * 100) / 100,
        totalTco2e: Math.round(carbon.totalTco2e * 100) / 100,
        model: carbon.model,
      },
      sampleGridSize,
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "verification run failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
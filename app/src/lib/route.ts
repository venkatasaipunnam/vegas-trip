/** Live routing, for journeys that are not in the plan.
 *
 *  The trip's own legs are pre-computed at build time (src/mkroutes.py) because they
 *  never change and have to work with no signal.  Anything Sai looks up on the day —
 *  "how do I get from here to there" — cannot be pre-computed, so it is routed in the
 *  browser: Valhalla for walking and driving (it has a real pedestrian profile), with
 *  OSRM as a fallback for driving if Valhalla is unreachable. */

export type LiveMode = "walk" | "car";

export interface LiveRoute {
  geom: [number, number][];
  km: number;
  min: number;
  steps: { text: string; km: number }[];
  via: "valhalla" | "osrm";
}

export interface Point {
  lat: number;
  lng: number;
  name: string;
}

/** Valhalla encodes its shape as a Google-style polyline at 1e-6. */
function decode(s: string, prec = 6): [number, number][] {
  const coords: [number, number][] = [];
  const f = 10 ** prec;
  let i = 0, lat = 0, lng = 0;
  while (i < s.length) {
    for (const first of [true, false]) {
      let shift = 0, result = 0, b: number;
      do {
        b = s.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (first) lat += d; else lng += d;
    }
    coords.push([+(lng / f).toFixed(5), +(lat / f).toFixed(5)]);
  }
  return coords;
}

async function valhalla(a: Point, b: Point, mode: LiveMode, signal: AbortSignal): Promise<LiveRoute> {
  const res = await fetch("https://valhalla1.openstreetmap.de/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      locations: [{ lat: a.lat, lon: a.lng }, { lat: b.lat, lon: b.lng }],
      costing: mode === "walk" ? "pedestrian" : "auto",
      directions_options: { units: "kilometers" },
    }),
  });
  if (!res.ok) throw new Error(`Valhalla ${res.status}`);
  const j = await res.json();
  const leg = j?.trip?.legs?.[0];
  if (!leg?.shape) throw new Error("Valhalla sent no shape");
  return {
    geom: decode(leg.shape),
    km: +j.trip.summary.length.toFixed(2),
    min: Math.max(1, Math.round(j.trip.summary.time / 60)),
    steps: (leg.maneuvers ?? [])
      .map((m: { instruction?: string; length?: number }) => ({
        text: (m.instruction ?? "").trim(), km: +(m.length ?? 0).toFixed(2),
      }))
      .filter((s: { text: string }) => s.text),
    via: "valhalla",
  };
}

async function osrm(a: Point, b: Point, signal: AbortSignal): Promise<LiveRoute> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}` +
    "?overview=full&geometries=geojson&steps=true";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const j = await res.json();
  const r = j?.routes?.[0];
  if (!r?.geometry?.coordinates?.length) throw new Error("OSRM sent no geometry");
  return {
    geom: r.geometry.coordinates.map(([x, y]: [number, number]) => [+x.toFixed(5), +y.toFixed(5)]),
    km: +(r.distance / 1000).toFixed(2),
    min: Math.max(1, Math.round(r.duration / 60)),
    steps: (r.legs?.[0]?.steps ?? [])
      .map((s: { name?: string; maneuver?: { type?: string; modifier?: string }; distance: number }) => ({
        text: [s.maneuver?.type, s.maneuver?.modifier, s.name && `onto ${s.name}`]
          .filter(Boolean).join(" ").replace(/^\w/, (c) => c.toUpperCase()),
        km: +(s.distance / 1000).toFixed(2),
      }))
      .filter((s: { text: string }) => s.text),
    via: "osrm",
  };
}

export async function liveRoute(a: Point, b: Point, mode: LiveMode, signal: AbortSignal) {
  try {
    return await valhalla(a, b, mode, signal);
  } catch (e) {
    if (signal.aborted) throw e;
    // OSRM's public server only answers for cars, so a failed walk has nowhere to go.
    if (mode === "car") return await osrm(a, b, signal);
    throw e;
  }
}

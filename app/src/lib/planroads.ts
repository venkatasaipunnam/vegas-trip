import { useEffect, useState } from "react";
import { liveRoute } from "./route";
import type { Stop } from "./plans";

/** Where a saved plan's lines come from.
 *
 *  The Vegas trip's legs are routed at build time and shipped with the app; a plan Sai
 *  builds himself cannot be — those places did not exist when the app was built.  So each
 *  leg is routed in the browser once, kept in localStorage, and the straight line between
 *  two stops stays on the map until its road arrives.  Transit has no free router, so a
 *  transit leg borrows the driving line: the Deuce does follow the road. */

export const MODE_COLOUR: Record<string, string> = {
  walk: "#5ee39a", transit: "#3fe0e8", cab: "#ffb547",
};
const ROADS = "np-planroads";

export const legKeyOf = (a: Stop, b: Stop, mode?: string) =>
  `${a.lat},${a.lng}>${b.lat},${b.lng}:${mode ?? b.mode ?? "walk"}`;

/** Geometry, distance and time: the viewer's next-leg bar needs all three, and asking
 *  the router twice for the same leg would be wasteful. */
export interface Road {
  geom: [number, number][];
  km: number;
  min: number;
}

/** Route one leg in all three modes, so a plan's bar can offer the same choice the
 *  itinerary's does — the time and distance for walking, riding and a cab side by side,
 *  rather than only the mode that happens to be saved on the stop.  Transit borrows the
 *  driving line, which is honest for the Deuce and approximate for anything on rails;
 *  there is no free transit router to ask. */
export function useLegModes(a: Stop | undefined, b: Stop | undefined) {
  const [out, setOut] = useState<Record<string, Road>>({});

  useEffect(() => {
    setOut({});
    if (!a || !b) return;
    const ac = new AbortController();
    (async () => {
      for (const mode of ["walk", "cab"] as const) {
        const k = legKeyOf(a, b, mode);
        const cached = cachedRoad(k);
        if (cached) { setOut((p) => ({ ...p, [mode]: cached })); continue; }
        try {
          const r = await liveRoute(
            { lat: a.lat, lng: a.lng, name: a.name },
            { lat: b.lat, lng: b.lng, name: b.name },
            mode === "walk" ? "walk" : "car",
            ac.signal,
          );
          const road: Road = { geom: r.geom, km: r.km, min: r.min };
          putRoad(k, road);
          setOut((p) => ({ ...p, [mode]: road }));
        } catch {
          if (ac.signal.aborted) return;
        }
      }
    })();
    return () => ac.abort();
  }, [a?.lat, a?.lng, b?.lat, b?.lng]);   // eslint-disable-line react-hooks/exhaustive-deps

  return out;
}

function cachedRoad(k: string): Road | null {
  try {
    return (JSON.parse(localStorage.getItem(ROADS) || "{}") as Record<string, Road>)[k] ?? null;
  } catch {
    return null;
  }
}
function putRoad(k: string, road: Road) {
  try {
    const all = JSON.parse(localStorage.getItem(ROADS) || "{}");
    all[k] = road;
    localStorage.setItem(ROADS, JSON.stringify(all));
  } catch {
    /* full or private: it will simply be routed again next time */
  }
}

export function usePlanRoads(stops: Stop[]) {
  const [roads, setRoads] = useState<Record<string, Road>>(() => {
    try { return JSON.parse(localStorage.getItem(ROADS) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const found: Record<string, Road> = {};
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        const k = legKeyOf(a, b);
        if (roads[k] || found[k]) continue;
        try {
          const r = await liveRoute(
            { lat: a.lat, lng: a.lng, name: a.name },
            { lat: b.lat, lng: b.lng, name: b.name },
            (b.mode ?? "walk") === "walk" ? "walk" : "car",
            ac.signal,
          );
          found[k] = { geom: r.geom, km: r.km, min: r.min };
        } catch {
          if (ac.signal.aborted) return;   // the straight line stays; nothing else to do
        }
      }
      if (ac.signal.aborted || !Object.keys(found).length) return;
      setRoads((prev) => {
        const next = { ...prev, ...found };
        try { localStorage.setItem(ROADS, JSON.stringify(next)); } catch { /* full */ }
        return next;
      });
    })();
    return () => ac.abort();
  }, [stops]);   // eslint-disable-line react-hooks/exhaustive-deps

  return roads;
}

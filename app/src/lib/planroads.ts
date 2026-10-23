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

export const legKeyOf = (a: Stop, b: Stop) =>
  `${a.lat},${a.lng}>${b.lat},${b.lng}:${b.mode ?? "walk"}`;

/** Geometry, distance and time: the viewer's next-leg bar needs all three, and asking
 *  the router twice for the same leg would be wasteful. */
export interface Road {
  geom: [number, number][];
  km: number;
  min: number;
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

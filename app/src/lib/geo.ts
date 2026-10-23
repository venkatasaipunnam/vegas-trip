import type { Place } from "../types";

export const R_EARTH = 6371;

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const dla = (b.lat - a.lat) * r;
  const dlo = (b.lng - a.lng) * r;
  const h =
    Math.sin(dla / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlo / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

const COMPASS = [
  "north", "north-east", "east", "south-east",
  "south", "south-west", "west", "north-west",
];

export function bearingOf(a: Place, b: Place) {
  const r = Math.PI / 180;
  const dl = (b.lng - a.lng) * r;
  const y = Math.sin(dl) * Math.cos(b.lat * r);
  const x =
    Math.cos(a.lat * r) * Math.sin(b.lat * r) -
    Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/** "north-west" — what someone on foot at a crossing actually needs. */
export const headingOf = (a: Place, b: Place) =>
  COMPASS[Math.round(bearingOf(a, b) / 45) % 8];

export const kmLabel = (d: number) => (d < 10 ? d.toFixed(1) : String(Math.round(d)));

/** Fallback when a leg has no pre-computed route: straight-line time at a plain speed. */
export function roughMins(mode: string, a: Place, b: Place) {
  const d = km(a, b);
  const speed = mode === "walk" ? 4.6 : mode === "cab" ? 34 : 22;
  return Math.max(2, Math.round((d / speed) * 60));
}

/** What the plan implies, when nothing has been pre-computed or chosen. */
export function modeFromStep(how: string, cab: boolean, a: Place, b: Place) {
  const h = (how || "").toLowerCase();
  if (cab || /\b(cab|taxi|uber|lyft|rideshare|drive|tour bus|pickup)\b/.test(h)) return "cab" as const;
  if (/walk|stroll|on foot|steps/.test(h)) return "walk" as const;
  if (/bus|deuce|monorail|metro|tram|train|shuttle|line|airport|flight|fly/.test(h)) return "transit" as const;
  return km(a, b) < 1.1 ? ("walk" as const) : ("transit" as const);
}

export const gdir = (a: Place, b: Place, m: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=${m}`;
export const gmap = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const gearth = (p: Place) =>
  `https://earth.google.com/web/search/${encodeURIComponent(p.q)}/@${p.lat},${p.lng},800a,2000d,35y,0h,60t,0r`;
export const amap = (p: Place) =>
  `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=r`;
export const uberURL = (a: Place, b: Place) =>
  `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${a.lat}&pickup[longitude]=${a.lng}` +
  `&pickup[nickname]=${encodeURIComponent(a.n)}&dropoff[latitude]=${b.lat}` +
  `&dropoff[longitude]=${b.lng}&dropoff[nickname]=${encodeURIComponent(b.n)}`;
export const lyftURL = (a: Place, b: Place) =>
  `https://lyft.com/ride?id=lyft&pickup[latitude]=${a.lat}&pickup[longitude]=${a.lng}` +
  `&destination[latitude]=${b.lat}&destination[longitude]=${b.lng}`;

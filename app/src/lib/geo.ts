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

export const gdir = (a: Place, b: Place, m: string) => {
  const from = kerb(a), to = kerb(b);
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}` +
    `&destination=${to.lat},${to.lng}&travelmode=${m}`;
};
export const gmap = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const gearth = (p: Place) =>
  `https://earth.google.com/web/search/${encodeURIComponent(p.q)}/@${p.lat},${p.lng},800a,2000d,35y,0h,60t,0r`;
export const amap = (p: Place) =>
  `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=r`;
/** The kerb, not the pin.  A cab cannot stop in the middle of the Bellagio, so every
 *  ride link starts and ends at the place's entrance point when it has one. */
export const kerb = (p: Place) => (p.ent ? { lat: p.ent[0], lng: p.ent[1] } : { lat: p.lat, lng: p.lng });

/** An address for the driver's screen.  We hold no street addresses, and a name plus
 *  the right city is what both apps geocode back to the same spot — it is also what
 *  Sai will recognise in the confirmation screen. */
export const addressOf = (p: Place) =>
  `${p.n}, ${p.v === "la" ? "Los Angeles, CA" : p.v === "trip" ? "NV" : "Las Vegas, NV"}`;

/** The same two links for any pair of points, not just trip stops: the landing page
 *  routes from wherever he is standing to anywhere he searches for. */
export function rideUrl(service: "uber" | "lyft",
                        a: { lat: number; lng: number; name: string; address?: string },
                        b: { lat: number; lng: number; name: string; address?: string }) {
  if (service === "uber") {
    const q = new URLSearchParams({
      action: "setPickup",
      "pickup[latitude]": String(a.lat),
      "pickup[longitude]": String(a.lng),
      "pickup[nickname]": a.name,
      "pickup[formatted_address]": a.address ?? a.name,
      "dropoff[latitude]": String(b.lat),
      "dropoff[longitude]": String(b.lng),
      "dropoff[nickname]": b.name,
      "dropoff[formatted_address]": b.address ?? b.name,
    });
    return `https://m.uber.com/ul/?${q.toString()}`;
  }
  const q = new URLSearchParams({
    id: "lyft",
    "pickup[latitude]": String(a.lat),
    "pickup[longitude]": String(a.lng),
    "pickup[address]": a.address ?? a.name,
    "destination[latitude]": String(b.lat),
    "destination[longitude]": String(b.lng),
    "destination[address]": b.address ?? b.name,
  });
  return `https://lyft.com/ride?${q.toString()}`;
}

/** Google Directions between any two points, with the travel mode already chosen. */
export const dirUrl = (a: { lat: number; lng: number }, b: { lat: number; lng: number }, mode: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}` +
  `&destination=${b.lat},${b.lng}&travelmode=${mode}`;

/** Uber's universal link, filled on both ends: coordinates so the pin lands exactly,
 *  nickname and address so the rider can read back where they are going.  The app
 *  opens on the confirm screen with the route already set; without the dropoff half it
 *  opens on an empty "where to?". */
export function uberURL(a: Place, b: Place) {
  const from = kerb(a), to = kerb(b);
  const q = new URLSearchParams({
    action: "setPickup",
    "pickup[latitude]": String(from.lat),
    "pickup[longitude]": String(from.lng),
    "pickup[nickname]": a.n,
    "pickup[formatted_address]": addressOf(a),
    "dropoff[latitude]": String(to.lat),
    "dropoff[longitude]": String(to.lng),
    "dropoff[nickname]": b.n,
    "dropoff[formatted_address]": addressOf(b),
  });
  return `https://m.uber.com/ul/?${q.toString()}`;
}

/** Lyft takes the same two ends under its own parameter names. */
export function lyftURL(a: Place, b: Place) {
  const from = kerb(a), to = kerb(b);
  const q = new URLSearchParams({
    id: "lyft",
    "pickup[latitude]": String(from.lat),
    "pickup[longitude]": String(from.lng),
    "pickup[address]": addressOf(a),
    "destination[latitude]": String(to.lat),
    "destination[longitude]": String(to.lng),
    "destination[address]": addressOf(b),
  });
  return `https://lyft.com/ride?${q.toString()}`;
}

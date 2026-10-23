/** Finding a destination: the trip's own places first, then anywhere else.
 *
 *  Sai's stops are what he will usually want, and they are already in memory with the
 *  verified coordinates and entrance points — so they answer instantly and offline.
 *  Everything else goes to Photon (a geocoder with CORS and no key), biased towards
 *  wherever he is standing. */
import { places } from "../data";
import type { Point } from "./route";

/** Just somewhere to bias the search towards — his own position has an accuracy on it
 *  and no name, so it is not a Point. */
export type LatLng = { lat: number; lng: number };

export interface Hit extends Point {
  /** Shown under the name: a category for a trip stop, the place's area otherwise. */
  sub: string;
  mine: boolean;
  id?: string;
}

/** The trip's own stops, offered only to the profile whose trip it is: to anyone else
 *  they are just places, and badging them "on your trip" would be a small lie as well as
 *  a leak of his itinerary. */
export function tripHits(q: string, limit = 5, mine = false): Hit[] {
  const s = q.trim().toLowerCase();
  if (!s || !mine) return [];
  return Object.entries(places)
    .filter(([, p]) => p.n.toLowerCase().includes(s) || p.q.toLowerCase().includes(s))
    .slice(0, limit)
    .map(([id, p]) => ({
      id, name: p.n, lat: p.lat, lng: p.lng, mine: true,
      sub: p.v === "la" ? "Los Angeles · your trip" : p.v === "trip" ? "Day trip · your trip" : "Las Vegas · your trip",
    }));
}

export async function geocode(q: string, near: LatLng | null, signal: AbortSignal): Promise<Hit[]> {
  const s = q.trim();
  if (s.length < 3) return [];
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", s);
  url.searchParams.set("limit", "6");
  if (near) {
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lng));
  }
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.features ?? [])
    .filter((f: { geometry?: { coordinates?: number[] } }) => f.geometry?.coordinates?.length === 2)
    .map((f: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }) => {
      const p = f.properties;
      return {
        name: p.name || p.street || "Unnamed place",
        sub: [p.street && p.name !== p.street ? p.street : null, p.city || p.county, p.state]
          .filter(Boolean).join(", ") || p.country || "",
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        mine: false,
      } as Hit;
    });
}

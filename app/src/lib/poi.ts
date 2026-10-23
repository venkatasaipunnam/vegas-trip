import type { MapGeoJSONFeature, MapLibreEvent } from "maplibre-gl";
import type { MapRef } from "react-map-gl/maplibre";

/** Real venues, from the basemap itself.
 *
 *  Sai's complaint was that the map looked out of date next to Google: no restaurant or
 *  casino names, so anything not already in his plan was hard to pick.  The names were
 *  always in the tiles — OpenFreeMap's Liberty style just holds them back until the map
 *  is zoomed well in (rank 1-6 at z15, 7-19 at z16, the rest at z17).  Lowering those
 *  thresholds shows the venues a couple of zoom levels earlier, which is where a phone
 *  usually sits, and then a tap on one can pick it up by name. */

const POI_LAYERS = ["poi_r1", "poi_r7", "poi_r20", "poi_transit"] as const;
const EARLIER: Record<string, number> = { poi_r1: 13.2, poi_r7: 14.6, poi_r20: 16 };

export function showVenuesEarlier(map: maplibregl.Map) {
  for (const [id, z] of Object.entries(EARLIER)) {
    if (map.getLayer(id)) {
      try { map.setLayerZoomRange(id, z, 24); } catch { /* style changed under us */ }
    }
  }
}

export interface Venue {
  name: string;
  lat: number;
  lng: number;
  /** OpenMapTiles' own class: restaurant, lodging, bar, attraction… */
  kind: string;
}

/** The venue under a tap, if there is one.  Used so he can add "the taco place by the
 *  hotel" by tapping its label rather than typing a name he may not know how to spell. */
export function venueAt(ref: MapRef | null, e: MapLibreEvent & { point: { x: number; y: number } }): Venue | null {
  const map = ref?.getMap();
  if (!map) return null;
  const layers = POI_LAYERS.filter((l) => map.getLayer(l));
  if (!layers.length) return null;
  // A small box, not a single pixel: a label is easier to hit than its anchor point.
  const box: [[number, number], [number, number]] = [
    [e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12],
  ];
  const hit = map.queryRenderedFeatures(box, { layers }) as MapGeoJSONFeature[];
  for (const f of hit) {
    const p = f.properties as Record<string, string>;
    const name = p.name_en || p.name || p["name:latin"];
    if (!name || f.geometry.type !== "Point") continue;
    const [lng, lat] = f.geometry.coordinates as [number, number];
    return { name, lat: +lat.toFixed(5), lng: +lng.toFixed(5), kind: p.class || p.subclass || "" };
  }
  return null;
}

/** OpenMapTiles classes mapped onto our own icons, so a tapped restaurant arrives as a
 *  restaurant rather than a generic pin. */
export const VENUE_ICON: Record<string, string> = {
  restaurant: "restaurant", fast_food: "restaurant", food: "restaurant",
  cafe: "cafe", bar: "bar", pub: "bar", nightclub: "music",
  lodging: "hotel", hotel: "hotel",
  attraction: "sight", monument: "sight", artwork: "sight", viewpoint: "viewpoint",
  museum: "museum", gallery: "museum", theatre: "show", cinema: "show",
  casino: "casino", amusement_park: "amusement", theme_park: "amusement",
  park: "park", garden: "park", beach: "beach", swimming_pool: "sport",
  stadium: "sport", pitch: "sport", shop: "shop", mall: "shop", grocery: "shop",
  bus: "transport", rail: "transport", railway: "transport", airport: "airport",
};

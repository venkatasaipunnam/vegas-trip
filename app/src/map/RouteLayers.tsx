import { Layer, Source } from "react-map-gl/maplibre";
import type { FeatureCollection, LineString } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { dayById, extraOf, legRec, places, stopsOf } from "../data";

/** The one colour that means "this is your way now". */
const NOW = "#3d8bff";
import { atOf, useTrip } from "../store";
import type { ModeKey } from "../types";

/** The marching dashes on the leg he is on.  A dash offset is the only thing cheap
 *  enough to leave animating on a phone, and it stops dead when the page is hidden. */
const DASHES: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
  [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
];

function useDash(active: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % DASHES.length);
    }, 110);
    return () => clearInterval(t);
  }, [active]);
  return DASHES[i];
}

export default function RouteLayers() {
  const day = useTrip((s) => s.day);
  const modePick = useTrip((s) => s.modePick);
  const atIdx = useTrip((s) => atOf(s.progress, s.day));

  const data = useMemo<FeatureCollection<LineString>>(() => {
    const stops = stopsOf(dayById(day));
    const features: FeatureCollection<LineString>["features"] = [];
    // Only the leg he is on.  Eight dotted lines across the Strip told him nothing
    // about what to do next; one blue line from where he is standing to the next stop
    // is the whole instruction.
    if (atIdx < stops.length - 1) {
      const rec = legRec(day, atIdx);
      const pick = modePick[`${day}:${atIdx}`];
      const m: ModeKey = pick && (!rec || rec.modes[pick]) ? pick : rec ? rec.planned : "walk";
      const a = places[stops[atIdx]];
      const b = places[stops[atIdx + 1]];
      const geom = rec?.modes[m]?.geom;
      features.push({
        type: "Feature",
        properties: { m, st: "now", c: NOW },
        geometry: {
          type: "LineString",
          // A missing pre-computed leg still gets a line: better a straight hop than
          // no route at all.
          coordinates: geom && geom.length > 1 ? geom : [[a.lng, a.lat], [b.lng, b.lat]],
        },
      });
    }
    // The overnight coach stays on the map as context, faint and behind everything:
    // it is how he arrives, not a route he follows on foot.
    const ex = extraOf(day);
    if (ex?.geom) {
      features.push({
        type: "Feature",
        properties: { m: "extra", st: "extra", c: "#c9b6ff" },
        geometry: { type: "LineString", coordinates: ex.geom },
      });
    }
    return { type: "FeatureCollection", features };
  }, [day, modePick, atIdx]);

  const hasNow = data.features.some((f) => f.properties?.st === "now");
  const dash = useDash(hasNow);

  return (
    <Source id="route" type="geojson" data={data}>
      {/* The faint context line first, so the live leg always draws over it. */}
      <Layer
        id="route-extra" type="line" filter={["==", ["get", "st"], "extra"]}
        layout={{ "line-cap": "butt" }}
        paint={{ "line-color": ["get", "c"], "line-width": 2, "line-opacity": 0.28, "line-dasharray": [3, 3] }}
      />
      <Layer
        id="route-glow" type="line" filter={["==", ["get", "st"], "now"]}
        layout={{ "line-cap": "round" }}
        paint={{ "line-color": ["get", "c"], "line-width": 16, "line-opacity": 0.26, "line-blur": 7 }}
      />
      <Layer
        id="route-now" type="line" filter={["==", ["get", "st"], "now"]}
        layout={{ "line-cap": "round" }}
        paint={{ "line-color": ["get", "c"], "line-width": 8, "line-opacity": 0.4, "line-blur": 1 }}
      />
      {/* line-dasharray takes no data-driven expression, so each mode is its own
          filtered layer: round dots for walking, dashes for transit, solid for a cab. */}
      <Layer
        id="route-walk" type="line" filter={["all", ["==", ["get", "m"], "walk"], ["==", ["get", "st"], "now"]]}
        layout={{ "line-cap": "round" }}
        paint={{ "line-color": ["get", "c"], "line-width": 5.2, "line-dasharray": [0, 1.7] }}
      />
      <Layer
        id="route-transit" type="line" filter={["all", ["==", ["get", "m"], "transit"], ["==", ["get", "st"], "now"]]}
        layout={{ "line-cap": "butt" }}
        paint={{ "line-color": ["get", "c"], "line-width": 4, "line-dasharray": [2.2, 1.4] }}
      />
      <Layer
        id="route-cab" type="line" filter={["all", ["==", ["get", "m"], "cab"], ["==", ["get", "st"], "now"]]}
        layout={{ "line-cap": "round" }}
        paint={{ "line-color": ["get", "c"], "line-width": 4.4 }}
      />
      <Layer
        id="route-flow" type="line" filter={["==", ["get", "st"], "now"]}
        layout={{ "line-cap": "butt" }}
        paint={{ "line-color": "#fff7ea", "line-width": 2.2, "line-opacity": 0.9, "line-dasharray": dash }}
      />
      {/* Direction arrows: an arrowhead drawn into a canvas (see MapView) rather than
          a glyph, because the base style carries no arrow character we can rely on and
          a missing glyph is a silent blank.  Placement along the line points it the way
          the journey runs. */}
      <Layer
        id="route-arrow" type="symbol"
        filter={["==", ["get", "st"], "now"]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 11, 54, 16, 96],
          "icon-image": "np-arrow",
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.42, 16, 0.9],
        }}
        paint={{ "icon-opacity": 0.95 }}
      />
    </Source>
  );
}

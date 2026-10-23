import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  AttributionControl, GeolocateControl, Layer, NavigationControl, Popup, Source,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { CATS, ZOOM, dayById, extraOf, places, stopsOf } from "../data";
import { atOf, useTrip } from "../store";
import Pins from "./Pins";
import Me from "./Me";
import RouteLayers from "./RouteLayers";
import { useJourney } from "./useJourney";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SAT = ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"];
const DEM = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"];
/** Terrain is what makes the Grand Canyon read as a canyon, and what breaks every
 *  close-up city view: switched on during a flyTo the camera lands under the raised
 *  surface and the map washes out.  So it is asked for only out of town or when the
 *  whole city is in frame, dropped before any animated move, and restored on moveend. */
const TERRAIN_MAXZOOM = 13.2;

/** A small white arrowhead pointing along +x, which is the direction of travel once
 *  MapLibre places it on a line. */
function arrowImage() {
  const s = 26;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  g.translate(s / 2, s / 2);
  g.beginPath();
  g.moveTo(8, 0); g.lineTo(-5.5, -6.5); g.lineTo(-2.5, 0); g.lineTo(-5.5, 6.5);
  g.closePath();
  g.lineJoin = "round"; g.lineWidth = 3; g.strokeStyle = "rgba(10,7,20,.9)"; g.stroke();
  g.fillStyle = "#fff7ea"; g.fill();
  return { width: s, height: s, data: new Uint8Array(g.getImageData(0, 0, s, s).data) };
}

/** Pins at one fixed pixel size are what made the old map feel like a page with dots
 *  on it.  --mks ties their size to the zoom; it is written straight to the document
 *  on every zoom frame rather than held in React state, because this runs during a
 *  pinch and a re-render per frame is exactly what makes pins lag the map. */
const PIN_MIN = 0.42, PIN_MAX = 1.12;
const pinScale = (z: number) => Math.max(PIN_MIN, Math.min(PIN_MAX, 0.42 + (z - 9.5) * 0.1));

/** Keep the day clear of the sheet.  Capped at 42% of the viewport: an uncapped sheet
 *  leaves fitBounds almost no box and MapLibre answers by pulling the camera miles
 *  back ("Map cannot fit within canvas"). */
function sheetPad() {
  if (window.innerWidth >= 900) return { top: 110, bottom: 60, left: 440, right: 60 };
  const el = document.querySelector(".sheet");
  const h = el ? el.getBoundingClientRect().height : 0;
  return { top: 86, bottom: Math.min(h + 18, window.innerHeight * 0.42), left: 26, right: 26 };
}

export default function MapView() {
  const ref = useRef<MapRef | null>(null);
  const [firstSymbol, setFirstSymbol] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [popId, setPopId] = useState<string | null>(null);
  const wild = useRef(false);   // the camera is framing open country, not a street

  const { day, is3d, sat, focus, setFlying, setActive, setAt, flyTo } = useTrip();
  const atIdx = useTrip((s) => atOf(s.progress, s.day));

  const wantTerrain = useCallback(() => {
    const m = ref.current?.getMap();
    if (!m || !is3d || !m.getSource("dem")) return false;
    return wild.current || m.getZoom() < TERRAIN_MAXZOOM;
  }, [is3d]);

  const applyTerrain = useCallback(() => {
    const m = ref.current?.getMap();
    if (!m || !m.getSource("dem")) return;
    const on = wantTerrain();
    const cur = !!m.getTerrain();
    if (on && !cur) m.setTerrain({ source: "dem", exaggeration: 1.25 });
    else if (!on && cur) m.setTerrain(null);
  }, [wantTerrain]);

  const camStart = useCallback(() => {
    const m = ref.current?.getMap();
    if (m?.getTerrain()) m.setTerrain(null);
  }, []);

  const onLoad = useCallback(() => {
    const m = ref.current?.getMap();
    if (!m) return;
    setFirstSymbol(m.getStyle().layers.find((l) => l.type === "symbol")?.id);
    if (!m.hasImage("np-arrow")) m.addImage("np-arrow", arrowImage(), { pixelRatio: 2 });
    // The style's own extruded buildings if it has them, ours otherwise.
    if (!m.getStyle().layers.some((l) => l.type === "fill-extrusion") && m.getSource("openmaptiles")) {
      m.addLayer({
        id: "bldg3d", type: "fill-extrusion", source: "openmaptiles",
        "source-layer": "building", minzoom: 13.5,
        paint: {
          "fill-extrusion-color": "#2a2345",
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 12],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.9,
        },
      });
    }
    document.documentElement.style.setProperty("--mks", pinScale(m.getZoom()).toFixed(3));
    setReady(true);
  }, []);

  // 3D on or off: the extrusions, the pitch and the terrain all follow the one button.
  useEffect(() => {
    const m = ref.current?.getMap();
    if (!m || !ready) return;
    camStart();
    m.getStyle().layers
      .filter((l) => l.type === "fill-extrusion")
      .forEach((l) => m.setLayoutProperty(l.id, "visibility", is3d ? "visible" : "none"));
    m.easeTo({ pitch: is3d ? 60 : 0, duration: 800 });
  }, [is3d, ready, camStart]);

  // Fly to a stop, then open its popup.  Open country gets pulled back and turned to
  // look across the canyon; closer in the camera would face the flat plateau behind it.
  useEffect(() => {
    const m = ref.current?.getMap();
    if (!m || !ready || !focus.id) return;
    const p = places[focus.id];
    if (!p) return;
    const open = p.cat === "nature" || (p.cat === "free" && p.v === "trip");
    wild.current = open;
    camStart();
    const canyon = p.cat === "nature" && p.v === "trip";
    m.flyTo({
      center: [p.lng, p.lat],
      zoom: canyon ? 12.4 : ZOOM[p.v] ?? 15,
      pitch: is3d ? (canyon ? 70 : 62) : 0,
      bearing: canyon ? -35 : m.getBearing() + 40,
      duration: 2600,
      padding: sheetPad(),
      essential: true,
    });
    const id = focus.id;
    m.once("moveend", () => setPopId(id));
    // focus.nonce, not focus.id: tapping the same stop again has to fly again.
  }, [focus.nonce, ready]);   // eslint-disable-line react-hooks/exhaustive-deps

  // The whole day in frame when he switches days.
  useEffect(() => {
    const m = ref.current?.getMap();
    if (!m || !ready) return;
    const D = dayById(day);
    const stops = stopsOf(D);
    if (!stops.length) return;
    wild.current = false;
    camStart();
    setPopId(null);
    const ex = extraOf(day);
    const all: [number, number][] = [
      ...stops.map((s) => [places[s].lng, places[s].lat] as [number, number]),
      ...(ex?.geom && day !== "d25" ? ex.geom : []),
    ];
    // A Vegas day is framed on its Strip stops; the airport run would otherwise zoom
    // the whole Strip out to nothing.
    const lv = stops.filter((s) => places[s].v === "lv").map((s) => [places[s].lng, places[s].lat] as [number, number]);
    const use = day === "d31" ? all : lv.length > 1 && D.city === "lv" ? lv : all;
    const b = use.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(use[0], use[0]));
    m.fitBounds(b, { padding: sheetPad(), pitch: is3d ? 55 : 0, bearing: -25, duration: 2200, maxZoom: 15.5 });
  }, [day, ready]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Playing a day is a journey along the road now, not a tour of pins: see useJourney.
  useJourney(ref, ready);

  const pop = popId ? places[popId] : null;
  const popStop = pop ? stopsOf(dayById(day)).indexOf(popId!) : -1;

  return (
    <div id="map" aria-label="Interactive 3D map">
      <Map
        ref={ref}
        mapStyle={STYLE}
        initialViewState={{ longitude: -115.165, latitude: 36.12, zoom: 14.5, pitch: 60, bearing: -20 }}
        maxPitch={80}
        attributionControl={false}
        onLoad={onLoad}
        onZoom={(e) => {
          document.documentElement.style.setProperty("--mks", pinScale(e.target.getZoom()).toFixed(3));
        }}
        onMoveEnd={applyTerrain}
        style={{ width: "100%", height: "100%" }}
      >
        <AttributionControl compact position="bottom-right" />
        <NavigationControl position="bottom-right" visualizePitch />
        {/* showUserHeading is a MapLibre option this version of react-map-gl does not
            type yet, and the heading cone is the whole point of it on a phone. */}
        <GeolocateControl
          position="bottom-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation
          {...({ showUserHeading: true } as Record<string, boolean>)}
        />

        <Source id="sat" type="raster" tiles={SAT} tileSize={256} maxzoom={19} attribution="Imagery © Esri">
          <Layer id="sat" type="raster" beforeId={firstSymbol}
            layout={{ visibility: sat ? "visible" : "none" }} />
        </Source>
        {/* Two DEM sources: one drives the terrain mesh, one shades it.  Sharing a
            single source makes MapLibre fight itself over tile usage. */}
        <Source id="dem" type="raster-dem" tiles={DEM} tileSize={256} encoding="terrarium" maxzoom={14} />
        <Source id="demshade" type="raster-dem" tiles={DEM} tileSize={256} encoding="terrarium" maxzoom={14}>
          <Layer id="hills" type="hillshade" beforeId={firstSymbol}
            paint={{ "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#3a2d55" }} />
        </Source>

        <RouteLayers />
        <Pins onPick={(id) => { setFlying(false); flyTo(id); }} />
        <Me />

        {pop && (
          <Popup
            longitude={pop.lng} latitude={pop.lat} anchor="bottom" offset={26}
            closeOnClick={false} onClose={() => { setPopId(null); setActive(null); }}
            maxWidth="290px"
          >
            <div className="pop">
              <span className="cat" style={{ background: CATS[pop.cat][1] }}>{CATS[pop.cat][0]}</span>
              <h4>{pop.n}</h4>
              <ul>{pop.see.map((s) => <li key={s}>{s}</li>)}</ul>
              {pop.how && <p><b>Get there:</b> {pop.how}</p>}
              <p><b>Tip:</b> {pop.tip}</p>
              <div className="btns">
                <a className="b1" target="_blank" rel="noopener"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${pop.lat},${pop.lng}&travelmode=transit`}>Directions</a>
                <a className="b2" target="_blank" rel="noopener"
                  href={`https://maps.apple.com/?daddr=${pop.lat},${pop.lng}&dirflg=r`}>Apple Maps</a>
                <a className="b3" target="_blank" rel="noopener"
                  href={`https://earth.google.com/web/search/${encodeURIComponent(pop.q)}`}>Earth 3D</a>
                {popStop >= 0 && popStop !== atIdx && (
                  <button className="b4" onClick={() => { setAt(popStop); setPopId(null); }}>✓ I'm here</button>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

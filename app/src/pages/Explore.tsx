import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Map, {
  AttributionControl, Layer, Marker, NavigationControl, Popup, Source, type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import { CATS, CITYCOL, places } from "../data";
import { currentUser } from "../lib/accounts";
import { OWNER_USER } from "../lib/plans";
import { showVenuesEarlier, venueAt } from "../lib/poi";
import { dirUrl, kmLabel, minsLabel, rideUrl } from "../lib/geo";
import { liveRoute, type LiveRoute, type Point } from "../lib/route";
import type { Hit } from "../lib/search";
import { ICONS, PLACEICONS } from "../map/pinIcons";
import { ModeIcon } from "../ui/Icons";
import PlaceField from "../explore/PlaceField";
import PlanMenu from "../explore/PlanMenu";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const NOW = "#3d8bff";
type Mode = "walk" | "car" | "transit" | "cab";

const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const colourOf = (cat: string, v: string) =>
  cat === "stay" ? "#c9b6ff" : cat === "extra" ? "#a89cc8"
    : v === "la" ? CITYCOL.la : v === "trip" ? CITYCOL.az : CITYCOL.lv;

/** The page Sai lands on: the whole trip on one map, and directions from where he is
 *  standing to anywhere he can name.  The day-by-day plan lives at /trip now.
 *
 *  What each mode does is deliberately different, because the best tool differs:
 *  walking and driving are drawn here, live, from a real router; public transit hands
 *  off to Google Maps, which is the only one of these with live departures; and a cab
 *  hands off to Uber or Lyft with both ends already filled. */
export default function Explore() {
  const ref = useRef<MapRef | null>(null);
  const [ready, setReady] = useState(false);
  const [from, setFrom] = useState<Point | null>(null);
  const [to, setTo] = useState<Point | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [route, setRoute] = useState<LiveRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [locating, setLocating] = useState(false);
  /** A venue tapped on the basemap — any restaurant, casino or station, not just the
   *  places already in a plan. */
  const [venue, setVenue] = useState<{ name: string; lat: number; lng: number } | null>(null);
  /** The pin he just tapped.  Tapping used to set the destination outright, which was
   *  wrong twice over: it never said which place had been chosen, and it overrode the
   *  end he was actually filling in — tap a pin while setting "From" and it landed in
   *  "To".  Now the tap names the place and he says which end it is. */
  const [picked, setPicked] = useState<string | null>(null);
  /** The Vegas itinerary is a plan of his, not a public page, so the link to it only
   *  appears to whoever is signed in. */
  const [user] = useState(() => currentUser());
  const mine = user === OWNER_USER;

  // Watch, not a one-shot fix: he is walking while he reads this.
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setLocating(false);
        setLive({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Start from his own location as soon as there is one, until he picks somewhere else.
  const touched = useRef(false);
  useEffect(() => {
    if (live && !touched.current && !from) {
      setFrom({ lat: live.lat, lng: live.lng, name: "My location" });
    }
  }, [live, from]);

  const useMyLocation = useCallback(() => {
    touched.current = true;
    if (live) setFrom({ lat: live.lat, lng: live.lng, name: "My location" });
    else if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLocating(false);
          setFrom({ lat: p.coords.latitude, lng: p.coords.longitude, name: "My location" });
        },
        () => { setLocating(false); setErr("Location is off — search for a starting point instead."); },
        { enableHighAccuracy: true },
      );
    }
  }, [live]);

  // Walking and driving are routed here and drawn; the other two are hand-offs.
  useEffect(() => {
    setRoute(null);
    setErr(null);
    if (!from || !to || (mode !== "walk" && mode !== "car")) return;
    const ac = new AbortController();
    setBusy(true);
    liveRoute(from, to, mode, ac.signal)
      .then((r) => { setRoute(r); setBusy(false); })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setBusy(false);
        setErr(`Could not work out that route (${e.message}). Google Maps can still do it.`);
      });
    return () => ac.abort();
  }, [from, to, mode]);

  const data = useMemo<FeatureCollection<LineString>>(() => ({
    type: "FeatureCollection",
    features: route ? [{
      type: "Feature", properties: {},
      geometry: { type: "LineString", coordinates: route.geom },
    }] : [],
  }), [route]);

  // The whole trip in frame on arrival; the route in frame once there is one.
  useEffect(() => {
    const m = ref.current?.getMap();
    if (!m || !ready) return;
    const pts: [number, number][] = route
      ? route.geom
      : from && to ? [[from.lng, from.lat], [to.lng, to.lat]]
        : from ? [[from.lng, from.lat]]
          : to ? [[to.lng, to.lat]]
            : mine ? Object.values(places).map((p) => [p.lng, p.lat]) : [];
    if (!pts.length) return;
    const b = pts.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(b, {
      padding: { top: 300, bottom: 70, left: 40, right: 40 },
      duration: route || from || to ? 1400 : 0,
      maxZoom: route ? 16 : from && to ? 15 : from || to ? 15.5 : 11,
    });
  }, [route, ready, mine, from, to]);

  const ends = from && to;
  const transitHandoff = () => {
    if (ends) window.open(dirUrl(from, to, "transit"), "_blank", "noopener");
  };

  return (
    <>
      <div id="map" aria-label="Map of the whole trip">
        <Map
          ref={ref}
          mapStyle={STYLE}
          initialViewState={{ longitude: -115.9, latitude: 35.4, zoom: 6, pitch: 0 }}
          attributionControl={false}
          onLoad={(e) => { showVenuesEarlier(e.target); setReady(true); }}
          onClick={(e) => {
            const v = venueAt(ref.current, e);
            setPicked(null);
            setVenue(v);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact position="bottom-right" />
          <NavigationControl position="bottom-right" visualizePitch />

          <Source id="live" type="geojson" data={data}>
            <Layer id="live-glow" type="line" layout={{ "line-cap": "round" }}
              paint={{ "line-color": NOW, "line-width": 16, "line-opacity": 0.26, "line-blur": 7 }} />
            <Layer id="live-line" type="line" layout={{ "line-cap": "round" }}
              paint={{ "line-color": NOW, "line-width": 5 }} />
          </Source>

          {/* The trip's own stops, for the one profile whose trip it is.  Everyone else
              gets a plain map and the search: his itinerary is not a sample dataset. */}
          {mine && Object.entries(places).map(([id, p]) => {
            const col = colourOf(p.cat, p.v);
            return (
              <Marker key={id} longitude={p.lng} latitude={p.lat} anchor="center">
                <div
                  className={`mkwrap${picked === id ? " open" : ""}`} aria-label={p.n}
                  onClick={(e) => { e.stopPropagation(); setPicked(id); }}
                >
                  <div className="mkscale">
                    <div className="mk" style={{ ["--c" as string]: col, ["--cbg" as string]: tint(col, 0.74) }}
                      dangerouslySetInnerHTML={{ __html: PLACEICONS[id] || ICONS[p.cat] || ICONS.see }} />
                  </div>
                  {/* The name, on hover with a mouse.  An icon on its own says nothing:
                      a cocktail glass is not "Bellagio Fountains". */}
                  <span className="mklabel">{p.n}</span>
                </div>
              </Marker>
            );
          })}

          {picked && places[picked] && (
            <Popup
              longitude={places[picked].lng} latitude={places[picked].lat}
              anchor="bottom" offset={24} closeOnClick={false} maxWidth="250px"
              onClose={() => setPicked(null)}
            >
              <div className="pop pick">
                <span className="cat" style={{ background: CATS[places[picked].cat][1] }}>
                  {CATS[places[picked].cat][0]}
                </span>
                <h4>{places[picked].n}</h4>
                <div className="btns">
                  <button className="b1" onClick={() => {
                    const p = places[picked];
                    touched.current = true;
                    setFrom({ lat: p.lat, lng: p.lng, name: p.n });
                    setPicked(null);
                  }}>◉ Start here</button>
                  <button className="b2" onClick={() => {
                    const p = places[picked];
                    setTo({ lat: p.lat, lng: p.lng, name: p.n });
                    setPicked(null);
                  }}>▲ Go here</button>
                </div>
              </div>
            </Popup>
          )}

          {venue && (
            <Popup
              longitude={venue.lng} latitude={venue.lat} anchor="bottom" offset={14}
              closeOnClick={false} maxWidth="250px" onClose={() => setVenue(null)}
            >
              <div className="pop pick">
                <span className="cat" style={{ background: "#3fe0e8" }}>On the map</span>
                <h4>{venue.name}</h4>
                <div className="btns">
                  <button className="b1" onClick={() => {
                    touched.current = true;
                    setFrom({ lat: venue.lat, lng: venue.lng, name: venue.name });
                    setVenue(null);
                  }}>◉ Start here</button>
                  <button className="b2" onClick={() => {
                    setTo({ lat: venue.lat, lng: venue.lng, name: venue.name });
                    setVenue(null);
                  }}>▲ Go here</button>
                </div>
              </div>
            </Popup>
          )}

          {/* The two ends, pinned.  Choosing a start and a destination drew the line but
              left the ends unmarked, so there was nothing on the map to say which end was
              which — or where a searched place actually was before a mode was picked. */}
          {from && (
            <Marker longitude={from.lng} latitude={from.lat} anchor="bottom">
              <div className="endpin start"><b>A</b><i>{from.name}</i></div>
            </Marker>
          )}
          {to && (
            <Marker longitude={to.lng} latitude={to.lat} anchor="bottom">
              <div className="endpin end"><b>B</b><i>{to.name}</i></div>
            </Marker>
          )}

          {live && (
            <Marker longitude={live.lng} latitude={live.lat} anchor="center">
              <div className="livedot" aria-label="You are here" />
            </Marker>
          )}
        </Map>
      </div>

      <div className="finder">
        <div className="fhead">
          <h1>Neon <span>&amp;</span> Pacific</h1>
          <PlanMenu />
        </div>

        <PlaceField
          label="From" icon="◉" value={from} near={live} mine={mine}
          locating={locating && !from}
          onUseLocation={useMyLocation}
          onPick={(h: Hit | null) => { touched.current = true; setFrom(h); }}
        />
        <PlaceField
          label="To" icon="▲" value={to} near={live ?? from} mine={mine}
          onPick={(h: Hit | null) => setTo(h)}
        />

        {ends && (
          <div className="modebar" role="group" aria-label="How do you want to get there?">
            {([["walk", "Walk"], ["car", "Drive"], ["transit", "Transit"], ["cab", "Cab"]] as [Mode, string][])
              .map(([m, label]) => (
                <button
                  key={m}
                  className={`mbtn ${m}${mode === m ? " on" : ""}`}
                  aria-pressed={mode === m}
                  onClick={() => { setMode(m); if (m === "transit") transitHandoff(); }}
                >
                  <ModeIcon m={m === "car" ? "cab" : m === "cab" ? "cab" : m} />
                  {label}
                </button>
              ))}
          </div>
        )}

        {ends && mode && (
          <div className="result">
            {busy && <p className="rnote">Working out the route…</p>}
            {err && <p className="rnote bad">{err}</p>}

            {(mode === "walk" || mode === "car") && route && (
              <>
                <p className="rsum">
                  <b>{minsLabel(route.min)}</b> · {kmLabel(route.km)} km
                  <span>{mode === "walk" ? "on foot" : "driving"}</span>
                </p>
                {!!route.steps.length && (
                  <details className="turns" open>
                    <summary>Step by step</summary>
                    <ol>
                      {route.steps.map((s, i) => (
                        <li key={i}>{s.text}{s.km ? <span>{kmLabel(s.km)} km</span> : null}</li>
                      ))}
                    </ol>
                  </details>
                )}
                <a className="btn maps" href={dirUrl(from, to, mode === "walk" ? "walking" : "driving")}
                  target="_blank" rel="noopener">Open in Google Maps</a>
              </>
            )}

            {mode === "transit" && (
              <>
                <p className="rnote">
                  Public transit opens in Google Maps — it is the only one of these with live
                  departures for the Deuce, the monorail and LA Metro.
                </p>
                <button className="btn maps" onClick={transitHandoff}>Open transit directions</button>
              </>
            )}

            {mode === "cab" && (
              <>
                <p className="rnote">Both apps open with the pickup and the drop-off already set.</p>
                <div className="row2">
                  <a className="btn uber" target="_blank" rel="noopener"
                    href={rideUrl("uber", from, to)}>Uber</a>
                  <a className="btn lyft" target="_blank" rel="noopener"
                    href={rideUrl("lyft", from, to)}>Lyft</a>
                </div>
              </>
            )}
          </div>
        )}

        {!user && (
          <div className="joincard">
            <p><b>Plan your own trips</b>Save as many as you like, day by day, and read them back on the map.</p>
            <Link className="btn done" to="/login">Sign in</Link>
          </div>
        )}

        {!ends && (
          <p className="hint">
            {mine
              ? "Every stop on your trip is on the map. Tap one, tap any venue the map shows, or search for anywhere else."
              : "Search for a place, or tap any venue on the map — restaurants, hotels, casinos and stations are all named once you zoom in."}
          </p>
        )}
      </div>
    </>
  );
}

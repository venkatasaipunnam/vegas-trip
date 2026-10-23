import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Map, {
  AttributionControl, Layer, Marker, NavigationControl, Popup, Source, type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import { currentUser } from "../lib/accounts";
import { getPlan, type Plan, type Stop } from "../lib/plans";
import { ICON_COLOUR, ICON_LABEL, iconSvg, tint } from "../lib/icons";
import { MODE_COLOUR, legKeyOf, usePlanRoads } from "../lib/planroads";
import { dirUrl, headingOf, km, kmLabel, minsLabel, rideUrl, roughMins } from "../lib/geo";
import { arrowImage } from "../map/MapView";
import { Figure, ModeIcon, PersonIcon } from "../ui/Icons";
import PlanPicker from "../ui/PlanPicker";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const NOW = "#3d8bff";
const PROGRESS = "np-planprogress";
const MODENAME: Record<string, string> = { walk: "Walk", transit: "Transit", cab: "Cab" };

/** Reading a plan, as opposed to editing it.
 *
 *  Sai's point was fair: the planner could build a day but only the Vegas itinerary got
 *  the treatment that makes a day usable on the street — the leg you are on drawn on the
 *  road, a figure standing where you are, and a bar telling you what is next and how to
 *  get there.  This gives any saved plan the same thing. */
export default function PlanView() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const ref = useRef<MapRef | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [atIdx, setAtIdx] = useState(0);
  const [popId, setPopId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = currentUser();
    if (!u) { nav("/login", { replace: true }); return; }
    const p = getPlan(u, id);
    if (!p) { nav("/plans", { replace: true }); return; }
    setPlan(p);
    // Another plan is another trip: day 1, and his place in it comes from storage below.
    setDayIdx(0);
    setPopId(null);
  }, [id, nav]);

  // Where he is in each day, kept per plan so closing the tab does not lose his place.
  const progressKey = `${id}:${dayIdx}`;
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(PROGRESS) || "{}");
      setAtIdx(all[progressKey] ?? 0);
    } catch { setAtIdx(0); }
  }, [progressKey]);

  const setAt = useCallback((i: number) => {
    setAtIdx(i);
    try {
      const all = JSON.parse(localStorage.getItem(PROGRESS) || "{}");
      all[progressKey] = i;
      localStorage.setItem(PROGRESS, JSON.stringify(all));
    } catch { /* private browsing: his place just will not persist */ }
  }, [progressKey]);

  const day = plan?.days[dayIdx];
  const stops: Stop[] = useMemo(() => day?.stops ?? [], [day]);
  const roads = usePlanRoads(stops);
  const at = Math.min(atIdx, Math.max(0, stops.length - 1));
  const here = stops[at];
  const next = stops[at + 1];
  const leg = here && next ? roads[legKeyOf(here, next)] : undefined;
  const mode = next?.mode ?? "walk";

  // Only the leg he is on, as on the trip page: a day of dotted lines says nothing about
  // what to do next.
  const data = useMemo<FeatureCollection<LineString>>(() => ({
    type: "FeatureCollection",
    features: here && next ? [{
      type: "Feature",
      properties: { m: mode },
      geometry: {
        type: "LineString",
        coordinates: leg?.geom?.length ? leg.geom : [[here.lng, here.lat], [next.lng, next.lat]],
      },
    }] : [],
  }), [here, next, leg, mode]);

  useEffect(() => {
    const m = ref.current?.getMap();
    if (!m || !ready || !stops.length) return;
    const pts = (here && next ? (leg?.geom ?? [[here.lng, here.lat], [next.lng, next.lat]])
      : stops.map((s) => [s.lng, s.lat])) as [number, number][];
    const b = pts.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(b, { padding: { top: 90, bottom: 320, left: 40, right: 40 }, maxZoom: 16, duration: 1200 });
  }, [dayIdx, at, ready, leg, stops, here, next]);

  if (!plan || !day) return null;
  const pop = popId ? stops.find((s) => s.id === popId) : null;
  const mins = leg?.min ?? (here && next ? roughMins(mode, { ...here, n: "" } as never, { ...next, n: "" } as never) : 0);
  const dist = leg?.km ?? (here && next ? km(here, next) : 0);

  return (
    <>
      <div id="map" aria-label={`${plan.name} map`}>
        <Map
          ref={ref} mapStyle={STYLE}
          initialViewState={{ longitude: -115.165, latitude: 36.12, zoom: 12, pitch: 45 }}
          maxPitch={80} attributionControl={false}
          onLoad={(e) => {
            if (!e.target.hasImage("np-arrow")) e.target.addImage("np-arrow", arrowImage(), { pixelRatio: 2 });
            setReady(true);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact position="bottom-right" />
          <NavigationControl position="bottom-right" visualizePitch />

          <Source id="leg" type="geojson" data={data}>
            <Layer id="leg-glow" type="line" layout={{ "line-cap": "round" }}
              paint={{ "line-color": NOW, "line-width": 16, "line-opacity": 0.26, "line-blur": 7 }} />
            <Layer id="leg-line" type="line" layout={{ "line-cap": "round" }}
              paint={{ "line-color": NOW, "line-width": 5 }} />
            <Layer id="leg-arrow" type="symbol"
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 11, 54, 16, 96],
                "icon-image": "np-arrow", "icon-rotation-alignment": "map",
                "icon-allow-overlap": true, "icon-ignore-placement": true,
                "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.42, 16, 0.9],
              }}
              paint={{ "icon-opacity": 0.95 }} />
          </Source>

          {stops.map((s, i) => (
            <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center">
              <div className={`mkwrap${i === at ? " under" : ""}`} aria-label={s.name}
                onClick={(e) => { e.stopPropagation(); setPopId(s.id); }}>
                <div className="mkscale">
                  <div className={`mk${i === at ? " under" : ""}`}
                    style={{ ["--c" as string]: ICON_COLOUR[s.icon], ["--cbg" as string]: tint(ICON_COLOUR[s.icon], 0.74) }}
                    dangerouslySetInnerHTML={{ __html: iconSvg(s.icon) }} />
                </div>
                <span className="mknum">{i + 1}</span>
                <span className="mklabel">{s.name || "Unnamed stop"}</span>
              </div>
            </Marker>
          ))}

          {here && (
            <Marker longitude={here.lng} latitude={here.lat} anchor="bottom">
              <div className={`mewrap${mode === "walk" ? " walking" : ""}`} aria-label="You are here">
                <div className="mescale">
                  <div className="mering" />
                  <div className="me"><Figure /></div>
                </div>
              </div>
            </Marker>
          )}

          {pop && (
            <Popup longitude={pop.lng} latitude={pop.lat} anchor="bottom" offset={26}
              closeOnClick={false} maxWidth="290px" onClose={() => setPopId(null)}>
              <div className="pop">
                <span className="cat" style={{ background: ICON_COLOUR[pop.icon] }}>{ICON_LABEL[pop.icon]}</span>
                <h4>{pop.name}</h4>
                {!!pop.see?.length && <ul>{pop.see.map((l) => <li key={l}>{l}</li>)}</ul>}
                {pop.note && <p>{pop.note}</p>}
                {pop.tip && <p><b>Tip:</b> {pop.tip}</p>}
                <div className="btns">
                  <a className="b1" target="_blank" rel="noopener"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${pop.lat},${pop.lng}&travelmode=transit`}>Directions</a>
                  <a className="b2" target="_blank" rel="noopener"
                    href={`https://maps.apple.com/?daddr=${pop.lat},${pop.lng}&dirflg=r`}>Apple Maps</a>
                  {stops.indexOf(pop) !== at && (
                    <button className="b4" onClick={() => { setAt(stops.indexOf(pop)); setPopId(null); }}>✓ I'm here</button>
                  )}
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <section className="sheet plansheet">
        <div className="phead inner">
          <div style={{ minWidth: 0 }}>
            <h2 className="planname">{plan.name}</h2>
            <PlanPicker current={id} />
          </div>
          <Link className="btn ghost" to={`/plans/${id}`}>Edit</Link>
        </div>

        <div className="body">
          <div className="chips">
            {plan.days.map((d, i) => (
              <button key={d.id} className="chip" aria-pressed={i === dayIdx} onClick={() => { setDayIdx(i); setPopId(null); }}>
                {d.title || `Day ${i + 1}`}<small>{d.stops.length}</small>
              </button>
            ))}
          </div>

          {here ? (
            <div className="nextbar">
              <div className="at"><PersonIcon />You're at {here.name || "this stop"}</div>
              {next ? (
                <>
                  <p className="to">
                    Next: <b>{next.name || "the next stop"}</b>
                    <span className="dir">{kmLabel(dist)} km {headingOf(here as never, next as never)} · ~{minsLabel(mins)}</span>
                    {next.time && <span className="how">{next.time}</span>}
                  </p>
                  <span className="mode" style={{ background: MODE_COLOUR[mode] }}>
                    <ModeIcon m={mode} />{MODENAME[mode]}
                  </span>
                  <div className="go">
                    <div className="row3">
                      <a className="btn maps" target="_blank" rel="noopener"
                        href={dirUrl(here, next, mode === "walk" ? "walking" : mode === "cab" ? "driving" : "transit")}>
                        <ModeIcon m={mode} />{MODENAME[mode]}
                      </a>
                      <a className="btn uber" target="_blank" rel="noopener"
                        href={rideUrl("uber", { ...here, name: here.name }, { ...next, name: next.name })}>Uber</a>
                      <a className="btn lyft" target="_blank" rel="noopener"
                        href={rideUrl("lyft", { ...here, name: here.name }, { ...next, name: next.name })}>Lyft</a>
                    </div>
                    <div className="rowdone">
                      <button className="btn done" onClick={() => setAt(at + 1)}>✓ I'm at {(next.name || "the next stop").split(" ")[0]}</button>
                      {at > 0 && <button className="btn ghost" aria-label="Back a stop" onClick={() => setAt(at - 1)}>↶</button>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="to">Last stop of the day — nothing left to travel to.</p>
                  <div className="go"><div className="rowdone">
                    {at > 0 && <button className="btn ghost" style={{ flex: 1 }} onClick={() => setAt(at - 1)}>↶ Back a stop</button>}
                    <button className="btn ghost" style={{ flex: 1 }} onClick={() => setAt(0)}>↺ Start of day</button>
                  </div></div>
                </>
              )}
            </div>
          ) : (
            <p className="fine">This day has no stops yet. Open the editor to add some.</p>
          )}

          <ol className="planstops">
            {stops.map((s, i) => (
              <li key={s.id} className={i === at ? "on" : ""}>
                <span className="si" style={{ background: tint(ICON_COLOUR[s.icon], 0.9) }}
                  dangerouslySetInnerHTML={{ __html: iconSvg(s.icon) }} />
                <button className="sbody" onClick={() => setPopId(s.id)}>
                  <b>{s.name || "Unnamed stop"}</b>
                  <span>{[s.time, ICON_LABEL[s.icon], s.note].filter(Boolean).join(" · ")}</span>
                </button>
                {i !== at && (
                  <span className="sacts">
                    <button onClick={() => setAt(i)} aria-label="I'm here">✓</button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Map, {
  AttributionControl, Layer, Marker, NavigationControl, Popup, Source, type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import { currentUser } from "../lib/accounts";
import { OWNER_USER } from "../lib/plans";
import { getPlan, savePlan, uid, type Plan, type PlanDay, type Stop } from "../lib/plans";
import { ICON_COLOUR, ICON_GROUPS, ICON_LABEL, iconSvg, tint, type IconKey } from "../lib/icons";
import { geocode, tripHits, type Hit } from "../lib/search";
import { VENUE_ICON, showVenuesEarlier, venueAt } from "../lib/poi";
import { MODE_COLOUR, legKeyOf, usePlanRoads } from "../lib/planroads";
import { ModeIcon } from "../ui/Icons";
import { arrowImage } from "../map/MapView";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MODES: Stop["mode"][] = ["walk", "transit", "cab"];
export default function PlanEditor() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const ref = useRef<MapRef | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [saved, setSaved] = useState(true);
  const [dropping, setDropping] = useState(false);
  const [draft, setDraft] = useState<Stop | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [ready, setReady] = useState(false);
  const [venue, setVenue] = useState<{ name: string; lat: number; lng: number; kind: string } | null>(null);

  useEffect(() => {
    const u = currentUser();
    if (!u) { nav("/login", { replace: true }); return; }
    setUser(u);
    const p = getPlan(u, id);
    if (!p) { nav("/plans", { replace: true }); return; }
    setPlan(p);
  }, [id, nav]);

  // Autosave: he is editing a plan, not filling in a form, so there is no Save button to
  // forget. A short debounce keeps a burst of typing to one write.
  useEffect(() => {
    if (!plan || !user || saved) return;
    const t = setTimeout(() => { savePlan(user, plan); setSaved(true); }, 600);
    return () => clearTimeout(t);
  }, [plan, user, saved]);

  const edit = useCallback((f: (p: Plan) => Plan) => {
    setPlan((prev) => (prev ? f(structuredClone(prev)) : prev));
    setSaved(false);
  }, []);

  const day: PlanDay | undefined = plan?.days[dayIdx];

  // Search: his own stops answer instantly, the geocoder fills in everywhere else.
  useEffect(() => {
    const local = tripHits(q, 4, currentUser() === OWNER_USER);
    setHits(local);
    if (q.trim().length < 3) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const far = await geocode(q, day?.stops[0] ?? null, ac.signal);
        setHits([...local, ...far.filter((f) => !local.some((l) => l.name === f.name))]);
      } catch { /* offline: the trip's own places still answer */ }
    }, 350);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, day]);

  const roads = usePlanRoads(day?.stops ?? []);
  const path = useMemo<FeatureCollection<LineString>>(() => {
    const stops = day?.stops ?? [];
    const features: FeatureCollection<LineString>["features"] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      const mode = b.mode ?? "walk";
      const road = roads[legKeyOf(a, b)];
      features.push({
        type: "Feature",
        properties: { m: mode, c: MODE_COLOUR[mode] },
        geometry: {
          type: "LineString",
          coordinates: road?.geom?.length ? road.geom : [[a.lng, a.lat], [b.lng, b.lat]],
        },
      });
    }
    return { type: "FeatureCollection", features };
  }, [day, roads]);

  // Frame the day whenever it changes, so adding a stop shows where it landed.
  useEffect(() => {
    const m = ref.current?.getMap();
    if (!m || !ready || !day?.stops.length) return;
    const pts = day.stops.map((s) => [s.lng, s.lat] as [number, number]);
    const b = pts.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(b, { padding: { top: 70, bottom: 330, left: 40, right: 40 }, maxZoom: 15.4, duration: 900 });
  }, [dayIdx, day?.stops.length, ready]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan || !day) return null;

  const addStop = (s: Omit<Stop, "id">) => {
    const stop: Stop = { ...s, id: uid() };
    edit((p) => { p.days[dayIdx].stops.push(stop); return p; });
    setDraft(stop);          // straight into the form, to name it and pick an icon
    setAdding(false);
    setQ("");
    setDropping(false);
  };

  const patch = (stopId: string, f: (s: Stop) => void) =>
    edit((p) => {
      const s = p.days[dayIdx].stops.find((x) => x.id === stopId);
      if (s) f(s);
      return p;
    });

  const move = (i: number, by: number) =>
    edit((p) => {
      const list = p.days[dayIdx].stops;
      const j = i + by;
      if (j < 0 || j >= list.length) return p;
      [list[i], list[j]] = [list[j], list[i]];
      return p;
    });

  return (
    <>
      <div id="map" aria-label="Plan map">
        <Map
          ref={ref}
          mapStyle={STYLE}
          initialViewState={{ longitude: -115.165, latitude: 36.12, zoom: 12 }}
          attributionControl={false}
          onLoad={(e) => {
            const m = e.target;
            showVenuesEarlier(m);
            if (!m.hasImage("np-arrow")) m.addImage("np-arrow", arrowImage(), { pixelRatio: 2 });
            setReady(true);
          }}
          cursor={dropping ? "crosshair" : "grab"}
          onClick={(e) => {
            if (dropping) {
              addStop({ name: "", lat: +e.lngLat.lat.toFixed(5), lng: +e.lngLat.lng.toFixed(5), icon: "pin" });
              return;
            }
            // Not in drop mode: offer whatever venue the basemap has under the tap, so a
            // place that was never in the plan can be added by name.
            setVenue(venueAt(ref.current, e));
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact position="bottom-right" />
          <NavigationControl position="bottom-right" />

          <Source id="plan" type="geojson" data={path}>
            <Layer id="plan-glow" type="line" layout={{ "line-cap": "round" }}
              paint={{ "line-color": ["get", "c"], "line-width": 12, "line-opacity": 0.2, "line-blur": 6 }} />
            {/* One layer per mode, because line-dasharray takes no data-driven value:
                dots for a walk, dashes for transit, a solid road for a cab. */}
            <Layer id="plan-walk" type="line" filter={["==", ["get", "m"], "walk"]}
              layout={{ "line-cap": "round" }}
              paint={{ "line-color": ["get", "c"], "line-width": 4.6, "line-dasharray": [0, 1.7] }} />
            <Layer id="plan-transit" type="line" filter={["==", ["get", "m"], "transit"]}
              layout={{ "line-cap": "butt" }}
              paint={{ "line-color": ["get", "c"], "line-width": 3.6, "line-dasharray": [2.2, 1.4] }} />
            <Layer id="plan-cab" type="line" filter={["==", ["get", "m"], "cab"]}
              layout={{ "line-cap": "round" }}
              paint={{ "line-color": ["get", "c"], "line-width": 4 }} />
            <Layer id="plan-arrow" type="symbol"
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 11, 54, 16, 96],
                "icon-image": "np-arrow", "icon-rotation-alignment": "map",
                "icon-allow-overlap": true, "icon-ignore-placement": true,
                "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.42, 16, 0.9],
              }}
              paint={{ "icon-opacity": 0.95 }} />
          </Source>

          {venue && (
            <Popup longitude={venue.lng} latitude={venue.lat} anchor="bottom" offset={14}
              closeOnClick={false} maxWidth="240px" onClose={() => setVenue(null)}>
              <div className="pop pick">
                <span className="cat" style={{ background: "#3fe0e8" }}>{venue.kind || "On the map"}</span>
                <h4>{venue.name}</h4>
                <div className="btns">
                  <button className="b4" onClick={() => {
                    addStop({
                      name: venue.name, lat: venue.lat, lng: venue.lng,
                      icon: (VENUE_ICON[venue.kind] as IconKey) ?? "pin",
                    });
                    setVenue(null);
                  }}>+ Add as a stop</button>
                </div>
              </div>
            </Popup>
          )}

          {day.stops.map((s, i) => (
            <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center">
              <div className={`mkwrap${draft?.id === s.id ? " open" : ""}`} aria-label={s.name || "Unnamed stop"}
                onClick={(e) => { e.stopPropagation(); setDraft(s); }}>
                <div className="mkscale">
                  <div className="mk" style={{ ["--c" as string]: ICON_COLOUR[s.icon], ["--cbg" as string]: tint(ICON_COLOUR[s.icon], 0.74) }}
                    dangerouslySetInnerHTML={{ __html: iconSvg(s.icon) }} />
                </div>
                <span className="mknum">{i + 1}</span>
                <span className="mklabel">{s.name || "Unnamed stop"}</span>
              </div>
            </Marker>
          ))}
        </Map>
      </div>

      {dropping && (
        <div className="dropbar">
          Tap the map where the stop is
          <button className="btn ghost" onClick={() => setDropping(false)}>Cancel</button>
        </div>
      )}

      <section className="sheet plansheet">
        <div className="phead inner">
          <div>
            <input className="planname" value={plan.name}
              onChange={(e) => edit((p) => { p.name = e.target.value; return p; })} />
            <p className="sub">{saved ? "Saved on this device" : "Saving…"}</p>
          </div>
          <span className="headacts">
            <Link className="btn ghost" to={`/plans/${id}/view`}>View</Link>
            <Link className="btn ghost" to="/plans">Done</Link>
          </span>
        </div>

        <div className="body">
          <div className="chips">
            {plan.days.map((d, i) => (
              <button key={d.id} className="chip" aria-pressed={i === dayIdx} onClick={() => setDayIdx(i)}>
                {d.title || `Day ${i + 1}`}<small>{d.stops.length}</small>
              </button>
            ))}
            <button className="chip add" onClick={() => {
              edit((p) => { p.days.push({ id: uid(), title: `Day ${p.days.length + 1}`, stops: [] }); return p; });
              setDayIdx(plan.days.length);
            }}>+ Day</button>
          </div>

          <div className="dayedit">
            <input className="daytitle" value={day.title} placeholder={`Day ${dayIdx + 1}`}
              onChange={(e) => edit((p) => { p.days[dayIdx].title = e.target.value; return p; })} />
            <input className="daydate" type="date" value={day.date ?? ""}
              onChange={(e) => edit((p) => { p.days[dayIdx].date = e.target.value; return p; })} />
            {plan.days.length > 1 && (
              <button className="btn ghost" onClick={() => {
                if (!confirm(`Remove ${day.title || `Day ${dayIdx + 1}`} and its stops?`)) return;
                edit((p) => { p.days.splice(dayIdx, 1); return p; });
                setDayIdx(Math.max(0, dayIdx - 1));
              }}>Remove day</button>
            )}
          </div>

          <ol className="planstops">
          {day.stops.map((s, i) => (
              <li key={s.id} className={draft?.id === s.id ? "on" : ""}>
                <span className="si" style={{ background: tint(ICON_COLOUR[s.icon], 0.9) }}
                  dangerouslySetInnerHTML={{ __html: iconSvg(s.icon) }} />
                <button className="sbody" onClick={() => setDraft(s)}>
                  <b>{s.name || "Name this stop"}</b>
                  <span>{[s.time, ICON_LABEL[s.icon], s.note].filter(Boolean).join(" · ")}</span>
                </button>
                <span className="sacts">
                  <button onClick={() => move(i, -1)} aria-label="Move up" disabled={!i}>↑</button>
                  <button onClick={() => move(i, 1)} aria-label="Move down" disabled={i === day.stops.length - 1}>↓</button>
                  <button className="del" aria-label="Remove stop" onClick={() => {
                    edit((p) => { p.days[dayIdx].stops = p.days[dayIdx].stops.filter((x) => x.id !== s.id); return p; });
                    if (draft?.id === s.id) setDraft(null);
                  }}>×</button>
                </span>
              </li>
            ))}
            {!day.stops.length && <p className="fine">No stops yet. Add one below.</p>}
          </ol>

          {draft && (
            <div className="card stopform">
              <label className="lf">
                <span>Stop name</span>
                <input autoFocus value={draft.name} placeholder="Where is this?"
                  onChange={(e) => { setDraft({ ...draft, name: e.target.value }); patch(draft.id, (s) => { s.name = e.target.value; }); }} />
              </label>
              <div className="row2">
                <label className="lf">
                  <span>Time</span>
                  <input value={draft.time ?? ""} placeholder="9:00 PM"
                    onChange={(e) => { setDraft({ ...draft, time: e.target.value }); patch(draft.id, (s) => { s.time = e.target.value; }); }} />
                </label>
                <label className="lf">
                  <span>Getting there</span>
                  <span className="modepick">
                    {MODES.map((m) => (
                      <button key={m} className={`mp${draft.mode === m ? " on" : ""}`} aria-label={m}
                        onClick={() => { setDraft({ ...draft, mode: m }); patch(draft.id, (s) => { s.mode = m; }); }}>
                        <ModeIcon m={m!} />
                      </button>
                    ))}
                  </span>
                </label>
              </div>
              <label className="lf">
                <span>What to see <i className="hintlabel">one per line</i></span>
                <textarea rows={3} value={(draft.see ?? []).join("\n")}
                  placeholder={"Fountain show every 15 minutes\nConservatory inside is free"}
                  onChange={(e) => {
                    const see = e.target.value.split("\n").filter((l) => l.trim());
                    setDraft({ ...draft, see });
                    patch(draft.id, (s) => { s.see = see; });
                  }} />
              </label>
              <label className="lf">
                <span>Tip</span>
                <input value={draft.tip ?? ""} placeholder="Watch from the bridge by Paris"
                  onChange={(e) => { setDraft({ ...draft, tip: e.target.value }); patch(draft.id, (s) => { s.tip = e.target.value; }); }} />
              </label>
              <label className="lf">
                <span>Note</span>
                <input value={draft.note ?? ""} placeholder="Book ahead, closes at 11…"
                  onChange={(e) => { setDraft({ ...draft, note: e.target.value }); patch(draft.id, (s) => { s.note = e.target.value; }); }} />
              </label>

              <p className="lf"><span>Icon</span></p>
              <div className="icongrid">
                {ICON_GROUPS.map((g) => (
                  <div className="igroup" key={g.group}>
                    <h4>{g.group}</h4>
                    <div className="igrid">
                      {g.keys.map((k: IconKey) => (
                        <button key={k} className={`ib${draft.icon === k ? " on" : ""}`} title={ICON_LABEL[k]}
                          style={{ ["--c" as string]: ICON_COLOUR[k] }}
                          onClick={() => { setDraft({ ...draft, icon: k }); patch(draft.id, (s) => { s.icon = k; }); }}>
                          <span dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />
                          <i>{ICON_LABEL[k]}</i>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn done wide" onClick={() => setDraft(null)}>Done with this stop</button>
            </div>
          )}

          {adding ? (
            <div className="card">
              <label className="lf">
                <span>Add a stop</span>
                <input autoFocus value={q} placeholder="Search a place…" onChange={(e) => setQ(e.target.value)} />
              </label>
              <div className="sugg flat">
                {hits.map((h) => (
                  <button className={`s${h.mine ? " mine" : ""}`} key={`${h.name}${h.lat}`}
                    onClick={() => addStop({
                      name: h.name, lat: h.lat, lng: h.lng,
                      icon: h.mine && h.id ? "sight" : "pin",
                    })}>
                    <b>{h.name}</b><span>{h.sub}</span>
                  </button>
                ))}
                {!hits.length && <p className="s none">Type a name, or drop a pin instead.</p>}
              </div>
              <div className="row2">
                <button className="btn maps" onClick={() => { setAdding(false); setDropping(true); }}>Drop a pin</button>
                <button className="btn ghost" onClick={() => { setAdding(false); setQ(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="row2 addrow">
              <button className="btn done" onClick={() => setAdding(true)}>+ Add stop</button>
              <button className="btn maps" onClick={() => setDropping(true)}>Drop a pin</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

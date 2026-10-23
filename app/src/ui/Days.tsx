import { CITYCOL, DAYS, dayById, places, stopsOf } from "../data";
import { atOf, useTrip } from "../store";
import { amap, gmap, gearth } from "../lib/geo";
import NextBar from "./NextBar";
import PlanPicker from "./PlanPicker";
import type { Place, Step } from "../types";

const sideCol = (p: Place) => CITYCOL[p.v === "la" ? "la" : p.v === "trip" ? "az" : "lv"];

/** The four links under every stop: the same ones as the printed guide, so he can hand
 *  the navigation to the app he already trusts. */
const Links = ({ p }: { p: Place }) => (
  <span className="lk">
    <a href={gmap(p.q)} target="_blank" rel="noopener">Map</a>
    <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=transit`}
      target="_blank" rel="noopener">Directions</a>
    <a href={amap(p)} target="_blank" rel="noopener">Apple</a>
    <a className="e" href={gearth(p)} target="_blank" rel="noopener">3D</a>
  </span>
);

export default function Days() {
  const { day, selectDay, flying, setFlying, flyTo, setSnap } = useTrip();
  const atIdx = useTrip((s) => atOf(s.progress, s.day));
  const D = dayById(day);
  const stops = stopsOf(D);

  const onStep = (id: string) => {
    setFlying(false);
    if (window.innerWidth < 900) setSnap(0);
    flyTo(id);
  };

  return (
    <>
      <PlanPicker current="trip" />

      <div className="chips">
        {DAYS.map((d) => (
          <button key={d.id} className="chip" aria-pressed={d.id === day} onClick={() => selectDay(d.id)}>
            {d.short}<small>{d.city === "la" ? "LA" : d.city === "az" ? "AZ" : "LV"}</small>
          </button>
        ))}
      </div>

      <div className="dayhead">
        <div><h2>{D.title}</h2><span className="win">{D.win}</span></div>
        <button className="fly" onClick={() => setFlying(!flying)}>
          {flying ? "■ Stop" : "▶ Fly this day"}
        </button>
      </div>

      <NextBar stops={stops} />

      <ol className="steps">
        {D.steps.map((s: Step, k) => {
          const id = s[1];
          const p = id ? places[id] : undefined;
          const i = p ? stops.indexOf(id) : -1;
          return (
            <li
              key={k}
              className={`step${p ? "" : " noplace"}${i >= 0 && i < atIdx ? " walked" : ""}${i === atIdx ? " here" : ""}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a") || !p) return;
                onStep(id);
              }}
            >
              <span className={`n${i < 0 ? " blank" : ""}`} style={i >= 0 ? { background: sideCol(p!) } : undefined}>
                {i >= 0 ? i + 1 : "·"}
              </span>
              <span className="t">{s[0]}</span>
              <span className="txt">
                {s[2]}
                {s[4] ? <span className="tag cab">CAB</span> : null}
                {s[5] ? <span className="tag book">BOOK</span> : null}
                {s[3] ? <span className="how">{s[3]}</span> : null}
                {p ? <Links p={p} /> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

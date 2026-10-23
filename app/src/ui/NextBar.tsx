import { CITYCOL } from "../data";
import { atOf, useTrip } from "../store";
import { legOf } from "../lib/legs";
import { gdir, headingOf, km, kmLabel, lyftURL, roughMins, uberURL } from "../lib/geo";
import { ModeIcon, PersonIcon } from "./Icons";
import type { ModeKey, Place } from "../types";

const MODES: ModeKey[] = ["walk", "transit", "cab"];
const MODENAME: Record<ModeKey, string> = { walk: "Walk", transit: "Transit", cab: "Cab" };

/** Where he is, where he is going, and — the part the itinerary cannot decide for him
 *  — how he gets there.  The same leg is a 22-minute walk, a 10-minute monorail ride
 *  or a 7-minute Uber, and at 11 PM with sore feet that is the whole question. */
export default function NextBar({ stops }: { stops: string[] }) {
  const { day, modePick, setMode, setAt } = useTrip();
  const atIdx = useTrip((s) => atOf(s.progress, s.day));
  if (!stops.length) return null;

  const leg = legOf(day, atIdx, modePick);
  const here: Place | null = leg ? leg.from : null;

  if (!leg || !here) {
    return (
      <div className="nextbar">
        <Head name={stops.length ? undefined : ""} />
        <p className="to">Last stop of the day — nothing left to travel to.</p>
        <div className="go">
          {atIdx > 0 && <button className="back" onClick={() => setAt(atIdx - 1)}>↶ Back a stop</button>}
          <button className="back" onClick={() => setAt(0)}>↺ Start of day</button>
        </div>
      </div>
    );
  }

  const { to, mode, planned, rec, data } = leg;
  const mins = data ? data.min : roughMins(mode, here, to);
  const dist = data ? data.km : km(here, to);
  const gm = mode === "walk" ? "walking" : mode === "cab" ? "driving" : "transit";

  return (
    <div className="nextbar">
      <Head name={here.n} />
      <p className="to">
        Next: <b>{to.n}</b>
        <span className="dir">{kmLabel(dist)} km {headingOf(here, to)} · ~{mins} min</span>
        {leg.how && <span className="how">{leg.how}</span>}
      </p>

      <div className="picks">
        {MODES.map((x) => {
          const d = rec?.modes[x];
          return (
            <button
              key={x}
              className={`pick ${x}${x === mode ? " on" : ""}`}
              aria-pressed={x === mode}
              disabled={!d}
              onClick={() => setMode(day, atIdx, x)}
            >
              <ModeIcon m={x} />
              <b>{MODENAME[x]}{planned === x && <i>plan</i>}</b>
              <span>{d ? `${d.min} min · ${kmLabel(d.km)} km` : "—"}</span>
              <em>{d?.fare ?? ""}</em>
            </button>
          );
        })}
      </div>

      {data?.line && <p className="via">{data.line}</p>}
      {!!data?.steps?.length && (
        <details className="turns">
          <summary>Step by step</summary>
          <ol>
            {data.steps.map(([t, d], i) => (
              <li key={i}>{t}{d ? <span>{kmLabel(d)} km</span> : null}</li>
            ))}
          </ol>
        </details>
      )}

      <div className="go">
        <a href={gdir(here, to, gm)} target="_blank" rel="noopener">
          {mode === "walk" ? "Walking route" : mode === "cab" ? "Driving route" : "Transit route"}
        </a>
        <a className="uber" href={uberURL(here, to)} target="_blank" rel="noopener">Uber</a>
        <a className="lyft" href={lyftURL(here, to)} target="_blank" rel="noopener">Lyft</a>
        <button className="done" onClick={() => setAt(atIdx + 1)}>✓ I'm here</button>
        {atIdx > 0 && <button className="back" onClick={() => setAt(atIdx - 1)}>↶</button>}
      </div>
    </div>
  );
}

const Head = ({ name }: { name?: string }) => (
  <div className="at"><PersonIcon />{name ? `You're at ${name}` : "Nothing planned here"}</div>
);

export { CITYCOL };

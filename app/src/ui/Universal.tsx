import { RIDES } from "../data";

/** The park day, built around one fact: he is frightened of coasters, so the plan is
 *  ordered by what he can enjoy rather than by what the park advertises. */
const PLAN: [string, string, string][] = [
  ["9:20", "Studio Tour first.", "~60-min tram through real backlots. Small staged surprises, nothing drops or spins."],
  ["10:30", "Secret Life of Pets: Off the Leash.", "Gentle dark ride."],
  ["11:00", "Wizarding World.", "Hogsmeade, Ollivanders wand show, Hogwarts photos, Butterbeer."],
  ["12:15", "Lunch", "at Three Broomsticks or Krusty Burger. WaterWorld show if a time fits."],
  ["1:15", "Starway escalators", "down to the Lower Lot (~10 min)."],
  ["1:30", "Super Nintendo World.", "Mario Kart: Bowser's Challenge (no drops) and Power-Up Band games."],
  ["2:30", "Kung Fu Panda Adventure", "back on the Upper Lot, then walk out through Springfield."],
  ["3:00", "Exit", "to Universal City/Studio City station."],
];

export default function Universal() {
  return (
    <>
      <div className="dayhead">
        <div><h2>Universal, no scary rides</h2><span className="win">Sun Oct 25 · open 8 AM – 6 PM</span></div>
      </div>
      <ol className="tl">
        {PLAN.map(([t, b, rest]) => (
          <li key={t}><span className="t">{t}</span><b>{b}</b> {rest}</li>
        ))}
      </ol>
      <h3>Ride guide for you</h3>
      {RIDES.map(([v, n, d]) => (
        <div className="ride" key={n}>
          <span className={`v v-${v}`}>{v.toUpperCase()}</span>
          <div><b>{n}</b><span>{d}</span></div>
        </div>
      ))}
      <p className="note">
        Park closes 6 PM for Halloween Horror Nights (a separate scare event).
        Use the Universal app for live waits and show times.
      </p>
    </>
  );
}

import { AZCARDS } from "../data";

const TRAVEL: [string, string][] = [
  ["The Deuce bus · Vegas", "Whole Strip to Fremont, 24 hours. $8 for 24 hours, $20 for 3 days, in the rideRTC app."],
  ["Las Vegas Monorail", "Sahara to MGM Grand, stop at Westgate. 24-hour pass $15 at the station, $13.95 online. Mon until midnight, Tue–Thu until 2 AM, Fri–Sun until 3 AM."],
  ["LA Metro", "B Line: Union Station → Hollywood/Highland → Universal City. E Line: 7th St/Metro → Downtown Santa Monica. Tap phone wallet or TAP card."],
  ["Only 4 cab rides", "Airport → Circus Circus · Hollywood → Santa Monica · Seven Magic Mountains (driver waits) · Westgate → airport."],
];

export default function Tips() {
  return (
    <>
      <div className="verdict">
        <b>Santa Monica sunset: yes, go.</b> Sunset is about 6:08 PM over the Pacific; the pier
        lights and Ferris wheel switch on as the sky turns orange. Be there by 5:30.
      </div>

      <h3>Getting around</h3>
      {TRAVEL.map(([h, p]) => (
        <div className="card" key={h}><b>{h}</b>{p}</div>
      ))}

      <h3>Arizona day</h3>
      {AZCARDS.map(([h, p, m]) => (
        <div className="card" key={h}><b>{h} <span className="note">· {m}</span></b>{p}</div>
      ))}

      <h3>Book this week</h3>
      <div className="card">
        ✓ Grand Canyon West + Hoover Dam tour with Skywalk (confirm pickup 48 h ahead)<br />
        ✓ The Wizard of Oz at Sphere, Fri Oct 30, 5 PM show (doors 4:15; no 3–4 PM showing
        exists — check which time your ticket is for)<br />
        ✓ High Roller night ticket, Tue Oct 27 (closed to the public 4:00–7:30 PM that day)<br />
        ✓ rideRTC and Monorail passes<br />
        ✓ Check exactly where your LA bus stops
      </div>
      <p className="note">Tip: tap Share → Add to Home Screen to keep this map like an app.</p>
    </>
  );
}

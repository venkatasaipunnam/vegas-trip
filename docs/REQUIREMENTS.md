# Trip Map — feature requirements

Written Oct 22, 2026, from Sai's feedback on the live site (`https://vegastrip.vercel.app/`).
This is the specification for the next version. It is meant to be read without the chat
that produced it, and to survive a new Claude Code session.

Hard constraint on everything below: **the trip starts Sat Oct 24, 10:00 AM** (arrival at
LAS). Anything not shipped and tested on Sai's iPhone by Friday night Oct 23 is of no use
to him on the trip. That single fact drives the phasing in §6.

---

## 1. What Sai reported, and what is actually wrong

### 1.1 "The dropped pins at the locations are not exactly pinned"

Two different causes, and the first one is already fixed:

- **Fixed Oct 22 (second pass):** markers were laid out in normal document flow because
  `.mkwrap` carried `position:relative` and this page's `<style>` loads after
  `maplibre-gl.css`. Pins sat up to ~230 px below their location. Pin tip vs
  `map.project()` is now dx = dy = 0 for every stop of every day.
- **Still wrong — the coordinates themselves.** `src/data.json` holds hand-typed
  latitude/longitude, and several are rough. Checked against the OSM geocoder today:

  | Place | In `data.json` | OSM | Error |
  |---|---|---|---|
  | Bellagio Fountains | 36.1126, −115.1767 | 36.1128, −115.1741 | **~235 m** (pin is in the wrong part of the lake) |
  | Sphere | 36.1207, −115.1622 | 36.1212, −115.1621 | ~55 m (acceptable) |
  | Santa Monica Pier | 34.0094, −118.4973 | 34.0089, −118.4974 | ~55 m (acceptable) |
  | `lvcity` / `lacity` | 36.13, −115.16 / 34.06, −118.3 | — | 2-decimal placeholders, ~1 km grid |

  So the pin layer is correct and the *data* is not. There is also no distinction
  between a **map centre** (where the pin should sit, the building) and an
  **entrance / pickup point** (where a route should start and end). On the Strip these
  differ by 200–400 m and a whole pedestrian bridge, which is exactly the error Sai sees.

**R1.1** Every place gets verified coordinates at 5 decimals, sourced from a geocoder and
spot-checked on satellite imagery, with a recorded `src` field saying where the number came
from.
**R1.2** Every place gets an optional second point, `ent` (entrance / door / rideshare
pickup / bus bay), used as the origin and destination of routes and of all deep links. The
pin stays on the main point.
**R1.3** A checked-in script (`src/verifycoords.py`) re-geocodes every place and prints
anything more than 75 m from its stored point, so this cannot silently rot.

### 1.2 "The direction dotted lines are not accurate and best routes"

The legs are real road geometry, but from the wrong profile:

- `router.project-osrm.org/route/v1/**driving**/` is the only profile the public OSRM demo
  server offers. Every leg — including the ten walking legs on Sat 24 — is therefore
  snapped to the **car** network. On the Strip that means the line goes out to Las Vegas
  Blvd and back instead of through the Forum Shops and over the pedestrian bridges, which
  is both the wrong shape and the wrong distance.
- Durations are not routed at all: `minsOf()` is straight-line distance ÷ a fixed speed
  (4.6 / 22 / 34 km/h). It ignores the casino interiors, which is where the real time goes
  — Circus Circus to the Venetian is a 15-minute walk by the numbers and 30 in practice.
- Transit legs are drawn as a road line, which is a lie: the Deuce, the monorail and the
  Metro B/E lines do not follow the driving route and have their own stops.

**R1.4** Route each leg with the profile that matches its mode: pedestrian for walks, auto
for cabs, and the real line geometry for transit.
**R1.5** Take distance and duration from the router's answer, not from haversine, and show
them on the leg and in the next-leg bar.
**R1.6** Transit legs are drawn from the actual line shape (monorail, Deuce on Las Vegas
Blvd, Metro B and E) with their stations marked, not as a car route.
**R1.7** Keep the current behaviour that a dead network leaves the straight line in place,
and keep the `localStorage` cache — on the trip, on hotel wifi, a fetch may simply fail.
**R1.8** Pre-compute and commit every leg's geometry (`src/routes.json`) at build time, so
the phone does not depend on a public routing server being up at 9 PM on the Strip.

### 1.3 "It did not ask for mode of transport (walk or car or cab)"

Mode is inferred by `modeOf()` from the step's cab flag and a regex over its "how" text.
Sai is never asked and cannot change it. But the choice is genuinely his and changes by
the hour: the same Fontainebleau → LINQ leg is a 22-minute walk, a 10-minute monorail ride
or a 7-minute Uber, and at 11 PM with sore feet he wants the third.

**R1.9** A per-leg mode switch — **Walk / Transit / Cab** — in the next-leg bar. Tapping a
mode re-routes that leg, redraws it in that mode's style, updates distance, duration and
the deep links, and remembers the choice in `localStorage` per day and leg.
**R1.10** A trip-wide default ("I'd rather walk" / "I'd rather ride") that seeds every leg,
since Sai's stated preference is walking and transit with cabs only when needed.
**R1.11** Each mode shows its real cost next to it: walking free, Deuce $4 single / $8 for
24 h, monorail $13.95 online, cab/rideshare a rough fare estimate. He is on a mid-range
budget and this is the decision he is actually making.

### 1.4 "I should show the direction of journey"

Nothing on the map says which way the line goes. The figure shows where he is; the line
does not show where it leads.

**R1.12** Direction arrows along every leg (MapLibre `symbol` layer, `line` placement,
`symbol-spacing` scaled with zoom), pointing from the current stop towards the next.
**R1.13** The current leg animates in the direction of travel (dash offset marching
forward), so one glance says "this way".
**R1.14** A compass bearing and a cardinal heading in the next-leg bar ("Venetian — 1.2 km
north, 16 min walk"), which is what a person without a car actually needs at a crossing.
**R1.15** Turn-by-turn steps for the current leg, collapsed by default, from the router's
own manoeuvre list.

---

## 2. "An actual kind of maps with advanced info and more interactive"

These are the features that would make it read as a map application rather than a plan with
a map behind it. Ranked by how much they help Sai on this trip.

**R2.1 Live location, continuously.** Today "Me" is a one-shot geolocate. Instead:
`watchPosition`, a blue dot with an accuracy circle and a heading cone, the figure snapping
to the real position when it is within ~150 m of the expected stop, and a "re-centre"
button. This is the single biggest difference between a map and a diagram.
**R2.2 Auto-advance.** When he is within 120 m of the next stop for 60 seconds, offer
"Looks like you're at the Venetian — ✓ arrived", instead of making him tap "I'm here".
**R2.3 Search and anything-to-anything routing.** A search field over the trip's places
plus a geocoder (Nominatim or Photon), and the ability to route from where he is standing
to any place, not only along the plan. For "where is the nearest restroom / coffee /
pharmacy", an Overpass query by category.
**R2.4 Now-ness.** The app opens on today's day, scrolls to the current step by clock time,
and marks steps as past / now / next. It currently opens on whatever day was last selected.
**R2.5 Time maths.** Each step shows its planned time, the running arrival estimate based on
the chosen modes, and a warning when the chain no longer fits — "leave by 4:15 PM or you
miss the 5 PM doors at Sphere" (no late entry, so this one matters), and the work blocks
(Mon–Wed 6 AM–9 PM, Thu to 6 PM, Fri to 11 AM) drawn as unavailable.
**R2.6 Offline.** A service worker and a cached map area for the Strip, Hollywood, Santa
Monica and Grand Canyon West, so the page works with no signal; the PDF already covers the
worst case, but the map should not go blank.
**R2.7 Street-level view.** A Google Street View / Look Around deep link per stop, so he can
see the door he is walking towards before he is there.
**R2.8 Photo spots.** He asked for iconic photo spots: a camera pin with the exact spot and
the time of day it works (the Bellagio fountains from the bridge, the Welcome sign from the
median, the sign view from the Hollywood & Highland upper deck, Santa Monica at 6:08 PM).
**R2.9 Hours and status.** Each place carries its opening hours, so a stop shows "open until
11:30 PM" or "closed to the public 4:00–7:30 PM Tue" (the High Roller private event) rather
than relying on Sai remembering a tip line.
**R2.10 Weather and sunset** per day, which decides the Santa Monica timing and the Grand
Canyon layers.
**R2.11 A real legend and layer control:** satellite, 3D buildings, terrain, transit lines,
photo spots, all togglable, with the state remembered.
**R2.12 Share live location** with family, via a plain Apple/Google link — not a feature to
build, just a button that opens the OS sheet.

Lower priority, honestly nice-to-have: a day-elevation profile, a cost tracker, a packing
checklist, haptics, a dark basemap to match the neon UI.

---

## 3. Stack: should this become React or Vue?

**Recommendation: yes, but not before the trip.** Keep the single-file page as the thing
Sai carries this week; start the rewrite in parallel and switch over only when it beats the
current page on a real iPhone.

Why a rewrite is justified at all: `index.html` is 73 KB and 832 lines of template with the
map, the state machine, the sheet gestures, the routing cache and the rendering all in one
scope, strings built by hand. Every feature in §2 adds state that has to stay in sync with
every other piece — live position, chosen modes, progress, current time, layer toggles.
That is the exact problem a component framework and a state store exist to solve, and doing
R2.1 + R2.5 + R1.9 by hand in this file will be slower than doing them in React.

Why not today: there are 36 hours before he flies, the current page works, and a half-ported
app is worse than a plain one.

**Proposed stack**
- **Vite + React 18 + TypeScript.** React over Vue only because `react-map-gl` is the
  best-maintained MapLibre binding and more of the ecosystem (deck.gl for route animation)
  assumes it. Either framework would do the job.
- **MapLibre GL JS** stays — it works, it is free, and the terrain / extrusion knowledge in
  CLAUDE.md is hard-won and specific to it.
- **Zustand** for state (trip progress, chosen modes, live position, layers), small enough
  not to be its own project.
- **`vite-plugin-pwa`** for R2.6.
- Trip content moves from `src/data.json` to typed modules with a Zod schema, so a bad
  coordinate or a missing entrance fails the build rather than the trip.
- Still deploys to Vercel from `master`; the build output replaces the static root.
- Keep `legacy/` and the current `index.html` reachable at `/classic.html` as a fallback he
  can open if the new app misbehaves in the desert.

**Routing / data services to settle (verify before committing to one)**
- Walking and driving geometry: **Valhalla** (FOSSGIS public instance) or
  **OpenRouteService** (free key, `foot-walking` and `driving-car`) — both have the
  pedestrian profile OSRM's demo lacks. Pre-compute at build time (R1.8); the live call is
  only for off-plan routing (R2.3).
- **Transit: there is no free routing API worth relying on.** Google's needs a billed key.
  So: hand-encode the four lines Sai actually uses (monorail, Deuce, Metro B, Metro E) as
  GeoJSON with their stations, and keep deep-linking to Google Maps for live departures.
  This is a deliberate limit, not an oversight.
- Geocoding: Nominatim at build time (usage policy forbids bulk live calls), Photon live.
- Hours: hand-entered per place from the verified facts in CLAUDE.md, with the check date.

---

## 4. Data model changes

```
P[id] = {
  n, v, cat, lp,
  pt:  [lng, lat],          // 5dp, verified — where the pin sits
  ent: [lng, lat] | null,   // door / pickup / bus bay — where routes begin and end
  src: "osm:way/123456",    // provenance of pt
  hours: { mon:[["12:00","24:00"]], ..., closed:[{on:"2026-10-27", from:"16:00", to:"19:30", why:"private event"}] },
  photo: { at:[lng,lat], note:"from the bridge", best:"after dark" } | null,
  sv:   "..."               // Street View / Look Around
}

LEG = { from, to, modes: { walk:{geom,dist,dur,steps}, transit:{line,geom,dist,dur}, cab:{...} },
        planned:"walk", cost:{walk:0, transit:4, cab:14} }
```

`LEG` is generated into `src/routes.json` by a build script and committed. `data.json` keeps
only the human-edited trip content.

---

## 5. Acceptance criteria

A change is done when, on **Sai's own iPhone in Safari** (not a desktop browser at phone
width):

1. Every pin's tip sits on the right building in satellite view at z17 — checked for all 28
   places, not a sample.
2. No place is more than 75 m from its geocoded position, and `verifycoords.py` is clean.
3. Every walking leg follows pavements and bridges, not Las Vegas Blvd's carriageway.
4. Every leg shows a direction arrow, and the current leg's animation moves towards the
   next stop.
5. Each leg can be switched between Walk / Transit / Cab, and the geometry, duration, cost
   and deep links all change with it.
6. Distances and durations come from the router and are within a few minutes of what Google
   Maps says for the same two points.
7. With aeroplane mode on, the app still opens, shows the plan, the cached legs and the
   cached tiles.
8. Live location tracks him walking the length of the Strip without the dot jumping to
   another block.
9. No console errors; first paint under 3 s on cellular.

---

## 6. Phasing

**Phase 0 — before he flies (Thu night / Fri Oct 23).** Current single-file page only. No
framework, no rewrite.
- R1.1, R1.2, R1.3 — fix and verify every coordinate, add entrances. *This is the one that
  matters most; a wrong pin sends him to the wrong door.*
- R1.4 + R1.8 — pedestrian routing, pre-computed and committed, so the Strip walks are
  right and work offline.
- R1.9 — the Walk / Transit / Cab switch.
- R1.12, R1.14 — direction arrows and the bearing line in the next-leg bar.
- R2.4 — open on today, scroll to now.
- Then a live iPhone pass: touch gestures, geolocation over HTTPS, home-screen install —
  the three things never yet tested on real hardware.

**Phase 1 — during the trip, only if something is wrong.** Content fixes, nothing
structural. Confirm the open questions in CLAUDE.md (bus stops, Universal ticket type,
Grand Canyon pickup, which Sphere showtime he holds).

**Phase 2 — after Oct 31.** The Vite + React + TypeScript rewrite, then R2.1, R2.2, R2.3,
R2.5, R2.6 and the rest of §2. There is no deadline on it, which is the right time to
change the stack — and the same app then works for the next trip.

---

## 7. Open decisions for Sai

1. Phase 0 scope: is the pin/route/mode/direction set above the right thing to spend the
   remaining time before Saturday on, or is something else more urgent?
2. Walk-first or ride-first as the trip-wide default (R1.10)?
3. Is the rewrite worth doing at all after the trip, or is the single page enough once the
   accuracy is fixed?
4. Which Wizard of Oz showtime he holds (2 / 5 / 8 PM) — R2.5's warnings are wrong without
   it.

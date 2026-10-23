# Vegas & LA Trip Map — handoff context

Project moved from a claude.ai chat (Oct 22, 2026) to Claude Code. This file is the full context.
Owner: **Sai** (GitHub: `venkatasaipunnam`). Sai is on an **iPhone** during the trip; everything must work in iPhone Safari.

## Goal
A website Sai can open on his iPhone that feels like a real 3D map ("like Google Maps, like I'm living in the city"):
real streets, satellite view, tilting 3D buildings, his day-by-day plan, and tap-to-navigate for every stop.

**Two front ends now:** `app/` (Vite + React + TypeScript) is what Vercel serves at the
root, and the original single-file `index.html` is served at `/classic.html` as a
fallback.  Everything below about the map, the data model and the trip itself applies to
both; the React app is described under "The React app (app/)".

**Hosting: Vercel, not GitHub Pages.** Pages was enabled on Oct 22, 2026 and switched off the
same day at Sai's request — he wants the site served only from Vercel. GitHub stays as the
code remote, and Vercel deploys from it, so every push to `master` redeploys.
**The site is `https://vegastrip.vercel.app/`** — verified live at iPhone width on Oct 22, 2026:
HTTPS, tiles, 3D buildings, 5 route layers, the standing figure, the next-leg bar, no console
errors. `https://venkatasaipunnam.github.io/vegas-trip/` is dead; do not re-enable
Pages.
**Next step:** open the site on Sai's own iPhone and check touch
gestures, geolocation (needs HTTPS, which Vercel provides) and home-screen install.

## Current status
| Item | Status |
|---|---|
| `index.html` (3D map site) | Done and **tested live with real tiles** (local server, Chromium, iPhone-sized and desktop viewports): streets, labels, 3D buildings, satellite, Grand Canyon terrain, markers, popups, day switching and all three tabs render with no console errors. Not yet tested on a real iPhone. |
| GitHub repo `venkatasaipunnam/vegas-trip` | **public**, default branch `master`, pushed from this machine with Sai's own git credentials (`gh` is not logged in; the Pages API call used the token from the git credential helper). |
| Push from claude.ai | Refused (Claude GitHub App not installed on the repo). Claude Code on Sai's machine uses his own git credentials, so this should work. |
| Hosting | **Vercel, live at `https://vegastrip.vercel.app/`** (imported `venkatasaipunnam/vegas-trip`, framework preset "Other", no build command, root `/`). `vercel.json` sets `cleanUrls` and a no-cache header on `index.html` so the phone never holds a stale page. GitHub Pages was enabled and then deleted via the API the same day — Sai does not want it hosted there. |
| `exports/Sai-Vegas-LA-Trip-Guide.pdf` | Done. 18 phone-sized pages, works offline, tappable Map/Directions/Apple Maps/3D links. |
| `exports/Sai-Vegas-LA-Trip.kml` | Done. 9 folders (one per day + extras), 22 placemarks. Import into Google My Maps (desktop) or open in Google Earth. |
| `legacy/artifact-trip-map.html` | First version (claude.ai artifact, hand-drawn SVG map). Sai found it too basic. Kept for reference only. |

## The React app (app/) — the version Sai will use from now on

Sai asked twice for the UI to move to a framework, so `app/` is the real front end and
the single-file page is kept as a fallback.  Vercel builds `app/` and serves it at the
root; `index.html` (the old page) is copied to **`/classic.html`**, so if the new app
ever misbehaves in the desert there is a working page one URL away.

```
npm --prefix app install        # once
npm --prefix app run dev        # http://localhost:8756  (or: preview "trip-app")
npm --prefix app run build      # type-checks, then builds app/dist
```

- **Vite 5 + React 18 + TypeScript (strict).**  `react-map-gl@7.1.7`'s maplibre entry
  (`react-map-gl/maplibre`) over **maplibre-gl 4.7.1**, so the map is declarative:
  `<Source>` / `<Layer>` / `<Marker>` / `<Popup>` instead of imperative `addLayer`
  calls.  Terrain, the 3D-building layer, the arrow bitmap and the `--mks` pin scale
  stay imperative inside `MapView` — they need the map instance, and the pin scale has
  to be written per zoom frame without a re-render.
- **zustand** (`src/store.ts`) holds day, progress, chosen modes, the toggles and the
  focus target.  It writes to the *same* localStorage keys as the old page
  (`np-progress`, `np-mode`), so a phone that already has his place in the day keeps it.
- **One copy of the trip content.**  `vite.config.ts` aliases `@trip` to the repo's
  `src/`, so the app imports `src/data.json` and `src/routes.json` directly; the Python
  scripts and the classic page read the same files.  `src/types.ts` types them, which is
  what turns a typo in the plan into a build error instead of a blank screen.
- **Components:** `map/MapView` (map, terrain, camera, popup, fly-through),
  `map/RouteLayers` (the six route layers + arrows), `map/Pins`, `map/Me` (the figure),
  `ui/Sheet` (drag and snap), `ui/Days`, `ui/NextBar` (the mode switch),
  `ui/Universal`, `ui/Tips`, `ui/Legend`, `ui/Top`, `ui/Icons`.
- **`src/styles.css` is the old page's stylesheet, unchanged,** because the class names
  were kept.  The only additions are `.menudge` (the figure's sideways nudge, now a CSS
  transform off `--mks` instead of a marker offset) and a rule to size the map canvas.
- The bundle is ~1.1 MB (307 KB gzipped), with maplibre-gl split into its own chunk so a
  content edit does not make the phone re-download the engine.

### What the React version does differently (Oct 22, 2026, after Sai's review)
- **One leg at a time.** The map draws only the leg he is on, in blue (`#3d8bff`), with
  its direction arrows and marching dashes. Eight dotted lines across the Strip said
  nothing about what to do next. The overnight coach stays as a faint dashed context
  line; everything else is gone until he advances.
- **The figure stands exactly on the stop.** The old sideways nudge kept him clear of
  the pin but made the two markers disagree about where the stop was — the same
  complaint as a misplaced pin. Now the pin he is standing at fades instead
  (`.mk.under`).
- **"Fly this day" is a journey, not a slideshow** (`map/useJourney.ts`): the figure
  travels along the real road geometry of each leg with the camera behind him, bearing
  smoothed so a winding road does not spin the view, legs timed 5–13 s regardless of
  length (the Grand Canyon coach is 250 km), and `setAt` advancing as he arrives. He is
  a plain MapLibre marker moved per frame, not a React component: a re-render per frame
  is what stutters on a phone. Any drag, or the Stop button, ends it.
- **Uber and Lyft open on the confirm screen.** Both links carry pickup *and* dropoff —
  coordinates, nickname and address — and start from the place's `ent` (the kerb), not
  its pin. Google Directions uses the same two points.
- **Buttons:** one full-width primary ("✓ I'm at <stop>"), three equal secondary links
  above it (Drive/Walk/Transit, Uber, Lyft), every target at least 46 px tall.

## Terrain: why it is conditional
`setTerrain` is what makes the Grand Canyon read as 3D, but it must not be on for close-up
city views, and it must not be switched on mid-flight:
- Enabled during a `flyTo`, the camera lands below the raised surface and the map washes out
  to a blank cream/dark field. This made every stop tap on the Strip look broken.
- So `camStart()` drops terrain before any animated move and `applyTerrain()` restores it on
  `moveend`, and `wantTerrain()` only asks for it out of town (`focusNature`) or below
  zoom `TERRAIN_MAXZOOM` (13.2).
- Nature stops also need framing: zoom 12.4 / bearing -35, or the camera faces the flat
  plateau behind the rim instead of the canyon.

## Pins, the sheet and the route (fixed Oct 22, 2026, second pass)
- **Pins were in the wrong place.** `.mkwrap`/`.mewrap` carried `position:relative`, and
  this page's `<style>` loads after `maplibre-gl.css`, so it beat
  `.maplibregl-marker{position:absolute}` and every marker was laid out in normal flow:
  each pin sat up to ~230px *below* its real location, the drift growing with the number
  of markers. They are `position:absolute;top:0;left:0` now, and each pin's centre has
  been checked against `map.project()` for every stop of a day (dx = dy = 0).
- **Pins scale with zoom.** `--mks` on `<html>` is rewritten from `map.on("zoom")`
  (`pinScale`: 0.42 at z≤9.5 up to 1.12 at z≥16.5). The scale lives on its own
  `.mkscale` layer between MapLibre's transform and the pin, because the pin's tip lands
  exactly on the wrapper's centre, so scaling about 50%/50% keeps the tip on its
  coordinate. The figure scales off the same variable about its feet, and its sideways
  offset (`setOffset`) scales with it.
- **The sheet is dragged, not just tapped.** A pointer drag on the handle moves it frame
  by frame (`.dragging` turns the transition off) and it settles on the nearest of three
  heights: ~17% of the screen (peek), 44%, 86%. A tap still cycles the three. The height
  is written to `--sheet-h` on `<html>`, because the legend is positioned off the same
  variable and has to move with it. Disabled at ≥900px, where the sheet is a side panel.
- **`sheetPad` is capped** at 42% of the viewport height. An uncapped sheet left
  `fitBounds` almost no box and MapLibre answered by pulling the camera miles back
  ("Map cannot fit within canvas").
- **Legs follow real roads.** OSRM's public demo server
  (`router.project-osrm.org/route/v1/driving/`) returns the geometry for each leg and for
  the `ROUTES` polylines. Each day is drawn straight first and the roads replace it as
  answers arrive, so a dead network just leaves the old direct lines. Answers are cached
  in `localStorage["np-roads"]`, rounded to 5 decimals (~18 KB for a Vegas day); a failed
  leg is remembered in memory only, so a reload retries it.

## Standing figure, legs and travel mode
- A green figure (`.mewrap`, marker `anchor:"bottom"`, nudged 25px × the zoom scale right
  of the stop's pin, `z-index:3` so the pin cannot cover him) stands on the stop Sai is at
  right now. He is an actual little person — head, torso, two arms, two legs, each limb its
  own group — drawn twice, a dark ink pass under a green skin pass, which is what keeps him
  readable on satellite imagery. He breathes and sways when standing and breaks into a
  stride (`.walking`, arms opposite legs) when the next leg is a walk. The two passes are
  duplicated markup rather than `<use>` of a `<defs>` group, because animating referenced
  content is not reliable in WebKit. `atIdx` is his index into the day's stop list and
  is saved in `localStorage["np-progress"]` per day, so closing Safari mid-day keeps his place.
- The day line is no longer one dashed polyline: `drawRoute()` emits one feature per leg with
  `m` (walk | transit | cab) and `st` (done | now | next). `line-dasharray` takes no
  data-driven expression, so there is one layer per mode — round dots for walking, dashes for
  transit, solid for cab — plus `route-now` as a halo under the leg he is on.
  Legs behind him turn grey, the current leg gold, later legs keep the city colour.
- Mode comes from the step that introduces the stop: its cab flag and its "how" text
  (`modeOf`), falling back to distance (under 1.1 km = walk).
- The bar above the step list shows where he is, the next stop, the mode and a rough duration,
  with Google walking/driving/transit directions, Uber and Lyft deep links, "✓ I'm here"
  (advance, fly to the next stop) and "↶" (back). Any stop's popup also offers "✓ I'm here".
- Markers carry no `backdrop-filter`: re-blurring 20-odd pins on every frame of a pinch is what
  made them lag behind the map. The anchoring itself was already correct (pin tip and the
  figure's feet both sit on the projected ground point at every zoom).

## Why it's built this way
- The claude.ai artifact sandbox (and the in-app file preview) **blocks external map tiles, fetch and workers**. That's why the first map was a hand-drawn diagram and why `index.html` showed "Uncaught Error: Script error." in the Claude app preview. The real map only works when the page is served from a normal web URL (GitHub Pages).
- iPhone's Files app won't run HTML/JS, so the site **must be hosted**.
- `index.html` now degrades gracefully: if MapLibre fails, it shows a banner, hides map controls, and still renders the full plan with per-stop link buttons.

## index.html architecture (single file, no build tooling needed to deploy)
- Published as is (public, hotel names included). Static files, no build step: Vercel serves
  the repo root.
- **MapLibre GL JS 4.7.1** from unpkg (`maplibre-gl@4.7.1`).
- Base style: **OpenFreeMap `liberty`** (`https://tiles.openfreemap.org/styles/liberty`), free, no API key.
- **Satellite:** Esri World Imagery raster layer (toggle, hidden by default), inserted below the first symbol layer.
- **3D terrain:** AWS Terrain Tiles (terrarium encoding) as `raster-dem` + a hillshade layer; `setTerrain` exaggeration 1.25 when 3D is on. Important for the Grand Canyon.
- **3D buildings:** uses the style's own `fill-extrusion` layer if present, else adds `bldg3d` from source `openmaptiles`, source-layer `building`, height `render_height`.
- **UI:** top-left brand, top-right buttons (3D, Satellite, Me = geolocate), bottom sheet (left side panel at ≥900px) with tabs **Days / Universal / Tips**.
- **Days tab:** day chips → numbered stops, route line (glowing dashed), `fitBounds`; tapping a stop flies the camera there (pitch ~62°, rotating bearing) and opens a popup with see/how/tip + buttons (Google Directions transit, Apple Maps transit, Google Earth 3D). "▶ Fly this day" = sequential camera tour; any drag stops it.
- Fonts: Bungee (display), Figtree (body), JetBrains Mono (times). Palette: night `#130f22`, neon pink `#ff4fa3` (Vegas), cyan `#3fe0e8` (LA), amber `#ffb547` (Arizona/sunset), green `#5ee39a` (free).

## Data model (`src/data.json` → `const DATA` in the page)
- `P` — places keyed by id: `{n, v, lat, lng, cat, lp, dy?, see[], how, tip, q, goto?}`
  - `v`: `"lv"` (Vegas), `"la"`, `"trip"` (out-of-town: Seven Magic Mountains, Hoover Dam, Grand Canyon West, plus `lvcity`/`lacity` aggregate pins that have `goto`).
  - `cat`: stay | see | show | free | park | beach | nature | travel | extra.
  - `q`: search string used for Google Maps / Earth links.
- `DAYS` — `{id, short, title, city: lv|la|az, win, bars, block, steps}`; each step is a tuple
  `[time, placeId or "", text, howToGetThere, isCab?, mustBook?]`.
- `RIDES` — `[verdict go|maybe|skip, name, note]` for Universal. `LACARDS`, `AZCARDS` — `[title, text, meta]`.
- `ROUTES` (in template JS, not data.json): extra polylines for the bus to LA (d25), Grand Canyon tour (d31), Seven Magic Mountains (d30).

### Rebuilding
```
python3 src/build.py          # template.html + data.json -> index.html
python3 src/mkpdf.py          # -> exports/Sai-Vegas-LA-Trip-Guide.pdf (needs reportlab, DejaVu fonts)
node src/mk.js legacy/artifact-trip-map.html   # KML generator; reads data from the legacy page, writes KML to cwd
```
Edit trip content in `src/data.json`, then rebuild. Don't hand-edit the JSON blob inside index.html.

## The trip
- **Traveler:** Sai, first time in Las Vegas. Attending **Guidewire Connections** (Fontainebleau) Oct 26–29. Mid-range budget. **No car**: prefers walking + public transit, cabs only when needed (~4 planned).
- **Scared of roller coasters and intense rides.** Already has a Universal ticket (type unknown; may or may not include Express).
- **Wants:** Sphere, High Roller ("the wheel"), Strip attractions, Seven Magic Mountains ("7stones"), Hollywood Sign, Santa Monica sunset, an Arizona trip, iconic photo spots.
- **Prefers** Google Maps with a main list plus a separate list per day.

### Fixed bookings
| When | What |
|---|---|
| Sat Oct 24, 10:00 AM | Arrive LAS |
| Sat Oct 24 3 PM → Mon Oct 26 10 AM | **Circus Circus** |
| Sun Oct 25, 2:30 AM | Bus Vegas → LA, arrive 8:15 AM (stop location unconfirmed; plan assumes Downtown LA / Union Station) |
| Mon Oct 26, 12:30 AM | Bus LA → Vegas, arrive 5:50 AM |
| Mon Oct 26 3 PM → Thu Oct 29 10 AM | **Fontainebleau** |
| Thu Oct 29 3 PM → Sat Oct 31 before 10 AM | **Westgate** |
| Sat Oct 31, 11:59 PM | Flight out of LAS |

### Unavailable (work) — every plan must respect this
- Mon, Tue, Wed: **6 AM – 9 PM**
- Thu: **6 AM – 6 PM**
- Fri: until **11 AM**
- Sat & Sun: fully free

### Decisions made with Sai
- Arizona = **Grand Canyon West + Skywalk + Hoover Dam bus tour, Sat Oct 31** (~6:30 AM pickup, back ~5–6 PM).
- "7stones" = **Seven Magic Mountains**, Fri Oct 30 after 11 AM, by cab with the driver waiting (no transit, no restrooms).
- Sphere = **The Wizard of Oz at Sphere**, Fri Oct 30. The 3–4 PM slot decided with Sai **does not exist**: the only Friday showtimes are 2 PM, 5 PM and 8 PM. The plan now points at the **5 PM** show (doors 4:15), which is the one that fits after Seven Magic Mountains — needs Sai's confirmation, and his ticket may already be for another time.
- Design direction: mix of neon Vegas, retro road-trip postcard and clean, "cool and animated."

### Day plan (summary; full detail in data.json)
- **Sat 24:** LAS → Circus Circus bag drop → Venetian/Grand Canal + Sphere exterior → Wynn → check in, nap 3:30–6 → Caesars Forum Shops, Bellagio Conservatory + fountains, optional Eiffel deck → rest before 2:30 AM bus.
- **Sun 25 (LA):** 8:15 arrive → Metro B Line to Universal (inside ~9:20, leave 3:00) → B Line one stop to Hollywood & Highland (sign view, Walk of Fame) → cab to Santa Monica Pier → sunset ~6:05 PM → dinner on Third Street Promenade → Metro E Line back → 12:30 AM bus.
- **Mon 26:** 5:50 AM arrive; move hotels; optional 9 PM stroll to Wynn/Encore, else sleep.
- **Tue 27:** 9 PM monorail to LINQ → High Roller night ride (open until 11:30 PM) → LINQ Promenade.
- **Wed 28:** 9 PM Deuce to Fremont Street Experience.
- **Thu 29:** move to Westgate; 6:30 PM monorail to MGM → New York-New York, Excalibur, Luxor; optional Sphere exterior (Metallica night, crowds).
- **Fri 30:** 11:15 cab → Welcome sign → Seven Magic Mountains → back → Wizard of Oz at Sphere 5 PM (doors 4:15) → early night.
- **Sat 31:** 6 AM checkout, bags at Westgate bell desk → Grand Canyon West tour → back ~5:30 → Halloween night on the Strip → 9:15 PM cab to LAS.

### Universal plan (no coasters)
GO: Studio Tour (first), Secret Life of Pets, Mario Kart: Bowser's Challenge, Kung Fu Panda Adventure, WaterWorld, Ollivanders.
MAYBE: Minion Mayhem (ask for stationary seats), Flight of the Hippogriff (small family coaster), Jurassic World (one big drop, wet).
SKIP: Fast & Furious: Hollywood Drift, Revenge of the Mummy, Forbidden Journey, Transformers, The Simpsons Ride.

## Facts re-checked on Oct 22, 2026 — second pass (re-verify before relying on them)
- Universal Studios Hollywood, Sun Oct 25: **8 AM – 6 PM** (early entry 7 AM for tickets that include it); Halloween Horror Nights runs after close (separate ticket). Only aggregator data (thrill-data) gives a date-specific listing; the official calendar could not be read.
- **Fast & Furious: Hollywood Drift** opened Sept 16, 2026: 72 mph, up to 3.6 G, spinning vehicles.
- Animal Actors and the Special Effects show were removed (the coaster was built on their space).
- The Wizard of Oz at Sphere: 75 min, doors 45 min early, no late entry. **Fri Oct 30 showtimes are 2 PM, 5 PM and 8 PM — there is no 3–4 PM showing.** About $142 all in (was listed as "from ~$100"). Halloween activities in the atrium Oct 30 – Nov 1; afterparty following the 8 PM show on Oct 30.
- Metallica at Sphere Oct 22 (tonight), 24, 29, 31 (plus Nov 5–7) → heavy crowds near the Venetian those nights.
- High Roller: **Mon–Thu noon–midnight, Fri–Sun noon–2 AM**; **closed to the public Tue Oct 27, 4:00–7:30 PM** (private event; was 4–6:30 PM); ride = 30 min. Also closed all day Nov 19–21.
- RTC Deuce: 24/7; $6 for 2 h, $8 for 24 h, $20 for 3 days, $4 single ride (rideRTC app; the 3-day pass cannot be bought on board).
- Las Vegas Monorail: $15 per 24 h at the station; the official ticket site now shows **$13.95** online (other sources still say $13.45). Mon 7 AM–midnight, Tue–Thu to 2 AM, Fri–Sun to 3 AM; stations include Sahara, Westgate, Harrah's/LINQ, MGM Grand.
- Grand Canyon West + Hoover Dam tours: ~10.5–12 h, pickups **anywhere from ~5 AM to ~7 AM depending on the operator** (commonly 6:30–6:50 AM at Sahara, Circus Circus, Treasure Island), drop-off 7–8 PM for some operators, only small bags allowed, confirm pickup **48–72 h ahead**; pickup details usually arrive the day before. The Skywalk is ~4,000 ft above the canyon floor; phones are not allowed on it.
- Seven Magic Mountains: free, no ticket, no transit, no restrooms (nearest ~5 miles away in Jean); cabs can't easily be called back from there. **Hours now described as sunrise to sunset** rather than "any time" — no lighting after dark. The Nevada Museum of Art lists the installation through **Dec 31, 2026**.
- Santa Monica sunset Oct 25: **6:08 PM** PDT (was noted as 6:05).

## Open questions for Sai
- Exact bus stop locations in Vegas and LA (check tickets).
- Universal ticket type (Express / Early Access would allow more).
- Which Grand Canyon tour operator → pickup spot near Westgate (pickups range ~5–7 AM, so the 6:30 AM assumption may be off).
- Which Wizard of Oz at Sphere showtime he holds a ticket for (2, 5 or 8 PM on Fri Oct 30) — the plan assumes 5 PM.

## Possible next improvements
- Live test on iPhone Safari after deploy: geolocation ("Me" button, needs HTTPS — Pages provides it; it is the one feature that could not be exercised locally), touch drag/pitch gestures, home-screen install.
- Console still logs `Image "..." could not be loaded` warnings for POI icons the OpenFreeMap Liberty sprite doesn't carry. Cosmetic only — MapLibre logs these itself and a `styleimagemissing` handler does not suppress them (the event never fires for this path).
- If OpenFreeMap or Esri tiles fail, swap the style (any MapLibre-compatible free style) and keep the satellite layer optional.
- Optional night/dark basemap to match the neon UI.
- Per-day Google Maps lists: saved lists can't be imported from a file; the KML import into Google My Maps gives one layer per day instead.

# Vegas & LA Trip Map — handoff context

Project moved from a claude.ai chat (Oct 22, 2026) to Claude Code. This file is the full context.
Owner: **Sai** (GitHub: `venkatasaipunnam`). Sai is on an **iPhone** during the trip; everything must work in iPhone Safari.

## Goal
A website Sai can open on his iPhone that feels like a real 3D map ("like Google Maps, like I'm living in the city"):
real streets, satellite view, tilting 3D buildings, his day-by-day plan, and tap-to-navigate for every stop.

**Immediate next step:** publish `index.html` to GitHub Pages at
`https://venkatasaipunnam.github.io/vegas-trip/` and confirm it loads.

## Current status
| Item | Status |
|---|---|
| `index.html` (3D map site) | Done and **tested live with real tiles** (local server, Chromium, iPhone-sized and desktop viewports): streets, labels, 3D buildings, satellite, Grand Canyon terrain, markers, popups, day switching and all three tabs render with no console errors. Not yet tested on a real iPhone. |
| GitHub repo `venkatasaipunnam/vegas-trip` | Created by Sai, **public**. Was empty at 18:21 ET; Sai may have pushed a README (`git branch -M master`). Pull before pushing. Default branch: **master**. |
| Push from claude.ai | Refused (Claude GitHub App not installed on the repo). Claude Code on Sai's machine uses his own git credentials, so this should work. |
| GitHub Pages | Not enabled yet. Use branch `master`, folder `/ (root)`. Sai chose to publish **as is** (public, hotel names included). |
| `exports/Sai-Vegas-LA-Trip-Guide.pdf` | Done. 18 phone-sized pages, works offline, tappable Map/Directions/Apple Maps/3D links. |
| `exports/Sai-Vegas-LA-Trip.kml` | Done. 9 folders (one per day + extras), 22 placemarks. Import into Google My Maps (desktop) or open in Google Earth. |
| `legacy/artifact-trip-map.html` | First version (claude.ai artifact, hand-drawn SVG map). Sai found it too basic. Kept for reference only. |

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

## Standing figure, legs and travel mode
- A green figure (`.mewrap`, marker `anchor:"bottom"`, nudged 17px right of the stop's pin)
  stands on the stop Sai is at right now. `atIdx` is his index into the day's stop list and
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
- Sphere = **The Wizard of Oz at Sphere**, Fri Oct 30, 3–4 PM showing.
- Design direction: mix of neon Vegas, retro road-trip postcard and clean, "cool and animated."

### Day plan (summary; full detail in data.json)
- **Sat 24:** LAS → Circus Circus bag drop → Venetian/Grand Canal + Sphere exterior → Wynn → check in, nap 3:30–6 → Caesars Forum Shops, Bellagio Conservatory + fountains, optional Eiffel deck → rest before 2:30 AM bus.
- **Sun 25 (LA):** 8:15 arrive → Metro B Line to Universal (inside ~9:20, leave 3:00) → B Line one stop to Hollywood & Highland (sign view, Walk of Fame) → cab to Santa Monica Pier → sunset ~6:05 PM → dinner on Third Street Promenade → Metro E Line back → 12:30 AM bus.
- **Mon 26:** 5:50 AM arrive; move hotels; optional 9 PM stroll to Wynn/Encore, else sleep.
- **Tue 27:** 9 PM monorail to LINQ → High Roller night ride (open until 11:30 PM) → LINQ Promenade.
- **Wed 28:** 9 PM Deuce to Fremont Street Experience.
- **Thu 29:** move to Westgate; 6:30 PM monorail to MGM → New York-New York, Excalibur, Luxor; optional Sphere exterior (Metallica night, crowds).
- **Fri 30:** 11:15 cab → Welcome sign → Seven Magic Mountains → back → Wizard of Oz at Sphere 3–4 PM → early night.
- **Sat 31:** 6 AM checkout, bags at Westgate bell desk → Grand Canyon West tour → back ~5:30 → Halloween night on the Strip → 9:15 PM cab to LAS.

### Universal plan (no coasters)
GO: Studio Tour (first), Secret Life of Pets, Mario Kart: Bowser's Challenge, Kung Fu Panda Adventure, WaterWorld, Ollivanders.
MAYBE: Minion Mayhem (ask for stationary seats), Flight of the Hippogriff (small family coaster), Jurassic World (one big drop, wet).
SKIP: Fast & Furious: Hollywood Drift, Revenge of the Mummy, Forbidden Journey, Transformers, The Simpsons Ride.

## Facts checked on Oct 22, 2026 (re-verify before relying on them)
- Universal Studios Hollywood, Sun Oct 25: **8 AM – 6 PM**; Halloween Horror Nights runs after close (separate ticket).
- **Fast & Furious: Hollywood Drift** opened Sept 16, 2026: 72 mph, up to 3.6 G, spinning vehicles.
- Animal Actors and the Special Effects show were removed (the coaster was built on their space).
- The Wizard of Oz at Sphere: 75 min, no late entry, from ~$100; Halloween activities in the atrium Oct 30 – Nov 1.
- Metallica at Sphere Oct 24, 29, 31 (sold out) → heavy crowds near the Venetian those nights.
- High Roller: Tue 12:30–11:30 PM (Fri/Sun later); closed to the public Tue Oct 27, 4–6:30 PM (private event); ride = 30 min.
- RTC Deuce: 24/7; $6 for 2 h, $8 for 24 h, $20 for 3 days (rideRTC app).
- Las Vegas Monorail: $15 per 24 h ($13.45 online); Mon 7 AM–midnight, Tue–Thu to 2 AM, Fri–Sun to 3 AM; stations include Sahara, Westgate, Harrah's/LINQ, MGM Grand.
- Grand Canyon West + Hoover Dam tours: ~11 h, pickups ~6:30–7 AM (e.g. Sahara, Circus Circus, Treasure Island), only small bags allowed, confirm pickup 48 h ahead. The Skywalk is ~4,000 ft above the canyon floor; phones are not allowed on it.
- Seven Magic Mountains: free, open any time, no transit, no restrooms; cabs can't easily be called back from there.
- Santa Monica sunset Oct 25: about 6:05 PM.

## Open questions for Sai
- Exact bus stop locations in Vegas and LA (check tickets).
- Universal ticket type (Express / Early Access would allow more).
- Which Grand Canyon tour operator → pickup spot near Westgate.

## Possible next improvements
- Live test on iPhone Safari after deploy: geolocation ("Me" button, needs HTTPS — Pages provides it; it is the one feature that could not be exercised locally), touch drag/pitch gestures, home-screen install.
- Console still logs `Image "..." could not be loaded` warnings for POI icons the OpenFreeMap Liberty sprite doesn't carry. Cosmetic only — MapLibre logs these itself and a `styleimagemissing` handler does not suppress them (the event never fires for this path).
- If OpenFreeMap or Esri tiles fail, swap the style (any MapLibre-compatible free style) and keep the satellite layer optional.
- Optional night/dark basemap to match the neon UI.
- Per-day Google Maps lists: saved lists can't be imported from a file; the KML import into Google My Maps gives one layer per day instead.

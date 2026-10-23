"""Pre-compute every leg of the trip, in all three travel modes, into src/routes.json.

Why at build time rather than in the page:
 - The page used to route each leg through OSRM's public demo server, which only
   serves the *driving* profile.  Every Strip walk therefore followed the Las Vegas
   Boulevard carriageway instead of the pavements and pedestrian bridges Sai will
   actually use, and the shape and the distance were both wrong.
 - Routing on demand also means no route when there is no signal, and the one place
   he will certainly have no signal is the Arizona desert.
Valhalla gives a real pedestrian profile, so each leg is routed here once — walk,
transit and cab — and committed.  The phone then needs nothing but the file.

Transit is not a road route either: the monorail runs behind the casinos and the
Metro B Line is in a tunnel.  A rail leg is therefore built as walk + the real line
shape from src/transit.json + walk, which is what the journey looks like.  Legs on
the Deuce do follow the road, so those use the bus profile.

  python3 src/mktransit.py   # first, for the line shapes
  python3 src/mkroutes.py    # -> src/routes.json
  python3 src/build.py       # -> index.html
"""
import json, math, pathlib, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
VALHALLA = "https://valhalla1.openstreetmap.de/route"
PAUSE = 1.2                       # be a good citizen on the public instance
WALK_MAX_KM = 14.0                # past this, offering a walk is just noise
CACHE = ROOT / "src/.routecache.json"   # raw answers, so a re-run costs nothing

# How closely the drawn line has to follow the real one.  A Strip pavement needs a
# few metres or the line cuts the corner of the building; the 430 km coach to LA does
# not, and at that zoom nobody can see 200 m.  Full detail everywhere came to 548 KB
# of geometry, which is most of a page load on hotel wifi for no visible gain.
def tolerance(km):
    return 4.0 if km < 3 else 12.0 if km < 12 else 60.0 if km < 60 else 250.0

# What Sai is actually meant to do on each leg, where the step text does not say it
# or says something misleading.  Everything else is inferred from the step.
PLANNED = {
    "d24:2": "walk",      # Wynn back north to Circus Circus
    "d25:3": "walk",      # the pier to Third Street Promenade
    "d26:0": "cab",       # 5:50 AM hotel move with bags
    "d27:0": "transit",   # monorail back from the LINQ
    "d28:0": "transit",   # Deuce back from Fremont Street
    "d30:1": "cab",       # the cab waited at Seven Magic Mountains and brings him back
    "d30:2": "transit",
    "d31:0": "cab",       # the Grand Canyon tour coach
    "d31:1": "cab",
    "d31:2": "cab",
    "d31:3": "transit",   # Halloween night on the Strip
}

# Rail legs, written out because a single line does not always serve both ends and
# guessing from the geometry would quietly pick the wrong one.
#   day:leg -> [(line id, board station, alight station), ...]
RAIL = {
    "d25:0": [("metroB", "Union Station", "Universal City/Studio City")],
    "d25:1": [("metroB", "Universal City/Studio City", "Hollywood/Highland")],
    "d25:4": [("metroE", "Downtown Santa Monica", "7th Street/Metro Center"),
              ("metroB", "7th Street/Metro Center", "Union Station")],
    "d27:0": [("mono", "Harrah's & The LINQ", "Westgate")],
    "d29:0": [("mono", "Westgate", "MGM Grand")],
    "d29:1": [("mono", "MGM Grand", "Harrah's & The LINQ")],
    "d29:2": [("mono", "Harrah's & The LINQ", "Westgate")],
    "d30:2": [("mono", "Harrah's & The LINQ", "Westgate")],
    "d31:3": [("mono", "Westgate", "Harrah's & The LINQ")],
}
# Average speed including station dwell, and the wait before boarding.
RAILSPEED = {"mono": 28.0, "metroB": 38.0, "metroE": 34.0}
RAILWAIT = {"mono": 5.0, "metroB": 7.0, "metroE": 9.0}
# What a ride costs him, as a label rather than a number: the pass is the real unit.
FARE = {"mono": "$13.95 · 24 h monorail pass", "metroB": "$1.75 · TAP, $5 day cap",
        "metroE": "$1.75 · TAP, $5 day cap", "bus": "$8 · 24 h Deuce/RTC pass"}

# The long haul that is not a leg between two stops: the overnight bus to LA.
EXTRA = {"d25": ("circus", "dtla", "auto")}


def metres(a, b):
    r = math.pi / 180
    dla, dlo = (b[0] - a[0]) * r, (b[1] - a[1]) * r
    h = math.sin(dla / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin(dlo / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def shapelen(coords):
    """Kilometres along a [lng, lat] polyline."""
    return sum(metres((coords[i][1], coords[i][0]), (coords[i + 1][1], coords[i + 1][0]))
               for i in range(len(coords) - 1)) / 1000


def decode(s, prec=6):
    """Valhalla returns the shape as a Google-style encoded polyline at 1e-6."""
    coords, i, lat, lng = [], 0, 0, 0
    f = 10 ** prec
    while i < len(s):
        for first in (True, False):
            shift = result = 0
            while True:
                b = ord(s[i]) - 63
                i += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            d = ~(result >> 1) if result & 1 else (result >> 1)
            if first:
                lat += d
            else:
                lng += d
        coords.append([round(lng / f, 5), round(lat / f, 5)])
    return coords


def simplify(coords, tol_m):
    """Ramer-Douglas-Peucker, in metres.  Keeps the shape of a turn and throws away
    the dozens of points Valhalla emits along a straight block."""
    if len(coords) < 3:
        return coords
    # Local flat projection is fine over a few hundred kilometres for this purpose.
    lat0 = math.radians(coords[0][1])
    sx = 111320 * math.cos(lat0)
    xy = [(c[0] * sx, c[1] * 110540) for c in coords]

    keep = [False] * len(coords)
    keep[0] = keep[-1] = True
    stack = [(0, len(coords) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay = xy[i]
        bx, by = xy[j]
        dx, dy = bx - ax, by - ay
        den = math.hypot(dx, dy) or 1e-9
        worst, wi = -1.0, None
        for k in range(i + 1, j):
            px, py = xy[k]
            d = abs(dx * (ay - py) - dy * (ax - px)) / den
            if d > worst:
                worst, wi = d, k
        if wi is not None and worst > tol_m:
            keep[wi] = True
            stack += [(i, wi), (wi, j)]
    return [c for c, k in zip(coords, keep) if k]


_cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}


def route(a, b, costing):
    """One Valhalla leg: a and b are (lat, lng)."""
    ck = f"{a[0]:.5f},{a[1]:.5f}|{b[0]:.5f},{b[1]:.5f}|{costing}"
    if ck in _cache:
        return json.loads(json.dumps(_cache[ck]))
    body = json.dumps({
        "locations": [{"lat": a[0], "lon": a[1]}, {"lat": b[0], "lon": b[1]}],
        "costing": costing,
        "directions_options": {"units": "kilometers"},
    }).encode()
    req = urllib.request.Request(VALHALLA, data=body, headers={
        "Content-Type": "application/json", "User-Agent": "vegas-trip-map/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        j = json.load(r)
    time.sleep(PAUSE)
    leg = j["trip"]["legs"][0]
    man = []
    for m in leg.get("maneuvers", []):
        t = m.get("instruction", "").strip()
        if t:
            man.append([t, round(m.get("length", 0), 2)])
    kmd = round(j["trip"]["summary"]["length"], 2)
    rec = {"geom": simplify(decode(leg["shape"]), tolerance(kmd)),
           "km": kmd,
           "min": max(1, round(j["trip"]["summary"]["time"] / 60)),
           "steps": man[:14]}
    _cache[ck] = rec
    CACHE.write_text(json.dumps(_cache, separators=(",", ":")))
    return json.loads(json.dumps(rec))


def railslice(line, frm, to):
    """The piece of a line's shape between two stations, in travel order."""
    stops = {s["n"]: s["p"] for s in line["stops"]}
    if frm not in stops or to not in stops:
        return None
    shape = line["shape"]
    near = lambda p: min(range(len(shape)),                                  # noqa: E731
                         key=lambda i: metres((shape[i][1], shape[i][0]), (p[1], p[0])))
    i, j = near(stops[frm]), near(stops[to])
    seg = shape[min(i, j):max(i, j) + 1]
    if i > j:
        seg = seg[::-1]
    return [stops[frm]] + seg + [stops[to]]


def transit_rail(plan, a, b, transit):
    """Walk to the platform, ride the real line, walk off at the other end."""
    geom, km, mins, steps = [], 0.0, 0.0, []
    here = a
    for lid, frm, to in plan:
        line = transit[lid]
        seg = railslice(line, frm, to)
        if not seg:
            return None
        board = (seg[0][1], seg[0][0])
        w = route(here, board, "pedestrian")
        geom += w["geom"]
        km += w["km"]
        mins += w["min"]
        steps.append([f"Walk to {frm}", w["km"]])
        rk = shapelen(seg)
        seg = simplify(seg, tolerance(rk))
        geom += seg
        km += rk
        mins += RAILWAIT[lid] + rk / RAILSPEED[lid] * 60
        steps.append([f"{line['name']} to {to} — {len(seg) and ''}"
                      f"{round(rk,1)} km", round(rk, 2)])
        here = (seg[-1][1], seg[-1][0])
    w = route(here, b, "pedestrian")
    geom += w["geom"]
    km += w["km"]
    mins += w["min"]
    steps.append(["Walk from the station to the stop", w["km"]])
    lines = [transit[l]["name"] for l, _, _ in plan]
    return {"geom": geom, "km": round(km, 2), "min": max(1, round(mins)), "steps": steps,
            "line": " + ".join(lines), "fare": " + ".join(FARE[l] for l, _, _ in plan),
            "stations": [[s, t] for _, s, t in plan]}


def cab_fare(km):
    """A rough Las Vegas/LA metered fare, so the choice between modes has a price
    on it.  Deliberately a range: airport fees and surge are not predictable."""
    lo = 4 + 2.1 * km
    return f"~${round(lo):d}–{round(lo * 1.45):d}"


def main():
    data = json.loads((ROOT / "src/data.json").read_text())
    transit = json.loads((ROOT / "src/transit.json").read_text())
    P = data["P"]
    pt = lambda i: (P[i]["lat"], P[i]["lng"])                                # noqa: E731
    ent = lambda i: tuple(P[i]["ent"]) if P[i].get("ent") else pt(i)         # noqa: E731

    out = {"legs": {}, "extra": {}}
    for day in data["DAYS"]:
        legs = []
        for s in day["steps"]:
            i = s[1]
            if i and i in P and (not legs or legs[-1]["id"] != i):
                legs.append({"id": i, "how": s[3] or "", "cab": bool(len(s) > 4 and s[4])})
        for k in range(len(legs) - 1):
            key = f"{day['id']}:{k}"
            a, b = legs[k]["id"], legs[k + 1]["id"]
            A, B = ent(a), ent(b)
            direct = metres(A, B) / 1000
            rec = {"from": a, "to": b, "modes": {}}

            if direct <= WALK_MAX_KM:
                w = route(A, B, "pedestrian")
                w["fare"] = "free"
                rec["modes"]["walk"] = w

            c = route(A, B, "auto")
            c["fare"] = cab_fare(c["km"])
            rec["modes"]["cab"] = c

            if key in RAIL:
                t = transit_rail(RAIL[key], A, B, transit)
                if t:
                    rec["modes"]["transit"] = t
            if "transit" not in rec["modes"]:
                t = route(A, B, "bus")
                t["line"] = "RTC bus — the Deuce on the Strip"
                t["fare"] = FARE["bus"]
                rec["modes"]["transit"] = t

            how = legs[k + 1]["how"].lower()
            if key in PLANNED:
                rec["planned"] = PLANNED[key]
            elif legs[k + 1]["cab"]:
                rec["planned"] = "cab"
            elif any(w in how for w in ("walk", "stroll", "on foot", "across the street")):
                rec["planned"] = "walk"
            elif any(w in how for w in ("deuce", "monorail", "metro", "bus", "line")):
                rec["planned"] = "transit"
            else:
                rec["planned"] = "walk" if direct < 1.1 else "transit"
            out["legs"][key] = rec
            m = rec["modes"]
            print(f"  {key:8s} {a:>13s} -> {b:<13s} plan={rec['planned']:7s} "
                  f"walk={m['walk']['km'] if 'walk' in m else '-':>6} "
                  f"transit={m['transit']['km']:>6} cab={m['cab']['km']:>6}")

    for dayid, (a, b, costing) in EXTRA.items():
        r = route(ent(a), ent(b), costing)
        out["extra"][dayid] = r
        print(f"  extra {dayid}  {a} -> {b}  {r['km']} km")

    path = ROOT / "src/routes.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    pts = sum(len(m["geom"]) for l in out["legs"].values() for m in l["modes"].values())
    print(f"\n{len(out['legs'])} legs, {pts} shape points, "
          f"{path.stat().st_size/1024:.0f} KB -> src/routes.json")


if __name__ == "__main__":
    sys.exit(main())

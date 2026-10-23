"""One-off: write verified coordinates and entrance points into src/data.json.

Every `pt` below was looked up in OpenStreetMap on Oct 22, 2026 (see `src`), which
is why src/verifycoords.py can now re-check them.  `ent` is where a route should
begin and end, which is not always where the pin belongs: the pin marks the
building, the entrance marks the door, the bus bay or the kerb the cab pulls into.
On the Strip those differ by a couple of hundred metres and a pedestrian bridge.

Entrances not listed here are filled in by snapping the place to the walking
network (Valhalla /locate), and only kept when the snap is more than ENT_MIN
metres away — otherwise the pin is already on a footway and a second point would
just be noise.

  python3 src/fixcoords.py           # rewrites src/data.json in place
"""
import json, math, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENT_MIN = 25.0
VALHALLA = "https://valhalla1.openstreetmap.de/locate"

# id: (lat, lng, src, geocoder query when the place's own `q` does not find it)
VERIFIED = {
    "airport":       (36.08548, -115.14982, "osm:node/14305154724", "Terminal 1 Harry Reid International Airport"),
    "circus":        (36.13772, -115.16584, "osm:way/135332959", None),
    "fontainebleau": (36.13742, -115.15923, "osm:way/134068317", None),
    "westgate":      (36.13586, -115.15269, "osm:node/13056321361", None),
    "sphere":        (36.12121, -115.16207, "osm:way/976405284", None),
    "highroller":    (36.11760, -115.16816, "osm:way/402543930", None),
    "bellagio":      (36.11279, -115.17413, "osm:way/22971030", None),
    "paris":         (36.11245, -115.17217, "osm:way/27831699", "Eiffel Tower Las Vegas"),
    "caesars":       (36.11892, -115.17646, "osm:way/34068416", None),
    "venetian":      (36.12143, -115.16903, "osm:node/12400346774", None),
    "wynn":          (36.12662, -115.16540, "osm:way/205501268", None),
    "south":         (36.10214, -115.17449, "osm:way/115661793", None),
    "welcome":       (36.08206, -115.17277, "osm:node/1485974042", None),
    "fremont":       (36.17048, -115.14353, "osm:way/206147646", None),
    "strat":         (36.14741, -115.15552, "osm:way/135457469", "Stratosphere Tower Las Vegas"),
    "sevenmm":       (35.83831, -115.27095, "osm:node/4489080290", None),
    "hoover":        (36.01572, -114.73749, "osm:way/49938932", None),
    "gcwest":        (36.01203, -113.81105, "osm:way/170214302", "Skywalk"),
    "dtla":          (34.05606, -118.23590, "osm:relation/1483140", None),
    "universal":     (34.13923, -118.35438, "osm:way/1304528747", None),
    "hollywood":     (34.10255, -118.34026, "osm:way/151485232", None),
    "sign":          (34.13410, -118.32165, "osm:node/3204926589", None),
    "griffith":      (34.11822, -118.30029, "osm:way/422130705", None),
    "pier":          (34.00890, -118.49740, "osm:way/22728853", None),
    "promenade":     (34.01633, -118.49690, "osm:way/723093577", None),
    "venice":        (33.98671, -118.47410, "osm:way/285608129", None),
    # lvcity / lacity are deliberately city-wide aggregate pins, not stops.
}

# Entrances that are a decision, not a snap: where you are actually picked up or
# where the gate is, rather than the nearest piece of pavement.
ENTRANCES = {
    "airport":   ([36.08537, -115.14804], "Terminal 1, zero level — taxi and rideshare pickup"),
    "dtla":      ([34.05560, -118.23355], "Patsaouras Transit Plaza bus bays, east side of Union Station"),
    "universal": ([34.13810, -118.35340], "Main entrance plaza at the top of the escalators"),
    "hollywood": ([34.10171, -118.33925], "Hollywood/Highland Metro entrance on Hollywood Blvd"),
    "gcwest":    ([36.01093, -113.81173], "Eagle Point — where the tour shuttle drops you for the Skywalk"),
    "sevenmm":   ([35.83847, -115.27030], "Dirt pull-off on Jean Dry Lake Rd; the cab waits here"),
}


def metres(a, b):
    r = math.pi / 180
    dla, dlo = (b[0] - a[0]) * r, (b[1] - a[1]) * r
    h = math.sin(dla / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin(dlo / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def snap(points):
    """Nearest point on the walking network for each place — where a walk really
    starts, as opposed to the middle of a casino floor."""
    body = json.dumps({"locations": [{"lat": p[0], "lon": p[1]} for p in points],
                       "costing": "pedestrian", "verbose": False}).encode()
    req = urllib.request.Request(VALHALLA, data=body, headers={
        "Content-Type": "application/json", "User-Agent": "vegas-trip-map/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.load(r)
    res = []
    for o in out:
        e = (o.get("edges") or [{}])[0]
        lat, lon = e.get("correlated_lat"), e.get("correlated_lon")
        res.append([round(lat, 5), round(lon, 5)] if lat else None)
    return res


def main():
    path = ROOT / "src/data.json"
    data = json.loads(path.read_text())
    P = data["P"]

    moved = 0
    for pid, (lat, lng, src, gq) in VERIFIED.items():
        p = P[pid]
        d = metres((p["lat"], p["lng"]), (lat, lng))
        if d >= 1:
            moved += 1
            print(f"  moved {pid:14s} {d:6.0f} m  -> {lat:.5f},{lng:.5f}")
        p["lat"], p["lng"], p["src"] = lat, lng, src
        if gq:
            p["gq"] = gq

    ids = list(P)
    snapped = snap([(P[i]["lat"], P[i]["lng"]) for i in ids])
    for pid, s in zip(ids, snapped):
        p = P[pid]
        if pid in ENTRANCES:
            pt, why = ENTRANCES[pid]
            p["ent"], p["entwhy"] = pt, why
            print(f"  ent   {pid:14s} {metres((p['lat'],p['lng']),pt):6.0f} m  {why}")
            continue
        p.pop("ent", None), p.pop("entwhy", None)
        if not s:
            continue
        d = metres((p["lat"], p["lng"]), s)
        if d > ENT_MIN:
            p["ent"] = [s[0], s[1]]
            p["entwhy"] = "Nearest point on the walking network"
            print(f"  snap  {pid:14s} {d:6.0f} m  -> {s[0]:.5f},{s[1]:.5f}")

    path.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    ents = sum(1 for p in P.values() if p.get("ent"))
    print(f"\n{moved} place(s) moved, {ents} entrance point(s), {len(P)} places.")


if __name__ == "__main__":
    main()

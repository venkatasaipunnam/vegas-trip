"""Fetch the shape and stations of the four transit lines Sai actually rides.

A transit leg drawn as a car route is simply wrong: the monorail runs behind the
casinos, the Metro B Line is in a tunnel under Cahuenga, and neither follows the
driving route.  So the real line geometry comes from OpenStreetMap once, here, and
is committed to src/transit.json; the page clips each line between the two stations
a leg uses.  Re-run only when a line changes.

  python3 src/mktransit.py
"""
import json, math, pathlib, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OVERPASS = "https://overpass-api.de/api/interpreter"
# One direction of each line is enough; a leg is clipped between two stations and
# drawn either way round.
LINES = {
    "mono": {"rel": 5936155, "name": "Las Vegas Monorail", "col": "#ff4fa3"},
    "metroB": {"rel": 7935321, "name": "Metro B Line", "col": "#d8232a"},
    "metroE": {"rel": 6584633, "name": "Metro E Line", "col": "#3fe0e8"},
}


def fetch(rel):
    # The relation is printed with its members' geometry, then every member node
    # again on its own so we get station names (members carry roles, not tags).
    q = (f"[out:json][timeout:180];rel({rel})->.r;.r out geom;"
         f"node(r.r);out tags center;")
    req = urllib.request.Request(OVERPASS, data=urllib.parse.urlencode({"data": q}).encode(),
                                 headers={"User-Agent": "vegas-trip-map/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def chain(ways):
    """Stitch the relation's ways into one ordered polyline.  OSM gives them in
    route order but individual ways can be reversed, so each is flipped to meet
    the end of the line so far."""
    out = []
    for w in ways:
        pts = [[round(p["lon"], 5), round(p["lat"], 5)] for p in w.get("geometry") or []]
        if len(pts) < 2:
            continue
        if not out:
            out = pts
            continue
        d = lambda a, b: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2            # noqa: E731
        if d(out[-1], pts[0]) > d(out[-1], pts[-1]):
            pts.reverse()
        out += pts[1:] if d(out[-1], pts[0]) < 1e-8 else pts
    return out


def main():
    data = {}
    for lid, spec in LINES.items():
        d = fetch(spec["rel"])
        names = {e["id"]: (e.get("tags") or {}).get("name") for e in d["elements"]
                 if e["type"] == "node"}
        rel = next(e for e in d["elements"] if e["type"] == "relation")
        ways, stops = [], []
        for m in rel["members"]:
            role = m.get("role") or ""
            if m["type"] == "way" and not role:
                ways.append(m)
            elif m["type"] == "node" and (role.startswith("stop") or role.startswith("platform")):
                nm, lat, lon = names.get(m["ref"]), m.get("lat"), m.get("lon")
                if nm and lat and lon and not any(s["n"] == nm for s in stops):
                    stops.append({"n": nm, "p": [round(lon, 5), round(lat, 5)]})
        shape = chain(ways)
        data[lid] = {"name": spec["name"], "col": spec["col"], "shape": shape, "stops": stops}
        print(f"{lid:8s} {len(shape):5d} points  {len(stops):3d} stations  {spec['name']}")
        for s in stops:
            print(f"           {s['n']}  {s['p']}")
    (ROOT / "src/transit.json").write_text(json.dumps(data, separators=(",", ":")))
    print("wrote src/transit.json",
          f"{(ROOT/'src/transit.json').stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()

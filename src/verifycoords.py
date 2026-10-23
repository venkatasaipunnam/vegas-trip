"""Check every place in src/data.json against the OpenStreetMap geocoder.

A pin that is 200 m out puts Sai on the wrong side of a casino, and on the Strip
that is a 10-minute detour through a building.  So the coordinates are not trusted
because someone typed them once: this re-geocodes each place and prints anything
that has drifted, which is what keeps a hand-edit to data.json honest.

  python3 src/verifycoords.py           # report drift over TOL metres
  python3 src/verifycoords.py --all     # report every place

Nominatim's usage policy: one request a second, a real user agent, no bulk live
use.  This is a build-time tool run by hand, never from the page.
"""
import json, math, pathlib, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOL = 75.0          # metres of drift we accept without complaining
UA = "vegas-trip-map/1.0 (venkatasai1478@gmail.com)"
# Aggregate city pins are deliberately a whole city wide; they are not real stops.
LOOSE = {"lvcity", "lacity"}


def metres(a, b):
    r = math.pi / 180
    dla, dlo = (b[0] - a[0]) * r, (b[1] - a[1]) * r
    h = math.sin(dla / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin(dlo / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def geocode(q, near, span=0.08):
    """Search Nominatim, boxed around the stored point so a same-named place
    in another state cannot win (searching 'High Roller' unboxed returns a
    hairdresser 11 km away)."""
    lat, lng = near
    vb = f"{lng-span},{lat+span},{lng+span},{lat-span}"
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"format": "json", "limit": "1", "q": q, "viewbox": vb, "bounded": "1"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.load(r)
    if not out:
        return None
    o = out[0]
    return (float(o["lat"]), float(o["lon"]), f'osm:{o["osm_type"]}/{o["osm_id"]}', o.get("display_name", ""))


def main():
    show_all = "--all" in sys.argv
    data = json.loads((ROOT / "src/data.json").read_text())
    bad = 0
    for pid, p in data["P"].items():
        stored = (p["lat"], p["lng"])
        q = p.get("gq") or p.get("q") or p["n"]
        try:
            hit = geocode(q, stored)
        except Exception as e:                                   # noqa: BLE001
            print(f"  ?? {pid:14s} geocoder failed: {e}")
            continue
        finally:
            time.sleep(1.1)
        if not hit:
            print(f"  ?? {pid:14s} no match for {q!r}")
            continue
        lat, lng, osm, name = hit
        d = metres(stored, (lat, lng))
        loose = pid in LOOSE
        off = d > TOL and not loose
        if off:
            bad += 1
        if off or show_all:
            flag = "OFF" if off else "ok "
            print(f"  {flag} {pid:14s} {d:7.0f} m   stored {stored[0]:.5f},{stored[1]:.5f}"
                  f"   osm {lat:.5f},{lng:.5f}  {osm}")
            if off:
                print(f"      {name[:96]}")
        src = p.get("src", "")
        if src and src != osm and not loose:
            print(f"  !! {pid:14s} src says {src}, geocoder now says {osm}")
    print(f"\n{bad} place(s) more than {TOL:.0f} m from the geocoder"
          f" out of {len(data['P'])}.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

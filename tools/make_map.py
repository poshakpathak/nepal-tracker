"""Turn the 77-district GeoJSON into small SVG paths for the site's map.

Source: github.com/mesaugat/geoJSON-Nepal (MIT), nepal-districts-new.geojson.
Run once: python tools/make_map.py path/to/nepal-districts-new.geojson
Writes site/districts.json.
"""
import json
import math
import sys
from pathlib import Path

W = 1000  # svg width
LAT0 = math.radians(28.3)
TOL = 0.9  # simplification tolerance in svg units


def dp(points, tol):
    """Douglas-Peucker line simplification."""
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    idx, dmax = 0, -1.0
    for i in range(1, len(points) - 1):
        x, y = points[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            idx, dmax = i, d
    if dmax <= tol:
        return [points[0], points[-1]]
    return dp(points[: idx + 1], tol)[:-1] + dp(points[idx:], tol)


def main(src):
    gj = json.loads(Path(src).read_text())
    feats = gj["features"]
    xs, ys = [], []

    def rings(geom):
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            for ring in poly:
                yield ring

    for f in feats:
        for ring in rings(f["geometry"]):
            for lon, lat in ring:
                xs.append(lon * math.cos(LAT0))
                ys.append(-lat)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    scale = W / (x1 - x0)
    H = round((y1 - y0) * scale)
    out = []
    for f in feats:
        parts = []
        for ring in rings(f["geometry"]):
            pts = [((lon * math.cos(LAT0) - x0) * scale, (-lat - y0) * scale) for lon, lat in ring]
            # closed ring: split at the point farthest from the start so the
            # two halves have distinct endpoints
            far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
            pts = dp(pts[: far + 1], TOL)[:-1] + dp(pts[far:], TOL)
            if len(pts) < 3:
                continue
            parts.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
        p = f["properties"]
        out.append({"name": p["DIST_EN"], "province": int(p["ADM1_EN"]), "d": "".join(parts)})
    Path("site/districts.json").write_text(json.dumps({"w": W, "h": H, "districts": out}, separators=(",", ":")))
    print(f"{len(out)} districts, {Path('site/districts.json').stat().st_size // 1024} KB, {W}x{H}")


if __name__ == "__main__":
    main(sys.argv[1])

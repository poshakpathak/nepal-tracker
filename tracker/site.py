"""Build the static website into dist/.

Copies site/ and writes compact data files for the browser under dist/d/.
Run with: python -m tracker.site
"""
import json
import shutil
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def read(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return default


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def short_att(a):
    return {"pct": a.get("percent"), "n": a.get("total"), "in": a.get("present"), "out": a.get("absent")} if a else None


def build(out=ROOT / "dist"):
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "site", out)
    d = out / "d"
    meta = read(DATA / "meta.json", {})
    members = read(DATA / "members.json", [])
    bills = read(DATA / "bills.json", [])
    meetings = read(DATA / "meetings.json", [])

    rows = []
    sittings = {}  # plenary sitting id -> {date, title, chamber, in, out}
    for m in members:
        full = read(DATA / "members" / f"{m['slug']}.json", {})
        rows.append({
            "id": m["slug"], "name": m["name"], "ne": m.get("name_ne"), "ch": m.get("chamber"),
            "party": m.get("party"), "seat": m.get("seat"), "el": m.get("election"), "g": m.get("gender"),
            "role": m.get("role"), "photo": m.get("photo"),
            "house": short_att(m["attendance"].get("house")),
            "cmte": short_att(m["attendance"].get("committee")),
            "cm": [c["name"] for c in m.get("committees", [])],
            "st": m.get("statements", 0),
        })
        for r in full.get("meetings", []):
            if r["scope"] != "house":
                continue
            s = sittings.setdefault(r["meeting"], {"id": r["meeting"], "date": r["date"], "title": r["title"],
                                                   "ch": m.get("chamber"), "in": 0, "out": 0, "part": 0})
            if r["status"] == "present":
                s["in"] += 1
            elif r["status"] == "absent":
                s["out"] += 1
            elif r["status"] == "partial":
                s["part"] += 1
        # The member file the browser loads: profile plus compact attendance rows.
        write(d / "m" / f"{m['slug']}.json", {
            **rows[-1], "edu": full.get("education"), "bio": full.get("bio"), "terms": full.get("terms"),
            "start": full.get("term_start"),
            "att": [[r["meeting"], r["date"], r["status"][:1] if r["status"] else "", r["scope"][0], r["title"]]
                    for r in full.get("meetings", [])],
            "statements": full.get("statements", []),
        })
    write(d / "members.json", rows)

    # Party summaries per chamber (house sittings only).
    parties = defaultdict(lambda: {"members": 0, "in": 0, "n": 0, "cin": 0, "cn": 0, "women": 0})
    for r in rows:
        p = parties[(r["ch"], r["party"])]
        p["members"] += 1
        p["women"] += r["g"] == "female"
        if r["house"]:
            p["in"] += r["house"]["in"] or 0
            p["n"] += r["house"]["n"] or 0
        if r["cmte"]:
            p["cin"] += r["cmte"]["in"] or 0
            p["cn"] += r["cmte"]["n"] or 0
    write(d / "parties.json", [{"ch": ch, "party": party, **v} for (ch, party), v in parties.items()])
    write(d / "sittings.json", sorted(sittings.values(), key=lambda s: (s["date"], s["title"]), reverse=True))

    write(d / "bills.json", bills)
    for b in bills:
        src = DATA / "bills" / f"{b['id']}.json"
        if src.exists():
            write(d / "b" / f"{b['id']}.json", read(src))
    write(d / "meetings.json", meetings)
    for mt in meetings:
        src = DATA / "meetings" / f"{mt['id']}.json"
        if src.exists():
            write(d / "g" / f"{mt['id']}.json", read(src))
    write(d / "meta.json", meta)
    print(f"site: {len(rows)} members, {len(sittings)} sittings, {len(bills)} bills, {len(meetings)} meetings -> {out}")


if __name__ == "__main__":
    build()

"""Build the static website into dist/.

Copies site/ and writes compact data files for the browser under dist/d/.
Run with: python -m tracker.site
"""
import datetime as dt
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


def streaks(rows):
    """Current and longest run of missed sittings, oldest to newest."""
    rows = sorted(rows, key=lambda r: (r["date"], r["meeting"]))
    longest = run = 0
    longest_from = run_from = None
    for r in rows:
        if r["status"] == "absent":
            if run == 0:
                run_from = r["date"]
            run += 1
            if run > longest:
                longest, longest_from = run, run_from
        else:
            run = 0
    return {"streak": run, "streak_from": run_from if run else None, "longest": longest, "longest_from": longest_from}


def monthly(rows):
    """[month, sittings, present-equivalent] per calendar month."""
    out = defaultdict(lambda: [0, 0.0])
    for r in rows:
        m = out[r["date"][:7]]
        m[0] += 1
        m[1] += 1 if r["status"] == "present" else 0.5 if r["status"] == "partial" else 0
    return [[k, v[0], v[1]] for k, v in sorted(out.items())]


def week_start(iso):
    """Weeks run Sunday to Saturday, as in Nepal."""
    d = dt.date.fromisoformat(iso)
    return (d - dt.timedelta(days=(d.weekday() + 1) % 7)).isoformat()


def digests(rows, sittings, bills, meetings, bill_steps):
    """One record per week that had any parliamentary activity."""
    weeks = defaultdict(lambda: {"sittings": [], "committee": [], "steps": []})
    for s in sittings.values():
        weeks[week_start(s["date"])]["sittings"].append(s["id"])
    for m in meetings:
        if m.get("date") and "Committee" in (m.get("body") or ""):
            weeks[week_start(m["date"])]["committee"].append(m["id"])
    for bid, steps in bill_steps.items():
        for st in steps:
            if st.get("date") and st.get("state") in ("completed", "current"):
                weeks[week_start(st["date"])]["steps"].append([bid, st["step"], st["date"]])
    out = []
    today = dt.date.today().isoformat()
    for wk, w in sorted(weeks.items(), reverse=True):
        if wk > today:
            continue
        sit = [sittings[i] for i in w["sittings"]]
        missed_all = []
        if sit:
            ids = set(w["sittings"])
            for r in rows:
                mine = [a for a in r["_att"] if a["meeting"] in ids]
                if mine and all(a["status"] == "absent" for a in mine):
                    missed_all.append(r["id"])
        tot = sum(s["in"] + s["out"] + s["part"] for s in sit)
        out.append({
            "week": wk,
            "sittings": [{"id": s["id"], "date": s["date"], "title": s["title"], "ch": s["ch"], "in": s["in"], "n": s["in"] + s["out"] + s["part"]} for s in sorted(sit, key=lambda s: s["date"])],
            "turnout": round(100 * sum(s["in"] + s["part"] / 2 for s in sit) / tot) if tot else None,
            "committee": len(w["committee"]),
            "steps": sorted(w["steps"], key=lambda x: x[2]),
            "missed_all": missed_all,
        })
    return out


def feed(weeks, site_url="https://nepaltracker.poshakpathak.com/"):
    from xml.sax.saxutils import escape
    items = []
    for w in weeks[:20]:
        desc = f"{len(w['sittings'])} sittings, {w['committee']} committee meetings, {len(w['steps'])} bill steps."
        if w["turnout"] is not None:
            desc += f" Average turnout {w['turnout']}%. {len(w['missed_all'])} MPs missed every sitting."
        items.append(f"<item><title>Week of {w['week']}</title><link>{site_url}#/week/{w['week']}</link>"
                     f"<guid>{site_url}#/week/{w['week']}</guid><description>{escape(desc)}</description></item>")
    return ('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nepal Parliament Tracker: the week</title>'
            f"<link>{site_url}</link><description>What Nepal's Federal Parliament did each week.</description>{''.join(items)}</channel></rss>")


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
            "party": m.get("party") or "No party", "seat": m.get("seat"), "el": m.get("election"), "g": m.get("gender"),
            "role": m.get("role"), "office": m.get("office"), "photo": m.get("photo"),
            "house": short_att(m["attendance"].get("house")),
            "cmte": short_att(m["attendance"].get("committee")),
            "cm": [c["name"] for c in m.get("committees", [])],
            "st": m.get("statements", 0),
            "_att": [r for r in full.get("meetings", []) if r["scope"] == "house"],
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
        house_rows = [r for r in full.get("meetings", []) if r["scope"] == "house" and r["status"] in ("present", "absent", "partial")]
        rows[-1].update(streaks(house_rows))
        # The member file the browser loads: profile plus compact attendance rows.
        write(d / "m" / f"{m['slug']}.json", {
            **{k: v for k, v in rows[-1].items() if k != "_att"}, "edu": full.get("education"), "bio": full.get("bio"), "terms": full.get("terms"),
            "start": full.get("term_start"),
            "att": [[r["meeting"], r["date"], r["status"][:1] if r["status"] else "", r["scope"][0], r["title"]]
                    for r in full.get("meetings", [])],
            "statements": full.get("statements", []),
            "months": monthly(house_rows),
        })
    bill_steps = {b["id"]: (read(DATA / "bills" / f"{b['id']}.json", {}) or {}).get("steps", []) for b in bills}
    weeks = digests(rows, sittings, bills, meetings, bill_steps)
    for r in rows:
        r.pop("_att", None)
    write(d / "members.json", rows)
    write(d / "weeks.json", weeks)
    (out / "feed.xml").write_text(feed(weeks), encoding="utf-8")

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

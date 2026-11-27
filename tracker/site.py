"""Build the static website into dist/.

Copies site/ and writes compact data files for the browser under dist/d/.
Run with: python -m tracker.site
"""
import datetime as dt
import json
import re
import shutil
from collections import defaultdict
from pathlib import Path

from . import election
from .topics import LABELS, LABELS_NE, tag
from .translate import DEV, english

# Statement "kinds" that name a slot in the order of business, not a subject.
GENERIC_KINDS = {"Emergency Time", "Special Hour", "Others", "Other", "Zero Hour", "Bill Discussion", "अन्य"}


# The Commission's spellings of party names the portal writes differently, plus
# the larger parties that won no seats.
EC_PARTIES = {
    "स्वतन्त्र": "Independent",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": "Communist Party of Nepal (UML)",
    "जनता समाजवादी पार्टी, नेपाल": "Janata Samajwadi Party Nepal",
    "नेपाल कम्युनिस्ट पार्टी (माओवादी)": "Communist Party of Nepal (Maoist)",
    "नेपाल मजदुर किसान पार्टी": "Nepal Majdur Kisan Party",
    "मंगोल नेशनल अर्गनाइजेसन": "Mongol National Organisation",
    "उज्यालो नेपाल पार्टी": "Ujyaalo Nepal Party",
    "आम जनता पार्टी(एकल चुनाव चिन्ह)": "Aam Janata Party",
    "प्रगतिशील लोकतान्त्रिक पार्टी": "Pragatishil Loktantrik Party",
    "राष्ट्रिय जनमोर्चा": "Rastriya Janamorcha",
}

QUALIFICATIONS = {"स्नातक": "Bachelor's", "स्\u200dनातक": "Bachelor's", "स्नातकोत्तर": "Master's", "स्नाकोत्तर": "Master's", "एम.ए.": "Master's (MA)",
                  "+2": "Higher secondary (+2)", "प्रमाणपत्र तह": "Higher secondary (+2)", "एस.एल.सी.": "SLC", "विद्यावारिधी": "PhD", "विद्यावारिधि": "PhD", "बिध्यावारिधी": "PhD"}


def race_summary(r, party_en, tr):
    """What the member page shows about how a member won their seat."""
    cands = r["candidates"]
    win = next(c for c in cands if c["elected"])
    second = next((c for c in cands if not c["elected"]), None)
    lead = win["votes"] - (second["votes"] if second else 0)
    q = win.get("qualification")
    return {
        "total": r["total"], "votes": win["votes"], "n": len(cands),
        "share": round(100 * win["votes"] / r["total"], 1) if r["total"] else None,
        "margin": lead, "margin_pct": round(100 * lead / r["total"], 1) if r["total"] else None,
        "field": [[c["name_ne"], party_en.get(c["party_ne"]) or english(c["party_ne"], tr) or c["party_ne"], c["votes"], c["elected"], c["party_ne"]]
                  for c in cands[:6]],
        "age": win.get("age"), "born_bs": win.get("born_bs"),
        "qualification": QUALIFICATIONS.get(q, english(q, tr) or q) if q else None, "qualification_ne": q, "institution": win.get("institution"),
        "experience": win.get("experience"), "experience_en": english(win.get("experience"), tr),
    }


def statement(st, tr):
    """A floor statement with English versions and topics attached."""
    kind_en = english(st.get("kind"), tr)
    out = {**st, "text_en": english(st.get("text"), tr), "kind_en": kind_en}
    subj = None if st.get("kind") in GENERIC_KINDS else st.get("kind")
    subj_en = kind_en or (subj if subj and not DEV.search(subj) else None)
    out["topics"] = tag([subj_en, out["text_en"] or (st.get("text") if st.get("text") and not DEV.search(st["text"]) else None)],
                        [subj, st.get("text")])
    return out

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


# Portal spellings that differ from the map's district names.
DISTRICT_FIX = {
    "Aachham": "Achham", "Chitwan": "Chitawan", "Dhanakuta": "Dhankuta", "Kapilvastu": "Kapilbastu",
    "Kavrepalanchok": "Kabhrepalanchok", "Makwanpur": "Makawanpur", "Tanahun": "Tanahu", "Tehrathum": "Terhathum",
    "Nawalparasi (Bardaghat Susta Paschim)": "Nawalparasi West", "Nawalparasi (Bardaghat Susta Purva)": "Nawalparasi East",
}
PROVINCES = {"Koshi": 1, "Madhesh": 2, "Bagmati": 3, "Gandaki": 4, "Lumbini": 5, "Karnali": 6, "Sudurpaschim": 7}


PROVINCES_NE = {1: "कोशी प्रदेश", 2: "मधेश प्रदेश", 3: "बागमती प्रदेश", 4: "गण्डकी प्रदेश", 5: "लुम्बिनी प्रदेश", 6: "कर्णाली प्रदेश", 7: "सुदूरपश्चिम प्रदेश"}


def seat_ne(m, dist_ne):
    """The seat in Nepali: "दोलखा-1", a proportional member's home district, or a province."""
    seat = (m.get("seat") or "").strip()
    prov = re.match(r"(\w+) Province$", seat)
    if prov:
        return PROVINCES_NE.get(PROVINCES.get(prov.group(1)))
    hit = re.match(r"(.+)-(\d+)$", seat)
    if m.get("election") == "direct" and hit:
        return f"{dist_ne[hit.group(1)]}-{hit.group(2)}" if hit.group(1) in dist_ne else None
    home = (m.get("district") or seat).strip()
    return dist_ne.get(home)


def place(m):
    """(district, province number) a member represents or comes from.

    Directly elected members: the district of their constituency ("Dolakha-1").
    Proportional members: the home district the portal lists.
    National Assembly members: their province only.
    """
    seat = (m.get("seat") or "").strip()
    prov = re.match(r"(\w+) Province$", seat)
    if prov:
        return None, PROVINCES.get(prov.group(1))
    raw = re.sub(r"-\d+$", "", seat) if m.get("election") == "direct" else (m.get("district") or seat)
    raw = raw.strip()
    return (DISTRICT_FIX.get(raw, raw) or None), None


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
    tr = read(DATA / "translations.json", {})  # Nepali sentence -> machine English
    members = [m for m in members if m.get("chamber")]  # drop stray listing pages
    talk = defaultdict(lambda: defaultdict(int))  # topic -> member -> statements
    # 2082 election results, matched to directly elected members.
    party_en = {m.get("party_ne"): m.get("party") for m in members if m.get("party_ne") and m.get("party")}
    party_en.update(EC_PARTIES)
    matched, dist_ne = election.match(members, read(DATA / "election.json", []))
    races = {k: race_summary(v, party_en, tr) for k, v in matched.items()}
    for m in members:
        full = read(DATA / "members" / f"{m['slug']}.json", {})
        rows.append({
            "id": m["slug"], "name": m["name"], "ne": election.clean_name_ne(m.get("name_ne")), "ch": m.get("chamber"),
            "party": m.get("party") or "No party", "seat": m.get("seat"), "el": m.get("election"), "g": m.get("gender"),
            "role": m.get("role"), "office": m.get("office"), "photo": m.get("photo"),
            "dist": place(m)[0], "prov": place(m)[1],
            "pne": m.get("party_ne"), "seat_ne": seat_ne(m, dist_ne),
            "won": {k: races[m["slug"]][k] for k in ("share", "margin", "margin_pct")} if m["slug"] in races else None,
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
        stmts = [statement(st, tr) for st in full.get("statements", [])]
        mine = defaultdict(int)
        for st in stmts:
            for t in st["topics"]:
                mine[t] += 1
                talk[t][m["slug"]] += 1
        house_rows = [r for r in full.get("meetings", []) if r["scope"] == "house" and r["status"] in ("present", "absent", "partial")]
        rows[-1].update(streaks(house_rows))
        # The member file the browser loads: profile plus compact attendance rows.
        write(d / "m" / f"{m['slug']}.json", {
            **{k: v for k, v in rows[-1].items() if k != "_att"}, "edu": full.get("education"), "bio": full.get("bio"), "terms": full.get("terms"),
            "start": full.get("term_start"),
            "att": [[r["meeting"], r["date"], r["status"][:1] if r["status"] else "", r["scope"][0], r["title"]]
                    for r in full.get("meetings", [])],
            "statements": stmts,
            "race": races.get(m["slug"]),
            "topics": sorted(mine.items(), key=lambda kv: -kv[1]),
            "bio_en": {k: english(v, tr) for k, v in (full.get("bio") or {}).items() if isinstance(v, str) and english(v, tr)},
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

    # Bills without an English title get a machine-translated one, flagged as such.
    for b in bills:
        if not b.get("title") and english(b.get("title_ne"), tr):
            b["title_mt"] = english(b["title_ne"], tr)
        b["topics"] = tag(b.get("title") or b.get("title_mt"), b.get("title_ne"))
    write(d / "bills.json", bills)
    for b in bills:
        src = DATA / "bills" / f"{b['id']}.json"
        if src.exists():
            write(d / "b" / f"{b['id']}.json", {**read(src), "title_mt": b.get("title_mt")})
    for mt in meetings:
        mt["agenda_en"] = english(mt.get("agenda"), tr)
        ag = mt.get("agenda") or ""
        mt["topics"] = tag(mt["agenda_en"] or (ag if ag and not DEV.search(ag) else None), ag)
    # Topic index: what each topic covers and who speaks on it most.
    topics = []
    for slug, label in LABELS.items():
        tb = [b["id"] for b in bills if slug in b["topics"]]
        tm = sorted((m for m in meetings if slug in m["topics"]), key=lambda m: m.get("date") or "", reverse=True)
        speakers = sorted(talk[slug].items(), key=lambda kv: -kv[1])
        topics.append({"id": slug, "label": label, "ne": LABELS_NE[slug], "bills": tb, "meetings": len(tm), "recent": [m["id"] for m in tm[:25]],
                       "statements": sum(talk[slug].values()), "speakers": speakers[:15], "speakers_n": len(speakers)})
    write(d / "topics.json", topics)
    write(d / "places.json", {DISTRICT_FIX.get(k, k): v for k, v in dist_ne.items()})
    write(d / "meetings.json", meetings)
    for mt in meetings:
        src = DATA / "meetings" / f"{mt['id']}.json"
        if src.exists():
            g = read(src)
            write(d / "g" / f"{mt['id']}.json", {**g, "agenda_en": english(g.get("agenda"), tr), "minutes_en": english(g.get("minutes"), tr), "topics": mt["topics"]})
    write(d / "meta.json", meta)
    print(f"site: {len(rows)} members, {len(sittings)} sittings, {len(bills)} bills, {len(meetings)} meetings -> {out}")


if __name__ == "__main__":
    build()

"""Fetch the portal and rebuild data/.

python -m tracker.update            # full refresh (members, bills, new meetings)
python -m tracker.update --limit 5  # quick smoke run
"""
import argparse
import datetime as dt
import json
import pathlib
import sys

from . import parse
from .portal import Portal

DATA = pathlib.Path("data")
TERM = "2082"  # House of Representatives elected 2082 BS (March 2026)


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def read(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return default


def run(limit=None, refetch_meetings=False):
    en = Portal(locale="en")
    ne = Portal(locale="ne")
    log = lambda *a: print(*a, flush=True)  # noqa: E731

    urls = parse.sitemap_urls(en.get("/sitemap.xml"))
    log(f"sitemap: {len(urls['members'])} members, {len(urls['meetings'])} meetings")

    # ---- members
    cards = {c["slug"]: c for c in parse.member_list(en.get("/members"))}
    cards_ne = {c["slug"]: c for c in parse.member_list(ne.get("/members"))}
    slugs = sorted(set(urls["members"]) | set(cards))
    if limit:
        slugs = slugs[:limit]
    index, failures = [], []
    for i, slug in enumerate(slugs, 1):
        html = en.get(f"/members/{slug}")
        if not html:
            failures.append(slug)
            continue
        page = parse.member_page(html)
        card = cards.get(slug, {})
        nec = cards_ne.get(slug, {})
        rec = {
            "slug": slug,
            "name": card.get("name") or page["name"],
            "name_ne": page.get("name_ne") or nec.get("name"),
            "chamber": card.get("chamber"),
            "party": card.get("party"),
            "party_ne": nec.get("party"),
            "party_id": card.get("party_id"),
            "seat": page.get("seat") or card.get("place"),
            "district": card.get("district"),
            "election": card.get("election"),
            "gender": card.get("gender"),
            "role": card.get("role"),
            "education": page.get("education"),
            "photo": page.get("photo") or card.get("photo"),
            "term_start": page.get("term_start"),
            "committees": page["committees"],
            "attendance": page["attendance"],
            "statements": len(page["statements"]),
            "listed": slug in cards,
        }
        index.append(rec)
        write(DATA / "members" / f"{slug}.json", {**rec, "bio": page["bio"], "terms": page["terms"],
                                                 "meetings": page["meetings"], "statements": page["statements"]})
        if i % 25 == 0:
            log(f"  members {i}/{len(slugs)}")
    write(DATA / "members.json", index)
    log(f"members: {len(index)} written, {len(failures)} failed {failures[:5]}")

    # ---- bills
    bill_ids = parse.bill_list(en.get("/bills"))
    if limit:
        bill_ids = bill_ids[:limit]
    bills = []
    for bid in bill_ids:
        html = en.get(f"/bills/{bid}")
        if not html:
            continue
        b = parse.bill_page(html, bid)
        write(DATA / "bills" / f"{bid}.json", b)
        bills.append({k: v for k, v in b.items() if k not in ("summary", "steps")} |
                     {"steps_done": sum(s["state"] == "completed" for s in b["steps"]), "steps_total": len(b["steps"])})
    bills.sort(key=lambda b: (b["registered"] or "", b["number"] or 0), reverse=True)
    write(DATA / "bills.json", bills)
    log(f"bills: {len(bills)}")

    # ---- meetings: concluded meetings don't change, so only fetch new or unfinished ones
    known = {m["id"]: m for m in read(DATA / "meetings.json", [])}
    todo = [m for m in urls["meetings"]
            if refetch_meetings or m not in known or known[m].get("state") != "concluded"]
    if limit:
        todo = todo[:limit]
    for j, mid in enumerate(todo, 1):
        html = en.get(f"/baithak-detail/{mid}")
        if not html:
            continue
        m = parse.meeting_page(html, mid)
        write(DATA / "meetings" / f"{mid}.json", m)
        known[mid] = {k: v for k, v in m.items() if k != "attendance"}
        if j % 50 == 0:
            log(f"  meetings {j}/{len(todo)}")
    meetings = sorted(known.values(), key=lambda m: (m.get("date") or "", m.get("start") or ""), reverse=True)
    write(DATA / "meetings.json", meetings)
    log(f"meetings: {len(meetings)} ({len(todo)} fetched)")

    write(DATA / "meta.json", {
        "updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "term": TERM,
        "source": "https://digital.parliament.gov.np",
        "counts": {"members": len(index), "bills": len(bills), "meetings": len(meetings)},
        "requests": en.requests + ne.requests,
    })
    if not index or not bills:
        sys.exit("no members or bills parsed; the portal layout may have changed")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--refetch-meetings", action="store_true")
    a = ap.parse_args()
    run(a.limit, a.refetch_meetings)

"""House of Representatives results from the 2082 (March 2026) election.

The Election Commission's result site serves every directly elected seat's
candidates as one JSON file, behind a CSRF cookie the page sets. We keep the
fields that describe the race and the candidates' public background (age,
education, stated experience) and leave out family names and home addresses.

    python -m tracker.election   # writes data/election.json
"""
import difflib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import requests

from .text import ascii_digits

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "election.json"
BASE = "https://result.election.gov.np"
PAGE = "/ElectionResultCentral2082.aspx"
FILE = "JSONFiles/ElectionResultCentral2082.txt"


def fetch_raw():
    s = requests.Session()
    s.headers["User-Agent"] = "nepal-parliament-tracker (+https://github.com/poshakpathak/nepal-tracker)"
    page = s.get(BASE + PAGE, timeout=60)
    page.raise_for_status()
    r = s.get(BASE + "/Handlers/SecureJson.ashx", params={"file": FILE},
              headers={"X-CSRF-Token": s.cookies.get("CsrfToken") or "", "Referer": page.url}, timeout=120)
    r.raise_for_status()
    return json.loads(r.content.decode("utf-8-sig"))


def _clean(v):
    v = (v or "").strip() if isinstance(v, str) else v
    return None if v in ("", "0", "-", "छैन", None) else v


def races(raw):
    """Group candidate rows into one record per constituency, candidates by votes."""
    by = {}
    for c in raw:
        key = (int(c["DistrictCd"]), int(ascii_digits(str(c["SCConstID"]))))
        r = by.setdefault(key, {"district_code": key[0], "district_ne": c.get("DistrictName"), "province_ne": c.get("StateName"),
                                "no": key[1], "candidates": []})
        elected = (c.get("Remarks") or "").lower() == "elected"
        r["candidates"].append({
            "id": c.get("CandidateID"), "name_ne": (c.get("CandidateName") or "").strip(), "party_ne": (c.get("PoliticalPartyName") or "").strip(),
            "votes": int(c.get("TotalVoteReceived") or 0), "elected": elected, "gender_ne": c.get("Gender"),
            "age": c.get("DOB") if isinstance(c.get("DOB"), int) else None, "born_bs": _clean(c.get("AGE")),
            # Background is kept for winners only; it is what the site shows.
            **({"qualification": _clean(c.get("QUALIFICATION")), "institution": _clean(c.get("NAMEOFINST")),
                "experience": _clean(c.get("EXPERIENCE"))} if elected else {}),
        })
    out = []
    for r in by.values():
        r["candidates"].sort(key=lambda c: -c["votes"])
        r["total"] = sum(c["votes"] for c in r["candidates"])
        out.append(r)
    return sorted(out, key=lambda r: (r["district_code"], r["no"]))


def main():
    rs = races(fetch_raw())
    OUT.write_text(json.dumps(rs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"election: {len(rs)} constituencies, {sum(len(r['candidates']) for r in rs)} candidates -> {OUT}")


if __name__ == "__main__":
    main()


# ---------------------------------------------------------------- matching to portal members

_TITLES = re.compile(r"^(?:(?:प्रधानमन्त्री|उपप्रधानमन्त्री|राज्यमन्त्री|मन्त्री|सभामुख|उपसभामुख|सम्माननीय|माननीय|मा\.|डा\.?|इ\.|इन्जि\.|प्रा\.)\s*)+")
_SAME = [("ं", "ँ"), ("ङ्ग", "ङ"), ("ब", "व"), ("ी", "ि"), ("ू", "ु"), ("श", "स"), ("ष", "स")]


def _norm(name):
    s = unicodedata.normalize("NFC", name or "")
    s = _TITLES.sub("", re.sub(r"\(.*?\)", "", s).strip())
    s = re.sub(r"[‌‍\s.]", "", s)
    for a, b in _SAME:  # spellings the two sites use interchangeably
        s = s.replace(a, b)
    return s


def _score(a, b):
    return difflib.SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def match(members, rs):
    """Portal slug -> race, for directly elected members.

    The portal names seats in English ("Dolakha-1"), the Commission in Nepali
    with a district code. Confident name matches teach us which Nepali district
    each English one is; then every seat is matched on district and number.
    """
    direct = [(m, re.match(r"(.+)-(\d+)$", m.get("seat") or "")) for m in members if m.get("election") == "direct"]
    direct = [(m, s.group(1), int(s.group(2))) for m, s in direct if s]
    winners = [(r, c) for r in rs for c in r["candidates"] if c["elected"]]
    seen = defaultdict(Counter)
    for m, dist, no in direct:
        best = max(((_score(m.get("name_ne"), c["name_ne"]), r["district_ne"]) for r, c in winners if r["no"] == no), default=(0, None))
        if best[0] > 0.85:
            seen[dist][best[1]] += 1
    dmap = {d: c.most_common(1)[0][0] for d, c in seen.items()}
    out = {}
    for m, dist, no in direct:
        hit = [r for r in rs if r["no"] == no and r["district_ne"] == dmap.get(dist)]
        if len(hit) == 1:
            out[m["slug"]] = hit[0]
    return out

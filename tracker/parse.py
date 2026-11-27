"""Parsers for pages of the Federal Parliament portal (digital.parliament.gov.np).

Every function takes HTML and returns plain dicts. Pages are server-rendered;
the richest data sits in JSON attributes (data-attendance, data-colleagues)
and in a JSON script (memberStatementsModalData).
"""
import datetime as dt
import json
import re

from bs4 import BeautifulSoup

from .text import ascii_digits, clean, split_office, strip_honorific, to_int

BASE = "https://digital.parliament.gov.np"
UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"


def soup(html):
    return BeautifulSoup(html, "html.parser")


def _text(el, sep=" "):
    return clean(el.get_text(sep, strip=True)) if el else ""


def _slug(url):
    m = re.search(r"/members/([^/?#]+)", url or "")
    return m.group(1) if m else None


# ---------------------------------------------------------------- sitemap

def sitemap_urls(xml):
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    out = {"members": [], "meetings": [], "committees": []}
    for u in urls:
        path = u.replace(BASE, "")
        if re.fullmatch(r"/members/[^/]+", path):
            if _slug(u) not in ("hor", "na"):  # chamber listing pages, not members
                out["members"].append(_slug(u))
        elif m := re.fullmatch(rf"/baithak-detail/({UUID})", path):
            out["meetings"].append(m.group(1))
        elif re.fullmatch(r"/committees/[^/]+", path):
            out["committees"].append(path.split("/")[-1])
    return out


# ---------------------------------------------------------------- members

CHAMBERS = {"house_of_representatives": "hor", "national_assembly": "na"}


def member_list(html):
    """Cards on /members. Attribute data is language-independent; names follow page locale."""
    s = soup(html)
    rows = []
    for card in s.select("article.mp-card"):
        a = card.select_one("a.mp-card__hit")
        img = card.select_one(".mp-card__avatar img")
        name, office = split_office(_text(card.select_one(".mp-card__name")))
        rows.append({
            "slug": _slug(a["href"]) if a else None,
            "name": name,
            "office": office,
            "chamber": CHAMBERS.get(card.get("data-chamber"), card.get("data-chamber")),
            "party": _text(card.select_one(".mp-card__party")),
            "party_id": card.get("data-party-uuid") or None,
            "place": _text(card.select_one(".mp-card__location")),
            "district": card.get("data-district") or None,
            "election": (card.get("data-selection-type") or "").lower() or None,
            "gender": (card.get("data-gender") or "").lower() or None,
            "role": _text(card.select_one(".mp-card__role")),
            "attendance_pct": to_int(card.get("data-sort-attendance")),
            "photo": img["src"] if img and img.get("src") else None,
        })
    return rows


def _attendance(panel_json):
    """Flatten a member's data-attendance JSON into per-meeting records."""
    d = json.loads(panel_json)
    ov = d.get("overview") or {}
    summary = {
        "scope": d.get("scope"),
        "percent": d.get("overallPercent"),
        "total": ov.get("totalMeetings"),
        "present": ov.get("presentMeetings"),
        "absent": ov.get("absentMeetings"),
    }
    records = {}
    for month in d.get("months") or []:
        days = month.get("daysByIso") or {}
        if isinstance(days, list):
            days = {}
        for iso, day in days.items():
            for mt in day.get("meetings") or []:
                if mt.get("uuid"):
                    records[mt["uuid"]] = {
                        "meeting": mt["uuid"],
                        "date": iso,
                        "status": mt.get("status"),  # present | absent | partial | upcoming
                        "title": clean(mt.get("title")),
                    }
    return summary, sorted(records.values(), key=lambda r: (r["date"], r["meeting"]))


def member_page(html):
    s = soup(html)
    out = {"name": strip_honorific(_text(s.find("h1")))}
    ld = s.find("script", type="application/ld+json")
    if ld:
        try:
            out["photo"] = json.loads(ld.get_text()).get("image")
        except ValueError:
            pass
    out["name_ne"] = strip_honorific(_text(s.select_one(".hero-name-np")))
    out["education"] = _text(s.select_one(".hero-tagline")) or None
    out["seat"] = _text(s.select_one(".ph-meta-item--place dd")) or None
    out["bio"] = {
        _text(sec.select_one(".journey-legacy__heading")): sec.select_one(".journey-legacy__body").get_text("\n", strip=True)
        for sec in s.select(".journey-legacy__section")
        if sec.select_one(".journey-legacy__body")
    }
    out["terms"] = [
        {
            "years": _text(it.select_one(".tl-year")),
            "role": _text(it.select_one(".tl-role")),
            "org": _text(it.select_one(".tl-org")),
            "note": _text(it.select_one(".tl-note")) or None,
        }
        for it in s.select("#section-journey .tl-item")
    ]
    m = re.match(r"(\d{4}-\d{2}-\d{2})", out["terms"][0]["years"]) if out["terms"] else None
    out["term_start"] = m.group(1) if m else None
    committees = []
    sec = s.find(id="section-committees")
    if sec:
        col = s.find(attrs={"data-colleagues": True})
        if col:
            try:
                cj = json.loads(col["data-colleagues"])
                for c in cj.get("committees") or []:
                    committees.append({"id": c.get("id"), "name": clean(c.get("title"))})
            except ValueError:
                pass
    out["committees"] = committees
    out["attendance"] = {}
    out["meetings"] = []
    for el in s.find_all(attrs={"data-attendance": True}):
        try:
            summary, recs = _attendance(el["data-attendance"])
        except ValueError:
            continue
        scope = "house" if summary["scope"] == "parliament" else summary["scope"] or "other"
        out["attendance"][scope] = summary
        for r in recs:
            r["scope"] = scope
        out["meetings"].extend(recs)
    statements = []
    st = s.find(id="memberStatementsModalData")
    if st:
        try:
            for v in json.loads(st.get_text()).values():
                statements.append({
                    "id": v.get("uuid"),
                    "kind": clean(v.get("title") or v.get("name")),
                    "context": clean(v.get("categoryLabel")),
                    "video": v.get("videoPlayUrl") or v.get("videoEmbedSrc"),
                    "text": clean(v.get("textContent"))[:4000] or None,
                })
        except ValueError:
            pass
    out["statements"] = statements
    return out


# ---------------------------------------------------------------- bills

def bill_list(html):
    s = soup(html)
    ids = []
    for a in s.select("a.bills-demo-card[href]"):
        m = re.search(rf"/bills/({UUID})", a["href"])
        if m and m.group(1) not in ids:
            ids.append(m.group(1))
    return ids


def _parse_en_date(s, year_hint=None):
    s = clean(s)
    s = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", s)
    for fmt in ("%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    if year_hint:
        for fmt in ("%b %d %Y", "%d %b %Y", "%B %d %Y", "%d %B %Y"):
            try:
                return dt.datetime.strptime(f"{s} {year_hint}", fmt).date()
            except ValueError:
                pass
    return None


_W = r"(?:[A-Z][\w'’\-]*|\([^)]*\))"
_C = r"(?:of|and|to|for|the|on|in|by|with|Relating)"
_TITLE = re.compile(rf"({_W}(?:\s+(?:{_W}|{_C}))*),\s*(20\d\d)")


def english_title(summary):
    """The portal's English summary names the bill in several phrasings; find the name."""
    m = re.search(r'name of (?:this|the) (?:bill|act) is (?:the )?"([^"]+)"', summary, re.I)
    if m:
        return m.group(1)
    cands = []
    for m in _TITLE.finditer(summary):
        t = re.sub(r"^The\s+", "", m.group(1))
        if re.search(r"\b(Bill|Act)\b", t):
            cands.append((t, int(m.group(2))))
    recent = [c for c in cands if c[1] >= 2080 or 2024 <= c[1] <= 2030]
    best = (recent or cands or [None])[0]
    return f"{best[0]}, {best[1]}" if best else None


def bill_page(html, bill_id=None):
    """English bill page. Title stays in Nepali on the portal; the English name is in the summary."""
    s = soup(html)
    out = {"id": bill_id}
    out["title_ne"] = _text(s.find(class_="bills-demo-detail-title"))
    tags = [_text(x) for x in s.select(".bills-demo-detail-tags > span:not(.bills-demo-detail-tags-sep)")]
    out["status"] = tags[0] if tags else None
    out["tags"] = tags[1:]
    details = {}
    for row in s.select(".bills-demo-aside-details-row"):
        details[_text(row.find("dt"))] = _text(row.find("dd"))
    out["number"] = to_int(details.get("Registration no.") or details.get("दर्ता नं."))
    reg = _parse_en_date(details.get("Registered", ""))
    out["registered"] = reg.isoformat() if reg else None
    out["ministry_ne"] = details.get("Ministry") or details.get("मन्त्रालय")
    out["presented_by"] = strip_honorific(details.get("Presented by", ""))
    out["category"] = details.get("Category / type")
    out["days_in_process"] = to_int(details.get("In process"))
    sub = _text(s.find(class_="bills-demo-detail-subtitle"), " | ")
    m = re.search(r"(House of Representatives|National Assembly), Session ([^|]+)", sub)
    out["origin"] = m.group(1) if m else None
    out["session_ne"] = clean(m.group(2)) if m else None
    body = s.find(class_="bills-demo-bill-detail-body")
    summary = body.get_text("\n", strip=True) if body else ""
    out["summary"] = summary[:6000]
    out["title"] = english_title(summary)
    # Journey: phases (one per house pass) -> stages -> steps.
    steps = []
    year = reg.year if reg else None
    last = reg
    for phase_i, phase in enumerate(s.select(".bills-demo-phase")):
        house = re.sub(r"^Phase \d+\s*·\s*", "", _text(phase.select_one(".bills-demo-phase-kicker"))) or None
        for step in phase.select(".bills-demo-step"):
            classes = step.get("class", [])
            state = next((c[3:] for c in classes if c.startswith("is-")), None)
            title = _text(step.select_one(".bills-demo-step-title"))
            raw_date = _text(step.select_one(".bills-demo-step-date"))
            date = None
            if raw_date and year:
                date = _parse_en_date(raw_date, year)
                if date and last and date < last - dt.timedelta(days=60):
                    later = date.replace(year=date.year + 1)  # rolled into the next year
                    if later <= dt.date.today():
                        date = later
                if date:
                    last = date
            docs = [a["href"] for a in step.select("a.bills-demo-step-doc[href]")]
            steps.append({
                "phase": phase_i + 1,
                "house": house,
                "step": title,
                "state": state,  # completed | current | upcoming
                "date": date.isoformat() if date else None,
                "docs": docs,
            })
    out["steps"] = steps
    done = [x for x in steps if x["state"] == "completed"]
    cur = next((x for x in steps if x["state"] == "current"), None)
    out["current_step"] = cur["step"] if cur else (done[-1]["step"] if done else None)
    out["last_action"] = max((x["date"] for x in steps if x["date"]), default=out["registered"])
    out["pdf"] = next((d for x in steps for d in x["docs"]), None)
    return out


# ---------------------------------------------------------------- meetings

def meeting_page(html, meeting_id=None):
    """English meeting (baithak) page: date, body, duration, agenda, per-member attendance."""
    s = soup(html)
    out = {"id": meeting_id, "title": _text(s.find("h1"))}
    txt = _text(s, " | ")
    m = re.search(r"\| (\d{1,2} [A-Z][a-z]+ \d{4}) \| Meeting Date", txt)
    d = _parse_en_date(m.group(1)) if m else None
    out["date"] = d.isoformat() if d else None
    m = re.search(r"Meeting Date \| ([^|]+) \| (\d{1,2}:\d{2} [AP]M) – (\d{1,2}:\d{2} [AP]M)", txt)
    if m:
        out["duration"] = clean(m.group(1))
        out["start"], out["end"] = m.group(2), m.group(3)
    m = re.search(r"\| (Concluded|Upcoming|Ongoing|Postponed|Cancelled) \|", txt)
    out["state"] = m.group(1).lower() if m else None
    m = re.search(r"Meeting Date \| [^|]+ \| [^|]+ \| ([^|]+) \|", txt)
    out["body"] = clean(m.group(1)) if m else None
    m = re.search(r"under the chairmanship of (.+?) and ran", txt)
    out["chair"] = strip_honorific(re.sub(r"^(Committee |Sub-?committee )?Chair(person|man)?\s*", "", m.group(1), flags=re.I)) if m else None
    m = re.search(r"\| Agenda \| ([^|]+)", txt)
    out["agenda"] = clean(m.group(1)) if m else None
    m = re.search(r"\| Meeting Minutes \| ([^|]+)", txt)
    out["minutes"] = None if not m or "not available" in m.group(1) else clean(m.group(1))
    att = []
    for a in s.select("a.att-members__name[href]"):
        card = a.find_parent(class_="att-members__info") or a.parent
        status = card.select_one(".att-members__status")
        cls = " ".join(status.get("class", [])) if status else ""
        st = re.search(r"--(present|absent|partial|leave)", cls)
        att.append({"member": _slug(a["href"]), "status": st.group(1) if st else _text(status).lower() or None})
    out["attendance"] = att
    m = re.search(r"(\d+) of (\d+) present", txt)
    if m:
        out["present"], out["members"] = int(m.group(1)), int(m.group(2))
    rec = [a["href"] for a in s.find_all("a", href=True) if re.search(r"\.mp4|youtube|recording|get_video", a["href"], re.I)]
    out["recording"] = rec[0] if rec else None
    return out

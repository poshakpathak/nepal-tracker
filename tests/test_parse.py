import pathlib

from tracker import parse

FX = pathlib.Path(__file__).parent / "fixtures"


def load(name):
    return (FX / name).read_text(encoding="utf-8")


def test_sitemap():
    u = parse.sitemap_urls(load("sitemap.xml"))
    assert len(u["members"]) > 300
    assert len(u["meetings"]) > 100


def test_member_list_english_and_nepali():
    en = parse.member_list(load("en-members.html"))
    ne = parse.member_list(load("members.html"))
    assert len(en) == len(ne) > 300
    a = next(m for m in en if m["slug"] == "jagadish-kharel")
    assert a["chamber"] == "hor" and a["party"] == "Rastriya Swatantra Party"
    assert {m["chamber"] for m in en} == {"hor", "na"}


def test_member_page():
    p = parse.member_page(load("en-member-jagadish-kharel.html"))
    assert p["name"].startswith("Jagadish Kharel")
    assert p["name_ne"].startswith("जगदिश")
    assert p["seat"] == "Dolakha-1"
    assert p["attendance"]["house"]["total"] == 71
    assert p["attendance"]["house"]["present"] == 56
    assert p["committees"][0]["name"] == "Finance Committee"
    house = [m for m in p["meetings"] if m["scope"] == "house"]
    assert len(house) == 71
    assert sum(m["status"] == "present" for m in house) == 56


def test_bill_page():
    b = parse.bill_page(load("en-bill-0.html"), "x")
    assert b["number"] == 41
    assert b["title"] == "Renewable Energy and Energy Efficiency Bill, 2083"
    assert b["registered"] == "2026-10-08"
    assert b["steps"][0]["state"] == "completed"
    assert b["current_step"] == "Bill Distribution"
    assert b["pdf"].endswith(".pdf")


def test_bill_list():
    assert len(parse.bill_list(load("en-bills.html"))) == 44


def test_meeting_page():
    m = parse.meeting_page(load("en-meeting-2.html"), "y")
    assert m["date"] == "2026-11-25"
    assert m["present"] == 10 and m["members"] == 12
    assert len(m["attendance"]) == 12
    assert m["chair"] == "Jayanti Devi Rai"

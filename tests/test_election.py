import json
from pathlib import Path

from tracker.election import match, races

RAW = json.loads((Path(__file__).parent / "fixtures" / "ec-candidates.json").read_text(encoding="utf-8"))


def test_races_group_and_sort():
    rs = races(RAW)
    assert len(rs) == 3
    r = rs[0]
    assert r["no"] == 1 and r["district_code"] == 1
    votes = [c["votes"] for c in r["candidates"]]
    assert votes == sorted(votes, reverse=True) and r["total"] == sum(votes)
    assert r["candidates"][0]["elected"]
    # Family names and addresses are never kept.
    assert not any(k in c for c in r["candidates"] for k in ("FATHER_NAME", "SPOUCE_NAME", "ADDRESS", "father", "address"))


def test_match_handles_titles_and_spelling():
    rs = races(RAW)
    winner = rs[0]["candidates"][0]["name_ne"]
    members = [{"slug": "x", "election": "direct", "seat": "Taplejung-1", "name_ne": "मन्त्री " + winner + " (ताप्लेजुङ)"}]
    out, dmap = match(members, rs)
    assert out["x"] is rs[0]
    assert dmap == {"Taplejung": rs[0]["district_ne"]}

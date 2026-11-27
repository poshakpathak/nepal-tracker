import json
from pathlib import Path

from tracker import site


def test_pledge_status_follows_bill(tmp_path, monkeypatch):
    (tmp_path / "pledges.json").write_text(json.dumps({"pledges": [
        {"party": "x", "status": "bill", "bill": "a"},
        {"party": "x", "status": "bill", "bill": "b"},
        {"party": "x", "status": "bill", "bill": "gone"},
        {"party": "x", "status": "none"},
    ]}))
    monkeypatch.setattr(site, "DATA", tmp_path)
    bills = [{"id": "a", "status": "Completed", "title": "A Act"}, {"id": "b", "status": "In progress", "title": "B Bill"}]
    got = [p["status"] for p in site.pledges(bills)["pledges"]]
    assert got == ["passed", "bill", "none", "none"]


def test_pledge_file_is_valid():
    d = json.loads((Path(__file__).parent.parent / "data" / "pledges.json").read_text())
    parties = {p["id"] for p in d["parties"]}
    for p in d["pledges"]:
        assert p["party"] in parties and p["en"] and p["ne"] and p["source"].startswith("https://")
        assert p["status"] in {"passed", "bill", "lapsed", "deadline", "none"}

import json

from tracker import site


def test_build_with_empty_data(tmp_path, monkeypatch):
    monkeypatch.setattr(site, "DATA", tmp_path / "data")
    out = tmp_path / "dist"
    site.build(out)
    assert (out / "index.html").exists()
    assert json.loads((out / "d" / "members.json").read_text()) == []


def test_streaks_and_months():
    rows = [{"date": f"2026-04-0{i}", "meeting": str(i), "status": s}
            for i, s in enumerate(["present", "absent", "absent", "present", "absent", "absent", "absent"], 1)]
    st = site.streaks(rows)
    assert st["streak"] == 3 and st["streak_from"] == "2026-04-05"
    assert st["longest"] == 3
    assert site.monthly(rows) == [["2026-04", 7, 2.0]]


def test_week_starts_on_sunday():
    assert site.week_start("2026-11-27") == "2026-11-22"  # a Friday
    assert site.week_start("2026-11-22") == "2026-11-22"

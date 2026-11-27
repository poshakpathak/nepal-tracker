import json

from tracker import site


def test_build_with_empty_data(tmp_path, monkeypatch):
    monkeypatch.setattr(site, "DATA", tmp_path / "data")
    out = tmp_path / "dist"
    site.build(out)
    assert (out / "index.html").exists()
    assert json.loads((out / "d" / "members.json").read_text()) == []

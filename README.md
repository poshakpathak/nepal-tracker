# Nepal Parliament Tracker

What the members of Nepal's Federal Parliament are doing: who shows up, which bills are moving, what committees meet about, and who speaks on the floor.

## Data

Everything comes from the Federal Parliament's public portal, [digital.parliament.gov.np](https://digital.parliament.gov.np), refreshed nightly by GitHub Actions (`.github/workflows/update-data.yml`).

| File | Contents |
| --- | --- |
| `data/members.json` | Every MP in both houses: party, seat, chamber, committees, attendance summary |
| `data/members/<slug>.json` | One MP in full, including attendance for every sitting and committee meeting, and floor statements |
| `data/bills.json`, `data/bills/<id>.json` | Every bill on the portal with its stage-by-stage journey and documents |
| `data/meetings.json`, `data/meetings/<id>.json` | House, National Assembly and committee meetings: date, duration, agenda, who attended |
| `data/meta.json` | Last refresh time and counts |

Nepal's parliament mostly decides by voice vote and does not publish how each member voted, so this tracker does not have per-member votes.

## Running locally

```
pip install -r requirements.txt pytest
python -m pytest -q
python -m tracker.update --limit 5   # quick run
python -m tracker.update             # full refresh, about 20 minutes
```

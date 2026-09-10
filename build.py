# Regenerate the website after updating alliance-mobilization.xlsx.
# Usage: python build.py
import openpyxl, json, re
from pathlib import Path
from collections import defaultdict

xlsx = Path("alliance-mobilization.xlsx")
wb = openpyxl.load_workbook(xlsx, data_only=True)

def clean(value):
    return "" if value is None else str(value).strip()

def parse_name_change(value):
    """Parse the final parenthesized old name: New Name (Old Name)."""
    m = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", clean(value))
    if not m:
        return None
    return m.group(1).strip(), m.group(2).strip()

# The workbook's Name changes sheet is the authoritative identity map.
# Column B = current name, C/D/E... = progressively older names.
matching_sheet = wb["Name changes"] if "Name changes" in wb.sheetnames else None
matching_rows = []
explicit_aliases = {}
name_chains = []

if matching_sheet:
    header_row = None
    for r in range(1, matching_sheet.max_row + 1):
        if clean(matching_sheet.cell(r, 2).value).lower() == "current name":
            header_row = r
            break
    if header_row:
        for r in range(header_row + 1, matching_sheet.max_row + 1):
            current = clean(matching_sheet.cell(r, 2).value)
            if not current:
                continue
            olds = []
            for c in range(3, matching_sheet.max_column + 1):
                old = clean(matching_sheet.cell(r, c).value)
                if old and old not in olds and old != current:
                    olds.append(old)
            # Ignore accidental duplicate rows for the same current name.
            if current in [x["currentName"] for x in matching_rows]:
                continue
            matching_rows.append({"currentName": current, "formerNames": olds})
            for old in olds:
                explicit_aliases[old] = current
            name_chains.append({"currentName": current, "formerNames": olds})

# Also read inline "New Name (Old Name)" values from event sheets. This keeps
# the workbook backward-compatible even if a new change has not yet been added
# to the matching sheet.
events = []
inline_aliases = {}
for ws in wb.worksheets:
    if ws.title == "Name changes":
        continue
    meta = {clean(ws.cell(r, 2).value): ws.cell(r, 4).value for r in range(3, 11) if ws.cell(r, 2).value}
    rows = []
    for r in range(13, ws.max_row + 1):
        name = ws.cell(r, 3).value
        if name is None:
            continue
        name = clean(name)
        parsed = parse_name_change(name)
        display_name = parsed[0] if parsed else name
        if parsed:
            new_name, old_name = parsed
            inline_aliases[old_name] = new_name
        rows.append({
            "rank": ws.cell(r, 2).value,
            "name": name,
            "displayName": display_name,
            "points": ws.cell(r, 4).value or 0,
            "started": ws.cell(r, 5).value or 0,
            "completed": ws.cell(r, 6).value or 0,
            "ppq": ws.cell(r, 7).value or 0,
        })
    events.append({
        "id": ws.title.lower().replace(" ", "-"),
        "name": ws.title,
        "start": meta.get("Start"),
        "end": meta.get("End"),
        "alliancePoints": meta.get("Alliance-Points", 0),
        "allianceRank": meta.get("Alliance-Rank"),
        "level": meta.get("Level completed"),
        "reward": meta.get("Legendary Fragment Choice-Chests"),
        "minimumPoints": meta.get("Minimum Points Required", meta.get("Minimum Points required")),
        "rows": rows,
    })

# Matching sheet wins when both sources contain a relationship.
aliases = dict(inline_aliases)
aliases.update(explicit_aliases)

def canonical(name):
    seen = set()
    cur = clean(name)
    while cur in aliases and cur not in seen:
        seen.add(cur)
        cur = clean(aliases[cur])
    return cur

# Map every event row to its canonical/current identity.
for event in events:
    for row in event["rows"]:
        row["playerId"] = canonical(row["displayName"])

players = {}
for event_index, event in enumerate(events):
    for row in event["rows"]:
        pid = row["playerId"]
        if pid not in players:
            players[pid] = {"id": pid, "names": [], "events": []}
        p = players[pid]
        if row["displayName"] not in p["names"]:
            p["names"].append(row["displayName"])
        p["events"].append({
            "eventId": event["id"], "event": event["name"], "rank": row["rank"],
            "points": row["points"], "started": row["started"], "completed": row["completed"],
            "ppq": row["ppq"], "displayName": row["displayName"]
        })

# Add all names from the explicit matching table, then expose history oldest -> current.
for chain in name_chains:
    current = chain["currentName"]
    pid = canonical(current)
    if pid not in players:
        players[pid] = {"id": pid, "names": [], "events": []}
    p = players[pid]
    for old in reversed(chain["formerNames"]):
        if old not in p["names"]:
            p["names"].insert(0, old)
    if current not in p["names"]:
        p["names"].append(current)

for p in players.values():
    p["currentName"] = canonical(p["id"])
    # Ensure names are oldest -> current and contain no duplicate display variants.
    p["names"] = [n for n in p["names"] if n != p["currentName"]] + [p["currentName"]]
    p["totalPoints"] = sum(x["points"] for x in p["events"])
    p["averagePoints"] = round(p["totalPoints"] / len(p["events"]), 1) if p["events"] else 0
    p["eventsParticipated"] = sum(x["points"] > 0 for x in p["events"])
    p["questsCompleted"] = sum(x["completed"] for x in p["events"])
    p["bestPoints"] = max((x["points"] for x in p["events"]), default=0)
    p["bestRank"] = min((x["rank"] for x in p["events"] if isinstance(x["rank"], (int, float))), default=None)
    ranks = [x["rank"] for x in p["events"] if isinstance(x["rank"], (int, float))]
    p["averageRank"] = round(sum(ranks) / len(ranks), 1) if ranks else 0
    pp = [x["ppq"] for x in p["events"] if x["completed"] > 0]
    p["averagePPQ"] = round(sum(pp) / len(pp), 1) if pp else 0
    p["nameHistory"] = p["names"]

# Event-level average points per completed quest.
for event in events:
    completed = sum(x["completed"] for x in event["rows"])
    points = sum(x["points"] for x in event["rows"])
    event["averagePPQ"] = round(points / completed, 1) if completed else 0

# Dashboard metric: arithmetic mean of event-level averages.
event_ppq = [e["averagePPQ"] for e in events if e["averagePPQ"] > 0]
avg_all_events_ppq = round(sum(event_ppq) / len(event_ppq), 1) if event_ppq else 0

name_changes = []
for chain in name_chains:
    current = chain["currentName"]
    olds = chain["formerNames"]
    for i, old in enumerate(olds):
        newer = current if i == 0 else olds[i - 1]
        name_changes.append({"oldName": old, "newName": newer, "canonical": canonical(current)})

# Deduplicate name changes while preserving order.
seen_changes = set()
name_changes = [x for x in name_changes if not ((x["oldName"], x["newName"]) in seen_changes or seen_changes.add((x["oldName"], x["newName"]))) ]

data = {
    "kingdom": 3662,
    "updatedFromWorkbook": events[-1]["name"] if events else "",
    "events": events,
    "players": sorted(players.values(), key=lambda p: (-p["totalPoints"], p["currentName"].lower())),
    "nameChanges": name_changes,
    "nameChains": name_chains,
    "averagePPQ": avg_all_events_ppq,
}
(Path("data.js")).write_text("window.ALLIANCE_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";", encoding="utf-8")
print("Updated data.js from", xlsx)
print("Events:", len(events), "Players:", len(players), "Name chains:", len(name_chains))

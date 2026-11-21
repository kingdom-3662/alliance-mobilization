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

# Optional scoring overrides from the user's simplified workbook.
# Columns B/C/D = Event / Player as displayed in that event / Include or Exclude.
# These only affect aggregated player results: event listings stay untouched.
scoring_exceptions = {}
if "Scoring exceptions" in wb.sheetnames:
    exception_sheet = wb["Scoring exceptions"]
    header_row = next((r for r in range(1, exception_sheet.max_row + 1)
                       if clean(exception_sheet.cell(r, 2).value).lower() == "event"
                       and clean(exception_sheet.cell(r, 3).value).lower() == "player"
                       and clean(exception_sheet.cell(r, 4).value).lower() == "treatment"), None)
    if header_row is None:
        raise ValueError("Scoring exceptions: expected Event, Player, Treatment headers in B:D")
    for r in range(header_row + 1, exception_sheet.max_row + 1):
        event_name = clean(exception_sheet.cell(r, 2).value)
        player_name = clean(exception_sheet.cell(r, 3).value)
        treatment = clean(exception_sheet.cell(r, 4).value).lower()
        if not event_name and not player_name and not treatment:
            continue
        if not event_name or not player_name or treatment not in {"include", "exclude"}:
            raise ValueError(f"Scoring exceptions row {r}: supply Event, Player and Include/Exclude")
        key = (event_name, player_name)
        if key in scoring_exceptions:
            raise ValueError(f"Scoring exceptions row {r}: duplicate assignment for {key!r}")
        scoring_exceptions[key] = treatment == "include"

# Also read inline "New Name (Old Name)" values from event sheets. This keeps
# the workbook backward-compatible even if a new change has not yet been added
# to the matching sheet.
events = []
inline_aliases = {}
for ws in wb.worksheets:
    if ws.title in {"Name changes", "Scoring exceptions"}:
        continue
    # Metadata labels are not always in the same column: most labels are in B,
    # while "Level completed" is in C. Find each label across B:D and take
    # the next non-empty cell to its right.
    meta = {}
    for r in range(3, 11):
        for c in range(2, 5):
            label = clean(ws.cell(r, c).value)
            if label:
                value = None
                for value_col in range(c + 1, min(ws.max_column, c + 3) + 1):
                    candidate = ws.cell(r, value_col).value
                    if candidate is not None and clean(candidate) != "":
                        value = candidate
                        break
                meta[label.strip().lower()] = value
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
        "start": meta.get("start"),
        "end": meta.get("end"),
        "alliancePoints": meta.get("alliance-points", 0),
        "allianceRank": meta.get("alliance-rank"),
        "level": meta.get("level completed"),
        "reward": meta.get("legendary fragment choice-chests"),
        "minimumPoints": meta.get("minimum points required", meta.get("minimum points required")),
        "rows": rows,
    })

# Validate every override against one unambiguous row in the original event sheet.
# Set the flag on the raw event result, but do not delete it from the event list.
matched_exceptions = set()
for event in events:
    for row in event["rows"]:
        key = (event["name"], row["displayName"])
        if key not in scoring_exceptions:
            continue
        if key in matched_exceptions:
            raise ValueError(f"Scoring exceptions: {key!r} matches multiple event rows; cannot identify the intended row")
        matched_exceptions.add(key)
        if not scoring_exceptions[key]:
            row["includeInPlayerStats"] = False
unmatched = set(scoring_exceptions) - matched_exceptions
if unmatched:
    raise ValueError(f"Scoring exceptions: no matching event row for {sorted(unmatched)!r}")

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

# Fail fast if two included account rows resolve to one player in the same event.
# This guards against accidental double counting after a name change.
if "Scoring exceptions" in wb.sheetnames:
    for event in events:
        seen_players = {}
        for row in event["rows"]:
            if row.get("includeInPlayerStats") is False:
                continue
            pid = row["playerId"]
            if pid in seen_players:
                raise ValueError(f"{event['name']}: {pid!r} has multiple included account rows "
                                 f"({seen_players[pid]!r}, {row['displayName']!r}). "
                                 "Add a Scoring exceptions assignment to resolve this.")
            seen_players[pid] = row["displayName"]

players = {}
for event_index, event in enumerate(events):
    for row in event["rows"]:
        if row.get("includeInPlayerStats") is False:
            continue
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
    p["eventsParticipated"] = len(p["events"])  # Zero-point results count; excluded exception rows are already removed.
    p["questsCompleted"] = sum(x["completed"] for x in p["events"])
    p["bestPoints"] = max((x["points"] for x in p["events"]), default=0)
    p["bestRank"] = min((x["rank"] for x in p["events"] if isinstance(x["rank"], (int, float))), default=None)
    ranks = [x["rank"] for x in p["events"] if isinstance(x["rank"], (int, float))]
    p["averageRank"] = round(sum(ranks) / len(ranks), 1) if ranks else 0
    pp = [x["ppq"] for x in p["events"]]  # All included results count in the per-event average, including zero.
    p["averagePPQ"] = round(sum(pp) / len(pp), 1) if pp else 0
    p["nameHistory"] = p["names"]

# Event-level average points per completed quest and highest-scoring player.
for event in events:
    completed = sum(x["completed"] for x in event["rows"])
    points = sum(x["points"] for x in event["rows"])
    event["averagePPQ"] = round(points / completed, 1) if completed else 0
    best_row = max(event["rows"], key=lambda x: x["points"], default=None)
    event["topPlayer"] = best_row["playerId"] if best_row else ""
    event["topPlayerId"] = best_row["playerId"] if best_row else ""
    event["topPlayerPoints"] = best_row["points"] if best_row else 0

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

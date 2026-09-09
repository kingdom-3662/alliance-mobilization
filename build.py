
# Regenerate the website after updating alliance-mobilization.xlsx.
# Usage: python build.py
# The script intentionally keeps the web layer separate from the spreadsheet data.
import openpyxl, json, re
from pathlib import Path
from collections import defaultdict

xlsx = Path("alliance-mobilization.xlsx")
out = Path(".")
wb = openpyxl.load_workbook(xlsx, data_only=True)
events=[]
for ws in wb.worksheets:
    meta={str(ws.cell(r,2).value):ws.cell(r,4).value for r in range(3,11) if ws.cell(r,2).value}
    rows=[]
    for r in range(13,ws.max_row+1):
        name=ws.cell(r,3).value
        if name is None: continue
        rows.append({"rank":ws.cell(r,2).value,"name":str(name),"points":ws.cell(r,4).value or 0,
                     "started":ws.cell(r,5).value or 0,"completed":ws.cell(r,6).value or 0,
                     "ppq":ws.cell(r,7).value or 0})
    events.append({"id":ws.title.lower().replace(" ","-"),"name":ws.title,"start":meta.get("Start"),
                   "end":meta.get("End"),"alliancePoints":meta.get("Alliance-Points",0),
                   "allianceRank":meta.get("Alliance-Rank"),"level":meta.get("Level completed"),
                   "reward":meta.get("Legendary Fragment Choice-Chests"),
                   "minimumPoints":meta.get("Minimum Points Required",meta.get("Minimum Points required")),
                   "rows":rows})
aliases={}
for e in events:
    for r in e["rows"]:
        m=re.match(r"^(.*?)\s*\((.*?)\)\s*$",r["name"])
        if m: aliases[m.group(2).strip()]=m.group(1).strip()
def canonical(n):
    seen=set(); cur=n.strip()
    while cur in aliases and cur not in seen:
        seen.add(cur); cur=aliases[cur]
    return cur
for e in events:
    for r in e["rows"]: r["playerId"]=canonical(r["name"])
players=defaultdict(lambda:{"id":None,"names":[],"events":[]})
for e in events:
    for r in e["rows"]:
        p=players[r["playerId"]]; p["id"]=r["playerId"]
        if r["name"] not in p["names"]: p["names"].append(r["name"])
        p["events"].append({"eventId":e["id"],"event":e["name"],"rank":r["rank"],"points":r["points"],
                             "started":r["started"],"completed":r["completed"],"ppq":r["ppq"],
                             "displayName":r["name"]})
for p in players.values():
    p["currentName"]=canonical(p["id"])
    p["totalPoints"]=sum(x["points"] for x in p["events"])
    p["averagePoints"]=round(p["totalPoints"]/len(p["events"]),1)
    p["eventsParticipated"]=sum(x["points"]>0 for x in p["events"])
    p["questsCompleted"]=sum(x["completed"] for x in p["events"])
    p["bestPoints"]=max(x["points"] for x in p["events"])
    p["bestRank"]=min((x["rank"] for x in p["events"] if isinstance(x["rank"],(int,float))),default=None)
    p["averageRank"]=round(sum(x["rank"] for x in p["events"] if isinstance(x["rank"],(int,float)))/len(p["events"]),1)
    pp=[x["ppq"] for x in p["events"] if x["ppq"]>0]
    p["averagePPQ"]=round(sum(pp)/len(pp),1) if pp else 0
    p["nameHistory"]=p["names"]
data={"kingdom":3662,"updatedFromWorkbook":events[-1]["name"],"events":events,
      "players":sorted(players.values(),key=lambda p:(-p["totalPoints"],p["currentName"].lower())),
      "nameChanges":[{"oldName":o,"newName":n,"canonical":canonical(n)} for o,n in aliases.items()]}
(out/"data.js").write_text("window.ALLIANCE_DATA = "+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";",encoding="utf-8")
print("Updated data.js from",xlsx)

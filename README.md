# Kingdom 3662 · Last of 300 Spartan

Static statistics site for Alliance Mobilization events of Rise of Kingdoms Kingdom 3662.

## Local update

1. Replace `alliance-mobilization.xlsx` with the newest workbook.
2. Make sure the workbook contains the `Name changes` sheet.
3. Run:

```cmd
python -m pip install -r requirements.txt
python build.py
```

4. Open `index.html` locally or commit the changes to GitHub.

## Name matching

The `Name changes` sheet is the authoritative matching table:

- Column B = current name
- Column C = former name 1
- Column D = former name 2
- Column E = former name 3, etc.

Names in the event sheets using `New Name (Old Name)` are also recognized automatically. The matching sheet takes precedence when both sources contain a relationship.

All former names in a chain are merged into one player profile. For example:

`RamONa → Aresツ → ✗ Ares ✗ → • Iceball •`

## Scoring exceptions (optional worksheet)

The workbook may contain an additional sheet named **Scoring exceptions**, without changing any of the nine event sheets. The builder reads these columns beginning at the row headed **Event / Player / Treatment** in **B / C / D** (column A can hold a row number):

| Event | Player | Treatment |
| --- | --- | --- |
| June 2026 | ✗ Ares ✗ | Include |
| June 2026 | Aresツ | Exclude |
| July 2026 | ✗ Ares ✗ | Include |
| July 2026 | Aresツ | Exclude |

- **Include** explicitly keeps that event/account row in the canonical player's individual history and statistics (the normal default).
- **Exclude** removes only that particular account's result from the canonical player's history and statistics; the original event result is **preserved** in the event page and underlying event data.
- Names must match the event-sheet player name (the display name) exactly. The builder reports a clear error for missing rows, ambiguous duplicate matches, or invalid Treatment values.
- For safety, when the sheet exists, the build fails if two included event rows map to the same canonical player in a single event; resolve this with an explicit exception entry.
- This sheet is optional; the website remains compatible with older workbooks without it.

The scoring sheet is **not** treated as an Alliance Mobilization event. It is processed before individual player statistics are calculated. Names on the separate **Name changes** sheet remain the authoritative alias mappings.

## GitHub automatic deployment

The repository includes `.github/workflows/update-data.yml`.

After the repository is configured for **GitHub Pages → GitHub Actions**, every push to `main` that changes the workbook or website files will:

1. install Python/openpyxl,
2. run `build.py`,
3. generate `data.js`, and
4. deploy the site to GitHub Pages.

You therefore only need to replace the Excel workbook for normal data updates, then commit/push it.

## Dashboard additions (November 2026)
- Dashboard lists the top 25 player identities by total points.
- Dashboard event history is limited to the five most recent events and highlights the event with the highest alliance-point total.
- Each event card shows the highest-scoring player and their points.
- Dashboard includes an automatically generated alliance-points trend chart.
- Player profiles show cumulative Top 3, Top 5, and Top 10 event-placement counts.
- Metadata parsing searches the event metadata label across columns B–D, because `Level completed` is stored in column C in the workbook while most other labels are in column B.

## Version 4 updates

- Event detail labels now read **Levels completed** and **Minimum requirement**.
- Event player rows visually distinguish governors who met the minimum points requirement from those below it. Use **Show players below requirement** to filter the table, and **Show all players** to restore the full list.
- Player performance badges use mutually exclusive placement tiers: Top 1 (rank 1), 2nd–3rd, 4th–5th, and 6th–10th. A finish is counted in exactly one tier.
- The player points-over-time chart now uses a restrained gold/bronze palette instead of a red-to-green gradient, matching the dark modular dashboard design.
- Added standard spacing between the performance badges and the following profile content on desktop.


## Version 6 updates
- Removed placement badges from player result listings.
- Moved the below-requirement filter beneath the requirement legend on event detail pages.
- Removed the leading hash from the Alliance rank statistic.
- Highlighted the highest-alliance-points event on the Events overview.
- Matched event overview module backgrounds to the dashboard card styling.


## Version 7 — Dashboard, navigation, and responsive design

- Hamburger menu on phones; navigation stays within the screen width.
- Player profile "Points over time" chart and two-column layout scale to narrow portrait screens.
- Back buttons on Events, Players, and detail pages preserve previous route, filter, page and scroll position during in-app navigation.
- Player listings sort the complete filtered dataset before pagination, rather than sorting only 25 displayed entries.
- Colored rank circles for places 1, 2–3, 4–5, and 6–10; harmonized numeric typography.
- Dashboard: player leader cards for total points, average ranking and average points/quest; Alliance performance chart above Event history.
- Events: Alliance performance graph above cards, "All-time best" label, consistent graphite backgrounds and uniform card borders.

## GitHub Pages deployment

This project **must** use **Settings → Pages → Source: GitHub Actions**, not "Deploy from a branch". The existing `.github/workflows/update-data.yml` workflow is intentionally retained, as its build and deployment were confirmed successful on November 21, 2026.

On a commit to `main` that changes the workbook, `build.py` or website assets (according to the workflow's paths filter), Actions regenerates `data.js` from the Excel workbook and publishes a new Pages artifact. It does not commit generated `data.js` back to the repository.

The workflow substitutes the Git commit SHA into `__ASSET_VERSION__` in the **published** HTML. This version marker applies to `data.js`, `app.js`, and `styles.css`. The source `index.html` keeps the placeholder, by design.

For a manual rebuild, open **Actions → Build and deploy → Run workflow** and choose `main`.


## Trends analytics

The **Trends** page (available via the website navigation) calculates all metrics at runtime from the generated `data.js`; the Excel workbook and build process do not need additional columns.

- **Player momentum:** compares mean points in the last **three scoring event results** (points > 0) with the preceding **three scoring event results**. A governor needs at least six scoring results before a trend is shown. A change > +5% is tagged Improving; < -5% is Declining; otherwise Stable. This is a comparison across recorded event results, not monthly growth. The builder's `Scoring exceptions` exclusions are respected in player histories.
- **Alliance quest efficiency:** plots `averagePPQ` from each recorded event.
- **Active entries:** counts event result rows with more than zero points. These are **account/result entries**, not deduplicated unique governors.
- **Requirement completion rate:** number of event rows with points at least the event's own minimum requirement, divided by all recorded result rows. This includes zero-point accounts. Event minimum thresholds may differ, so percentages across events are not directly equivalent.
- **Event progression:** event-by-event table shows alliance points, percentage change versus the previous **recorded** event, alliance rank, active entries, requirement completion and efficiency.
- Contextual insights appear on the Dashboard, Events overview, player profiles and individual event pages. Chart data and links are automatically updated when the workbook is updated.

The charts connect consecutive recorded events, which may be separated by several months. No values are invented for unrecorded months or missing player history.


### Trend card presentation

The Trends page presents Quest efficiency, Active participation, and Minimum requirement completion as visual metric cards inspired by game tracker dashboards:

- **Quest efficiency:** latest average points per quest, a percentage-change pill versus the previous recorded event, and a gold line/area chart.
- **Active participation:** latest nonzero scoring-entry count, the percentage of all result entries that scored, percentage change in the count versus the previous recorded event, and a turquoise line/area chart.
- **Minimum requirement completion:** latest qualifying-entry percentage, an absolute change measured in **percentage points (pp)** versus the previous recorded event, and a per-event column chart with percentage labels inside the bars.
- Each bar identifies its event, including the year, and links to the event details. Missing earlier comparisons show “No comparison” rather than a made-up percentage.
- The Events overview donut uses the **dark backgrounds** of the existing ranking circles for its segments; the gold, silver, bronze, purple, and turquoise tier definitions are unchanged.



### Cross-site chart indicators

The dashboard Alliance performance chart and Events overview Alliance points chart display the latest alliance point total, the latest event label, and a `last:` percentage change compared with the previous **recorded** event. The ranking donut continues to show event counts and percentages by placement and now additionally describes the latest placement and movement compared with the prior recorded event; lower rank numbers are better.

On player profiles, the Points over time bar chart shows each recorded scoring event's point total directly above the bar, including a month/year label, plus a latest-result summary and `last:` percentage change from that player's previous recorded scoring result. Missing prior results display `last: No comparison`, with no fabricated percentage.

The Active participation trend is **steel blue**, using the site's shared `--place-steel-blue` color token; Quest efficiency remains purple. These chart enhancements use only generated `data.js` values and do not change the workbook builder, scoring exceptions, or statistics.

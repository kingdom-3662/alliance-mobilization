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

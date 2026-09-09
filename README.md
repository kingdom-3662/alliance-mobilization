# Kingdom 3662 · Alliance Mobilization website

This is a static website generated from `alliance-mobilization.xlsx`.

## Files

- `index.html` — website shell
- `styles.css` — visual design
- `app.js` — navigation, player profiles, tables and search
- `data.js` — generated data
- `build.py` — rebuilds `data.js` from a newer Excel workbook

## Add future events

1. Add a new worksheet to `alliance-mobilization.xlsx` using the same structure as the existing sheets.
2. Keep the event metadata in rows 3–10 and player results starting at row 13.
3. If a governor changes name, enter the first post-change result as:
   `New Name (Old Name)`
4. Run:
   `python build.py`
5. Publish the folder to any static web host.

The player identity logic follows the explicit `New Name (Old Name)` convention, including chained renames such as:
`Old → New → Newer`.

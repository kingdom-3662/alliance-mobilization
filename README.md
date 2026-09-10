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

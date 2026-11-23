# Migration notes: Bokeh server app → static single-page app

## Original

The Bokeh server app (`bokeh serve figure detail select-figure`), kept in
[`legacy-python/`](legacy-python/) with its Docker files:

- `select-figure/`: the gallery (default figure, thumbnails of presets).
- `figure/`: scatter plot; X, Y, colour from `columns.yml`, filters from
  `filters.yml`, presets from `presets.yml` (`?preset=`), a "Plot" button;
  data from a SQLite database made by `import_db.py` from the archive's CSV.
- `detail/`: JSmol view of the CIF, table of the COF's properties, "Download
  json" / "Download cif".

## Now

A static Vite/React site (routes `/`, `/figure?preset=`, `/detail/<name>`).

- **Data**: `scripts/prepareForFrontend.py` reads the archive's tarballs and
  writes `public/data/` (no database): `table.json` for the scatter plot and
  16384 gzipped shards of per-COF properties + the archive's CIF (see
  README). 69,840 COFs, 16,385 files, 1.2 GB (the CIF text alone was 3.5 GB),
  about 1 minute; not committed, unlike the sibling apps' smaller data.
  Converting the CIFs to matsci-parse JSON would save only ~13% and lose what
  matsci-parse does not read (labels, charges, bonds), so they stay CIFs.
- **Plot**: plotly `scattergl` (WebGL). Filters apply live (no "Plot"
  button). Same defaults as the old app: colours of the bond types from
  `figure/config.py`, Viridis with a colorbar for numbers, hover with name, x,
  y, colour, click opens the COF.
- **COF page**: the CIF parsed with matsci-parse `fromCIF` and shown with
  mc-react-structure-visualizer instead of JSmol; a download menu over it
  (mc-react-library `DownloadDropdown`): "CIF (raw)", the archive's file as it
  is, with everything in it (in other apps' CIFs also partial charges, under
  program-specific tags, labels and bonds), and XSF, XYZ, VASP written by
  matsci-parse (cell, elements and positions only); the property table
  (sorted, units in the key) and its JSON download.
- **Old URLs** of the section (`/discover/cofs/...`) are redirected outside
  the app; here `/select-figure` goes to `/` and `/detail?name=` to
  `/detail/<name>`.
- **`src/common/`** is generic and config-driven for the four sibling apps;
  `src/CofsExplorer/config.js` holds this app's YAML as JS.

## Behaviour kept from the old app

- A range filter at its full range, or a checkbox filter with everything
  selected, does not filter, so values outside the range of `columns.yml`
  would not be cut off by an untouched slider (none are, for the five filters).
- A preset sets x, y, clr and some filters; every other filter is reset to the
  full range; `clr` is inherited from `default` (here also x and y, if ever
  missing).
- A preset's filters on columns that have no filter are ignored, as the old
  `load_preset` did.

## Quirks of the old config: resolved

Documented in the docstring of `scripts/prepareForFrontend.py`:

- Preset `10b` (a duplicate YAML key), presets `12a`–`12d` (colour by `net`,
  never an option; `12d` a copy of `12a`) and the uptake filters of `7a`/`7b`
  (on a column without a filter, never applied): dropped.
- Methane uptake: `columns.yml` said mol/kg, the old app plotted the v STP/v
  values (its 7a figure goes to 200): labelled v STP/v.
- Caption of `3a`: "Surface area vs Density (2d COFs)", what it plots.
- The sphere diameters (in the CSV, not in `columns.yml`): axes.
- Floats rounded to 5 decimal places (the smallest non-zero value is 0.0025);
  the macOS `._properties.csv` in `properties.tgz` is skipped.

## Left out

- The "Plot" button and the "doubly selected" warning (X, Y, colour equal).
- Bokeh's toolbar: plotly's own (zoom, pan, reset, camera) replaces it.
- JSmol (replaced by mc-react-structure-visualizer: other controls, no JSmol
  menu), the Dockerfile and sqlite backend (kept in `legacy-python/`).

## Tests

`pnpm test`: `tests/data.test.mjs` (shard hash, also against the Python
function; presets with defaults, inheritance, unknown keys, consistency with
the config; filters, missing values; colours; the plotly figure and colorbar
title wrapping; property rows) and `tests/public-data.test.mjs` (shape of
`public/data/`; three of the archive's CIFs in `tests/fixtures/` stored
unchanged and read by matsci-parse; skipped if the data has not been
generated).

## Open questions

1. "How to cite" links 10.24435/materialscloud:cz-kq, which resolves to the
   CURATED-COFs record (`1xf71-nf390`), not this data (2018.0003/v2,
   `1mb1g-5gm52`). Which DOI / paper should it cite?

## Library notes

- `mc-react-structure-visualizer` uses `eval` (the build warns); with no
  `mc-periodic-table` 0.2 in this app, autowannier's patch is not needed.

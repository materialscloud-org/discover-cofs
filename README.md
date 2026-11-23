# Covalent Organic Frameworks

Interactive exploration of 69,840 in-silico 2D and 3D covalent organic
frameworks (COFs) screened for methane storage: scatter plots of their computed
properties, and a page with the structure and all properties of each COF.
Data: [doi:10.24435/materialscloud:2018.0003/v2](https://doi.org/10.24435/materialscloud:2018.0003/v2)
(Materials Cloud Archive record `1mb1g-5gm52`).

A static single-page app, the port of the Bokeh "discover-cofs" section of
Materials Cloud (the old app is in [`legacy-python/`](legacy-python/); data
decisions are documented in `scripts/prepareForFrontend.py`).

## Pages

- **Gallery** (`/`): the default figure and a thumbnail per preset.
- **Plot** (`/figure?preset=<key>`): X, Y and colour (a quantity, or the bond
  type) and the filters (ranges, checkboxes), starting from the preset (`default`
  without `preset`); the plot updates as the filters change. Click on a point
  for its page.
- **COF** (`/detail/<name>`): the 3D structure (matsci-parse and
  mc-react-structure-visualizer) with a download menu in its top-right corner
  (mc-react-library's `DownloadDropdown`: "CIF (raw)", the archive's file as
  it is, and XSF, XYZ, VASP written by matsci-parse), the table of all its
  properties and "Download json".

## Data

`public/data/` is generated, from the original archive files, by one script
(Python standard library only), and is not committed (1.2 GB):

```bash
python3 scripts/prepareForFrontend.py           # about 1 minute, ~4 GB memory
python3 scripts/prepareForFrontend.py --verify  # also check the md5 of raw/ against the archive
```

It downloads `properties.tgz` and `structures.tgz` into `raw/` if they are
missing (from the archive API, md5 checked), reads them without extracting,
replaces `public/data/` and checks the result (row count, every shard there,
a sample read in full, file sizes under Cloudflare Pages' 25 MiB, fewer than
20,000 files).

- `table.json` (9 MiB): for the scatter plot, one entry per COF: names, the
  numeric columns (5 decimals), and the list columns (`bond_type`,
  `dimensions`) as codes with a list of values.
- `details/<xxx>.json.gz` (16384 gzipped shards): per COF, all
  53 CSV properties (keys `<column> [<unit>]`) and the archive's CIF as it is.
  The app unpacks a shard with the browser's `DecompressionStream` and parses
  the CIF with matsci-parse (`fromCIF`). A COF is in shard
  `fnv1a32(utf8(name)) % 16384` (hex), the same function in
  `scripts/prepareForFrontend.py` (`shard_of`) and `src/common/data.js`.

The columns keep the naming of the old `import_db.py` (`[unit]` removed,
spaces to `_`), which `src/CofsExplorer/config.js` uses.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173 (needs public/data/, see Data)
pnpm test       # node --test tests/*.test.mjs
pnpm lint
pnpm build      # static site in dist/ (copies public/data/: 1.2 GB)
```

Deployment: Cloudflare Pages, `pnpm build`, output `dist/`; Pages serves
`index.html` for the app's paths by itself, and `public/_redirects` sends the
old `/select-figure` to `/`.

## Layout

```
src/
  App.jsx               header and routes (react-router)
  CofsExplorer/         this app: config.js (columns, filters, presets, colours,
                        captions), Pages.jsx
  common/               generic, config-driven (copy it for the sibling apps):
                        data.js (shards, filters, presets, colours; pure),
                        figure.js (plotly figure; pure), Explorer, ScatterPlot
                        (plotly scattergl), CheckboxGroup,
                        Gallery, DetailView (StructureView, PropertyTable,
                        download buttons), queries.js, api.js, Common.jsx
public/images/          the preset thumbnails
public/data/            generated, not committed (see Data)
raw/                    the archive files (not committed)
scripts/prepareForFrontend.py
tests/                  data.test.mjs (logic), public-data.test.mjs (shape of public/data/)
legacy-python/          the original Bokeh app (reference)
```

To make another app of the family: copy `src/common/`, `src/queryClient.js`,
`src/main.jsx`, `src/App.jsx`, `vite.config.js`, the package files, write its
`config.js` and `scripts/prepareForFrontend.py` (columns, `SHARDS`).

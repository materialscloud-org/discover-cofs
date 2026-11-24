# Covalent Organic Frameworks

Interactive exploration of 69,840 in-silico 2D and 3D covalent organic
frameworks (COFs) screened for methane storage: scatter plots of their computed
properties, and a page with the structure and all properties of each COF.
Data: [doi:10.24435/materialscloud:2018.0003/v2](https://doi.org/10.24435/materialscloud:2018.0003/v2)
(Materials Cloud Archive record `1mb1g-5gm52`).

A static single-page app, the port of the Bokeh "discover-cofs" section of
Materials Cloud (the old app is in [`legacy-python/`](legacy-python/); data
decisions are documented in `scripts/prepareForFrontend.py`).

## Development

This app was migrated to a single page app, with the intention of providing users a serverless way to explore this data.

The legacy software is saved in "legacy-python" with tools to containerize, however these may be out of date.

If you would like to launch the Single Page App locally:

```bash
pnpm install
python3 scripts/prepareForFrontend.py # about 1 minute, ~4 GB memory
pnpm dev        # http://localhost:5173 (needs public/data/, see Data)
pnpm test       # node --test tests/*.test.mjs
pnpm lint
pnpm build      # static site in dist/ (copies public/data/: 1.2 GB)
```

## Deployment

The app is currently deployed by hand to Cloudflare Pages with wrangler with no CI/CD, so changes have to be pushed to materialscloud cloudflare. This is because of the sharding strategy used and that the data is too large for git and comes from the Materials Cloud Archive.

```bash
python3 scripts/prepareForFrontend.py  # if data is missing
pnpm build
npx wrangler pages deploy dist --project-name discover-cofs
```

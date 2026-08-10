# PYCAD Interactive Implant Demo Portal

Illustrative sales and education demo module for spine implant manufacturing partnerships. Built with Vite, React, TypeScript, React Three Fiber, and a managed embed platform.

**Not for clinical use.**

## Quick Start

```bash
npm install
npm --prefix server install
npm run dev:embed
```

- App dev server: `http://localhost:5179`
- Embed API + static server: `http://localhost:8787`

## Embed snippet (customer sites)

```html
<div data-pycad-embed="emb_pycad_staging" data-layout="section"></div>
<script async src="https://implant-demo.pycad.co/embed/v1.js"></script>
```

See [docs/customer-embed-guide.md](docs/customer-embed-guide.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run dev:embed` | API server + Vite dev |
| `npm run build` | Production build (app + loader) |
| `npm run optimize:models` | GLB optimization pipeline |
| `npm run check:budgets` | Validate artifact size budgets |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright embed tests |
| `npm run start:server` | Run built embed server |

## Staging deployment (GCP)

```bash
cp deploy/gcp/.env.example deploy/gcp/.env
deploy/gcp/run.bat --build-push
```

See [docs/gcp-staging.md](docs/gcp-staging.md).

## pycad.co test page

Use [../pycad-website/implant-demo-test-page.html](../pycad-website/implant-demo-test-page.html) on:

`https://pycad.co/resources/implant-demo-test/`

## Disclaimer

Non-clinical demonstration only.

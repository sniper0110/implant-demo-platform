# GCP staging deployment

Deploy the managed embed stack to Compute Engine with TLS via Caddy.

## Prerequisites

- `gcloud` authenticated to project `pycad-dicom-viewer`
- Docker Hub credentials (for private images)
- DNS `A` record: `implant-demo.pycad.co` → reserved static IP
- Firewall rule `pycad-implant-demo-http` allowing TCP 80, 443, 22

## Configure

```bash
cp deploy/gcp/.env.example deploy/gcp/.env
# edit deploy/gcp/.env
```

## Preflight

```bash
deploy/gcp/run.bat --preflight-only
```

## Build, push, deploy

```bash
deploy/gcp/run.bat --build-push --machine-type e2-standard-2
```

This:

1. Builds and pushes `nourislampycad/implant-demo-platform:latest`
2. Creates a persistent VM tagged `pycad-implant-demo-deploy`
3. Starts Docker Compose stack: PostgreSQL, Fastify app, Caddy TLS
4. Waits for `https://implant-demo.pycad.co/health`

## Verify

```bash
curl https://implant-demo.pycad.co/health
curl https://implant-demo.pycad.co/api/config/emb_pycad_staging
curl -I https://implant-demo.pycad.co/embed/v1.js
```

Open iframe directly:

`https://implant-demo.pycad.co/e/emb_pycad_staging`

## pycad.co test page

Create an unlisted WordPress page at `/resources/implant-demo-test/` with:

```html
<h2>Section embed</h2>
<div data-pycad-embed="emb_pycad_staging" data-layout="section" style="min-height:560px"></div>

<h2>Full viewport embed</h2>
<div data-pycad-embed="emb_pycad_staging" data-layout="full" style="height:80vh"></div>

<script async src="https://implant-demo.pycad.co/embed/v1.js"></script>
```

Settings:

- Template: `elementor_header_footer`
- Rank Math: noindex, nofollow
- Exclude from menus and sitemap

## Rollback

Change `release_id` for embed `emb_pycad_staging` in PostgreSQL, or redeploy a previous Docker tag. Customer snippets do not change.

## Teardown

```bash
deploy/gcp/leak_check.sh
gcloud compute instances delete <vm-name> --zone=us-central1-a --quiet
```

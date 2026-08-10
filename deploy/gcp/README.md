# GCP deploy — implant-demo-platform

Same workflow as `pycad-dicom-viewer-client/deploy/gcp`, adapted for the managed embed stack.

## Quick start

```bash
cp deploy/gcp/.env.example deploy/gcp/.env
deploy/gcp/run.bat --preflight-only
deploy/gcp/run.bat --build-push --machine-type e2-standard-2
```

## What gets deployed

- Compute Engine VM (persistent, not Spot by default)
- Docker Compose: PostgreSQL + Fastify app + Caddy TLS
- Public URL: `https://implant-demo.pycad.co`

## DNS (required before HTTPS health check passes)

Create an `A` record:

```
implant-demo.pycad.co → <static-external-ip>
```

## Firewall

```bash
gcloud compute firewall-rules create pycad-implant-demo-http \
  --allow=tcp:80,tcp:443,tcp:22 \
  --target-tags=pycad-implant-demo-deploy \
  --source-ranges=0.0.0.0/0 \
  --project=pycad-dicom-viewer
```

## See also

- [docs/gcp-staging.md](../docs/gcp-staging.md)
- [docs/customer-embed-guide.md](../docs/customer-embed-guide.md)

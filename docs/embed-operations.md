# Embed operations

## Release layout

```
/assets/{releaseId}/          # immutable hashed JS/CSS (via Vite build)
/models/                      # versioned GLB assets copied into dist
/embed/v1.js                  # stable loader (short cache TTL)
/e/{embedId}                  # iframe entry with frame-ancestors CSP
/api/config/{embedId}         # public runtime configuration
/health                       # liveness
/ready                        # readiness + release id
```

## Cache headers

| Path | Policy |
|------|--------|
| `/assets/*.{js,css}` | `immutable, max-age=31536000` |
| `/models/*.glb` | `immutable, max-age=31536000` (when filename is versioned) |
| `/embed/v1.js` | `max-age=3600, stale-while-revalidate=86400` |
| `/api/config/*` | `max-age=60, stale-while-revalidate=300` |
| `/e/*` | `max-age=60, stale-while-revalidate=300` |

## Rollback

1. Deploy previous Docker image tag to staging/production VM
2. Or update `release_id` in `embed_configs` for affected embed IDs
3. Loader snippet on customer sites remains unchanged

## Database backup

```bash
docker compose -f deploy/gcp/docker-compose.yml exec postgres \
  pg_dump -U pycad pycad_embed > backup.sql
```

## Logs

```bash
gcloud compute instances get-serial-port-output <vm> --zone=us-central1-a
# VM log: /var/log/pycad-implant-startup.log
docker compose logs -f app
```

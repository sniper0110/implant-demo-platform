#!/usr/bin/env bash
# Rebuild, push, and hot-reload the staging VM without creating a new instance.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VM_NAME="${VM_NAME:-pycad-implant-demo-20260809-193006}"
ZONE="${ZONE:-us-central1-a}"
PROJECT="${GCP_PROJECT_ID:-pycad-dicom-viewer}"
IMAGE="${DOCKER_IMAGE:-us-central1-docker.pkg.dev/pycad-dicom-viewer/implant-demo/platform:latest}"
STAGING_HOST="${STAGING_HOST:-implant-demo.pycad.co}"

cd "$ROOT"

echo "==> Building image $IMAGE"
docker build -t "$IMAGE" .

echo "==> Pushing image"
docker push "$IMAGE"

echo "==> Restarting app container on $VM_NAME"
gcloud compute ssh "$VM_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT" \
  --command="sudo bash -s" <<EOF
set -euo pipefail
docker pull '$IMAGE'
docker rm -f pycad-implant-app 2>/dev/null || true
docker run -d --name pycad-implant-app \
  --restart unless-stopped \
  -e PORT=8080 \
  -e HOST=0.0.0.0 \
  -e PUBLIC_BASE_URL='https://${STAGING_HOST}' \
  -e ASSET_BASE_URL='https://${STAGING_HOST}' \
  -e RELEASE_ID=v1 \
  -p 127.0.0.1:8080:8080 \
  '$IMAGE'
sleep 2
curl -fsS http://127.0.0.1:8080/health
EOF

echo "==> Verify CSP header"
curl -fsSI "https://${STAGING_HOST}/e/emb_pycad_staging" | tr -d '\r' | grep -i content-security-policy || true

echo "Done. Hard-refresh https://${STAGING_HOST}/e/emb_pycad_staging on your phone."

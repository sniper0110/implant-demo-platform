#!/usr/bin/env bash
#
# Entrypoint for GCP client deployment. Provisions a Compute Engine VM,
# waits for the nginx SPA to respond on port 8080, and prompts about
# tearing the VM down.
#
#   ./deploy/gcp/run.sh                  # interactive machine picker
#   ./deploy/gcp/run.sh --build-push
#   ./deploy/gcp/run.sh --preflight-only
#   ./deploy/gcp/run.sh --machine-type e2-standard-2 --spot
#
# Requires: python3 >= 3.8, gcloud CLI on PATH.

set -euo pipefail

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$REPO_ROOT"

PY="${PYTHON:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "[gcp] ERROR: '$PY' not found on PATH" >&2
  exit 1
fi

exec "$PY" "$REPO_ROOT/deploy/gcp/gcp_deploy.py" "$@"

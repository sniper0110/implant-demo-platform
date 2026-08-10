#!/usr/bin/env bash
#
# Safety net: list every Compute Engine VM tagged `pycad-implant-demo-deploy`.
#
#   ./deploy/gcp/leak_check.sh
#   ./deploy/gcp/leak_check.sh --delete-all
#   ./deploy/gcp/leak_check.sh --delete <vm>
#   ./deploy/gcp/leak_check.sh --stop-all

set -euo pipefail

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

if [[ -f "$REPO_ROOT/deploy/gcp/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$REPO_ROOT/deploy/gcp/.env"
  set +a
fi

PROJECT="${GCP_PROJECT_ID:-}"
if [[ -z "$PROJECT" ]]; then
  PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
fi
if [[ -z "$PROJECT" || "$PROJECT" == "(unset)" ]]; then
  echo "[gcp] ERROR: no project set. Put GCP_PROJECT_ID in deploy/gcp/.env." >&2
  exit 1
fi

mode="list"
target=""
case "${1:-}" in
  --delete-all) mode="delete-all" ;;
  --stop-all)   mode="stop-all"   ;;
  --delete)     mode="delete-one"; target="${2:-}";;
  --help|-h)
    sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  "" )           mode="list" ;;
  *) echo "[gcp] unknown arg: $1" >&2; exit 1 ;;
esac

TAG="pycad-implant-demo-deploy"
echo "[gcp] project=$PROJECT"
echo "[gcp] scanning for instances tagged '$TAG'..."

mapfile -t rows < <(
  gcloud compute instances list \
    --project="$PROJECT" \
    --filter="tags.items:$TAG AND status:(RUNNING TERMINATED STOPPING SUSPENDED PROVISIONING STAGING)" \
    --format='value(name,zone,machineType,status,creationTimestamp,networkInterfaces[0].accessConfigs[0].natIP)'
)

if [[ ${#rows[@]} -eq 0 ]]; then
  echo "[gcp] no client-deploy VMs found. You're clean."
  exit 0
fi

printf '\n%-46s %-22s %-22s %-12s %-22s %s\n' NAME ZONE MACHINE-TYPE STATUS CREATED EXTERNAL-IP
printf -- '------------------------------------------------------------------------------------------------------------------------------------------------------\n'
for row in "${rows[@]}"; do
  IFS=$'\t' read -r name zone mt status created ip <<< "$row"
  zone="${zone##*/}"
  mt="${mt##*/}"
  printf '%-46s %-22s %-22s %-12s %-22s %s\n' \
    "${name:-?}" "${zone:-?}" "${mt:-?}" "${status:-?}" "${created:0:19}" "${ip:--}"
done
echo

case "$mode" in
  list)
    echo "[gcp] re-run with --delete-all (irreversible) or --stop-all to clean up."
    ;;
  delete-all)
    echo "[gcp] about to DELETE all the VMs above. This is irreversible."
    read -r -p "[gcp] type 'yes' to proceed: " confirm
    if [[ "$confirm" != "yes" ]]; then
      echo "[gcp] aborted."
      exit 1
    fi
    for row in "${rows[@]}"; do
      IFS=$'\t' read -r name zone _mt _status _created _ip <<< "$row"
      zone="${zone##*/}"
      echo "[gcp] deleting $name in $zone..."
      gcloud compute instances delete "$name" \
        --zone="$zone" --project="$PROJECT" --quiet || true
    done
    echo "[gcp] done."
    ;;
  stop-all)
    for row in "${rows[@]}"; do
      IFS=$'\t' read -r name zone _mt status _created _ip <<< "$row"
      zone="${zone##*/}"
      if [[ "$status" != "RUNNING" ]]; then
        echo "[gcp] skipping $name (status=$status)"
        continue
      fi
      echo "[gcp] stopping $name in $zone..."
      gcloud compute instances stop "$name" \
        --zone="$zone" --project="$PROJECT" --quiet || true
    done
    echo "[gcp] done."
    ;;
  delete-one)
    if [[ -z "$target" ]]; then
      echo "[gcp] --delete requires a VM name." >&2
      exit 1
    fi
    found=""
    for row in "${rows[@]}"; do
      IFS=$'\t' read -r name zone _mt _status _created _ip <<< "$row"
      if [[ "$name" == "$target" ]]; then
        zone="${zone##*/}"
        echo "[gcp] deleting $name in $zone..."
        gcloud compute instances delete "$name" \
          --zone="$zone" --project="$PROJECT" --quiet || true
        found="1"
        break
      fi
    done
    if [[ -z "$found" ]]; then
      echo "[gcp] no VM named $target in the tagged list." >&2
      exit 1
    fi
    ;;
esac

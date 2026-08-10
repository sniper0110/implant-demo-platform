#!/usr/bin/env bash
#
# Compute Engine startup script for implant-demo-platform staging stack.
set -euxo pipefail
exec > >(tee -a /var/log/pycad-implant-startup.log) 2>&1

echo "[pycad-implant] startup script starting at $(date -Iseconds)"

meta() {
  curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1"
}

meta_optional() {
  curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" \
    2>/dev/null || true
}

DOCKER_IMAGE="$(meta docker-image)"
STAGING_HOST="$(meta_optional staging-host)"
STAGING_EMAIL="$(meta_optional staging-email)"
POSTGRES_PASSWORD="$(meta_optional postgres-password)"

if [[ -z "${STAGING_HOST}" ]]; then
  STAGING_HOST="implant-demo.pycad.co"
fi
if [[ -z "${STAGING_EMAIL}" ]]; then
  STAGING_EMAIL="ops@pycad.co"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y docker.io curl ca-certificates gnupg

systemctl enable docker
systemctl start docker

for _i in {1..30}; do
  if docker info >/dev/null 2>&1; then break; fi
  sleep 2
done

if [[ "${DOCKER_IMAGE}" == *"-docker.pkg.dev/"* ]]; then
  echo "[pycad-implant] configuring Artifact Registry docker auth..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    | gpg --dearmor -o /etc/apt/keyrings/cloud.google.gpg
  echo "deb [signed-by=/etc/apt/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
    > /etc/apt/sources.list.d/google-cloud-sdk.list
  apt-get update -qq
  apt-get install -y google-cloud-cli
  REG_HOST="${DOCKER_IMAGE%%/*}"
  gcloud auth configure-docker "${REG_HOST}" --quiet
fi

mkdir -p /opt/pycad-implant
cd /opt/pycad-implant

cat > Caddyfile <<EOF
{
  email ${STAGING_EMAIL}
}

${STAGING_HOST} {
  encode gzip zstd
  reverse_proxy 127.0.0.1:8080
}

:80 {
  encode gzip zstd
  reverse_proxy 127.0.0.1:8080
}
EOF

docker rm -f pycad-implant-app pycad-implant-caddy 2>/dev/null || true

attempts=0
until docker pull "${DOCKER_IMAGE}"; do
  attempts=$((attempts + 1))
  if (( attempts >= 5 )); then
    echo "[pycad-implant] docker pull failed" >&2
    exit 1
  fi
  sleep 10
done

docker run -d --name pycad-implant-app \
  --restart unless-stopped \
  -e PORT=8080 \
  -e HOST=0.0.0.0 \
  -e PUBLIC_BASE_URL="https://${STAGING_HOST}" \
  -e ASSET_BASE_URL="https://${STAGING_HOST}" \
  -e RELEASE_ID=v1 \
  -p 127.0.0.1:8080:8080 \
  "${DOCKER_IMAGE}"

docker run -d --name pycad-implant-caddy \
  --restart unless-stopped \
  --network host \
  -v /opt/pycad-implant/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:2.8-alpine

echo "[pycad-implant] stack started; HTTP on port 80, TLS for ${STAGING_HOST} when DNS resolves"

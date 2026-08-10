# Deploy implant-demo-platform to GCP staging (implant-demo.pycad.co)
# Prerequisites: Docker Desktop running, gcloud auth login, DNS A record configured

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> Checking gcloud auth..."
& gcloud auth list 2>&1 | Out-Host
python deploy/gcp/gcp_deploy.py --preflight-only
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Fix: run  gcloud auth login  then retry." -ForegroundColor Yellow
    exit 1
}

Write-Host "==> Building and pushing Docker image..."
python deploy/gcp/gcp_deploy.py --build-push --keep --no-wait
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "After deploy completes, add DNS in Hostinger:" -ForegroundColor Cyan
Write-Host "  Type: A"
Write-Host "  Name: implant-demo"
Write-Host "  Value: 34.58.140.68  (static IP: pycad-implant-demo-ip)"
Write-Host ""
Write-Host "Then verify:"
Write-Host "  curl https://implant-demo.pycad.co/health"
Write-Host "  curl https://implant-demo.pycad.co/api/config/emb_pycad_staging"

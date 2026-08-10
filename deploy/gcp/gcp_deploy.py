#!/usr/bin/env python3
"""GCP deploy driver for pycad-dicom-viewer-client.

Provisions a Compute Engine VM (CPU-only, nginx SPA on port 8080),
waits for HTTP, prints the viewer URL, and prompts for teardown.

Typical use::

    ./deploy/gcp/run.sh
    ./deploy/gcp/run.sh --build-push
    ./deploy/gcp/run.sh --machine-type e2-standard-2 --spot
    ./deploy/gcp/run.sh --preflight-only
"""
from __future__ import annotations

import argparse
import base64
import datetime as _dt
import os
import shlex
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import _cloud_common as _cc  # noqa: E402
import _shared  # noqa: E402


DEFAULT_REGION = "us-central1"
DEFAULT_ZONE = "us-central1-a"
DEFAULT_MACHINE_TYPE = "e2-standard-2"
DEFAULT_BOOT_DISK_GB = 30
DEFAULT_BOOT_DISK_TYPE = "pd-balanced"
DEFAULT_IMAGE_FAMILY = "ubuntu-2204-lts"
DEFAULT_IMAGE_PROJECT = "ubuntu-os-cloud"
DEFAULT_VM_NAME_PREFIX = "pycad-implant-demo"
DEFAULT_FIREWALL_RULE_NAME = "pycad-implant-demo-http"
DEFAULT_VM_TAG = "pycad-implant-demo-deploy"
DEFAULT_HTTP_PORT = 80
DEFAULT_TEARDOWN = "leave"

VM_RUNNING_TIMEOUT_S = 240
VM_POLL_INTERVAL_S = 5
HTTP_READY_TIMEOUT_S = int(
    os.environ.get("DEPLOY_GCP_HTTP_TIMEOUT_S") or _cc.HTTP_READY_TIMEOUT_S
)

ZONE_EXHAUSTED_HINTS = (
    "ZONE_RESOURCE_POOL_EXHAUSTED",
    "ZONE_RESOURCE_POOL_EXHAUSTED_WITH_DETAILS",
    "does not have enough resources",
)

MACHINE_PRESETS: List[Tuple[str, str, str]] = [
    ("1", "Dev / smoke test", "e2-micro"),
    ("2", "Small", "e2-small"),
    ("3", "Default (recommended)", "e2-standard-2"),
    ("4", "Medium", "e2-standard-4"),
    ("5", "Large", "n1-standard-4"),
]

# us-central1 on-demand $/hr (approximate, 2026).
_PRICE_TABLE: Dict[str, float] = {
    "e2-micro": 0.0084,
    "e2-small": 0.017,
    "e2-medium": 0.034,
    "e2-standard-2": 0.067,
    "e2-standard-4": 0.134,
    "e2-standard-8": 0.268,
    "n1-standard-4": 0.19,
    "n1-standard-8": 0.38,
}
SPOT_PRICE_MULTIPLIER = 0.35

VITE_BUILD_ARG_KEYS = (
    "VITE_RELEASE_ID",
)


def _estimate_hourly_cost(machine_type: str, spot: bool) -> Optional[float]:
    on_demand = _PRICE_TABLE.get(machine_type)
    if on_demand is None:
        return None
    return on_demand * SPOT_PRICE_MULTIPLIER if spot else on_demand


def _preflight_check(label: str, ok: bool, detail: str = "") -> bool:
    mark = "OK" if ok else "FAIL"
    line = f"  [{mark}] {label}"
    if detail:
        line += f"  ({detail})"
    print(line, flush=True)
    return ok


def preflight() -> Dict[str, Any]:
    _shared.log("preflight: checking gcloud + project + APIs + firewall...")

    found = _shared.find_gcloud_executable()
    if not _preflight_check(
        "gcloud CLI",
        found is not None,
        found or "install from https://cloud.google.com/sdk/docs/install",
    ):
        _shared.die("gcloud is required.")

    try:
        rc, accounts, _err = _shared.gcloud(
            "auth", "list", check=False, timeout_s=20.0,
        )
    except RuntimeError as exc:
        _shared.die(f"`gcloud auth list` failed: {exc}")
    active = ""
    if rc == 0 and isinstance(accounts, list):
        for a in accounts:
            if isinstance(a, dict) and a.get("status", "").upper() == "ACTIVE":
                active = a.get("account", "")
                break
    if not _preflight_check(
        "authenticated gcloud account",
        bool(active),
        active or "run `gcloud auth login`",
    ):
        _shared.die("no active gcloud account.")

    pid = _shared.project_id()
    _preflight_check("project id", True, pid)
    try:
        rc, proj, _err = _shared.gcloud(
            "projects", "describe", pid, check=False, timeout_s=30.0,
        )
    except RuntimeError as exc:
        _shared.die(f"`gcloud projects describe {pid}` failed: {exc}")
    if not _preflight_check(
        "project visible to this account",
        rc == 0 and isinstance(proj, dict) and proj.get("projectId") == pid,
        f"projectId={pid}" if rc == 0 else "no permission or wrong id",
    ):
        _shared.die(f"cannot see project {pid}.")

    try:
        rc, services, _err = _shared.gcloud(
            "services", "list", "--enabled",
            project=pid, check=False, timeout_s=30.0,
        )
    except RuntimeError as exc:
        _shared.die(f"`gcloud services list --enabled` failed: {exc}")
    enabled = set()
    if rc == 0 and isinstance(services, list):
        for s in services:
            if isinstance(s, dict):
                raw = s.get("config", {}).get("name") if isinstance(s.get("config"), dict) else s.get("name")
                if raw and "/" in raw:
                    raw = raw.rsplit("/", 1)[-1]
                if raw:
                    enabled.add(raw)
    compute_ok = "compute.googleapis.com" in enabled
    if not _preflight_check(
        "Compute Engine API enabled",
        compute_ok,
        "enabled" if compute_ok else "missing compute.googleapis.com",
    ):
        _shared.die(
            f"enable Compute Engine API:\n"
            f"  gcloud services enable compute.googleapis.com --project={pid}"
        )

    rule_name = DEFAULT_FIREWALL_RULE_NAME
    try:
        rc, rule, _err = _shared.gcloud(
            "compute", "firewall-rules", "describe", rule_name,
            project=pid, check=False, timeout_s=20.0,
        )
    except RuntimeError:
        rc, rule = -1, None
    rule_ok = (
        rc == 0
        and isinstance(rule, dict)
        and DEFAULT_VM_TAG in (rule.get("targetTags") or [])
    )
    if not _preflight_check(
        f"firewall rule `{rule_name}`",
        rule_ok,
        f"target tag `{DEFAULT_VM_TAG}` present" if rule_ok else "missing or misconfigured",
    ):
        _shared.warn(
            f"create the rule with:\n"
            f"  gcloud compute firewall-rules create {rule_name} \\\n"
            f"      --allow=tcp:80,tcp:443,tcp:22 \\\n"
            f"      --target-tags={DEFAULT_VM_TAG} \\\n"
            f"      --source-ranges=0.0.0.0/0 \\\n"
            f"      --project={pid}"
        )

    key_path = os.environ.get("DEPLOY_GCP_SSH_KEY_PATH", "").strip()
    if key_path:
        priv = Path(key_path).expanduser()
        pub = Path(str(priv) + ".pub") if not priv.suffix else priv.with_suffix(priv.suffix + ".pub")
        _preflight_check(
            f"SSH private key {priv}",
            priv.is_file(),
            "found" if priv.is_file() else "not found",
        )
        _preflight_check(
            f"SSH public key {pub}",
            pub.is_file(),
            "found" if pub.is_file() else "not found (cannot inject into VM metadata)",
        )
    else:
        _preflight_check(
            "SSH key configured",
            False,
            "DEPLOY_GCP_SSH_KEY_PATH unset (optional; set BENCH_GCP_SSH_KEY_PATH in bench/gcp/.env)",
        )

    return {"project_id": pid, "active_account": active, "firewall_rule_present": rule_ok}


def _read_ssh_pub_key(key_path: str) -> Optional[str]:
    priv = Path(key_path).expanduser()
    pub = Path(str(priv) + ".pub") if priv.suffix == "" else priv.with_suffix(priv.suffix + ".pub")
    if not pub.is_file():
        return None
    text = pub.read_text(encoding="utf-8").strip()
    return text or None


def _zones_in_region(region: str, project: str) -> List[str]:
    try:
        rc, data, _err = _shared.gcloud(
            "compute", "zones", "list",
            f"--filter=region:({region})",
            project=project, check=False, timeout_s=20.0,
        )
    except RuntimeError:
        return []
    if rc != 0 or not isinstance(data, list):
        return []
    return [z["name"] for z in data if isinstance(z, dict) and z.get("name")]


def _build_create_args(
    *,
    name: str,
    zone: str,
    machine_type: str,
    boot_disk_gb: int,
    boot_disk_type: str,
    image_family: str,
    image_project: str,
    spot: bool,
    metadata: Dict[str, str],
    metadata_from_file: Dict[str, Path],
    project: str,
) -> List[str]:
    args: List[str] = [
        "compute", "instances", "create", name,
        f"--project={project}",
        f"--zone={zone}",
        f"--machine-type={machine_type}",
        f"--image-family={image_family}",
        f"--image-project={image_project}",
        f"--boot-disk-size={boot_disk_gb}GB",
        f"--boot-disk-type={boot_disk_type}",
        f"--tags={DEFAULT_VM_TAG}",
    ]
    if spot:
        args += [
            "--provisioning-model=SPOT",
            "--instance-termination-action=DELETE",
        ]
    if metadata:
        joined = ",".join(f"{k}={v}" for k, v in metadata.items())
        args.append(f"--metadata={joined}")
    if metadata_from_file:
        joined = ",".join(f"{k}={v}" for k, v in metadata_from_file.items())
        args.append(f"--metadata-from-file={joined}")
    return args


def create_vm(
    *,
    name: str,
    region: str,
    zone: str,
    machine_type: str,
    boot_disk_gb: int,
    boot_disk_type: str,
    image_family: str,
    image_project: str,
    spot: bool,
    docker_image: str,
    http_port: int,
    ssh_user: str,
    ssh_pub_key: Optional[str],
    project: str,
    repo_root: Path,
    docker_registry_username: Optional[str] = None,
    docker_registry_password: Optional[str] = None,
    dry_run: bool = False,
) -> Tuple[str, str]:
    startup_path = repo_root / "deploy" / "gcp" / "startup_script.sh"
    if not startup_path.is_file():
        _shared.die(f"missing startup script: {startup_path}")

    metadata: Dict[str, str] = {
        "docker-image": docker_image,
        "http-port": str(http_port),
        "staging-host": os.environ.get("STAGING_HOST", "implant-demo.pycad.co"),
        "staging-email": os.environ.get("STAGING_EMAIL", "ops@pycad.co"),
        "postgres-password": os.environ.get("POSTGRES_PASSWORD", "pycad_embed_staging_change_me"),
        "google-logging-enabled": "true",
    }
    if ssh_pub_key:
        metadata["ssh-keys"] = f"{ssh_user}:{ssh_pub_key}"

    if docker_registry_password:
        if not (docker_registry_username or "").strip():
            _shared.die(
                "DEPLOY_DOCKER_REGISTRY_PASSWORD is set but "
                "DEPLOY_DOCKER_REGISTRY_USERNAME is empty."
            )
        _shared.warn(
            "passing Docker registry credentials via instance metadata "
            "(readable by anyone who can describe the VM)."
        )
        metadata["docker-registry-username"] = docker_registry_username.strip()
        metadata["docker-registry-password-b64"] = base64.b64encode(
            docker_registry_password.encode("utf-8")
        ).decode("ascii")

    metadata_from_file = {"startup-script": startup_path}

    tried_zones: List[str] = []
    candidate_zones = [zone]
    zone_index = 0

    while True:
        target_zone = candidate_zones[zone_index]
        tried_zones.append(target_zone)
        args = _build_create_args(
            name=name,
            zone=target_zone,
            machine_type=machine_type,
            boot_disk_gb=boot_disk_gb,
            boot_disk_type=boot_disk_type,
            image_family=image_family,
            image_project=image_project,
            spot=spot,
            metadata=metadata,
            metadata_from_file=metadata_from_file,
            project=project,
        )
        if dry_run:
            _shared.log(
                f"DRY-RUN: would run `{_shared.GCLOUD} {' '.join(shlex.quote(a) for a in args)}`"
            )
            return (name, target_zone)
        _shared.log(
            f"creating VM `{name}` in {target_zone} "
            f"({machine_type}{' SPOT' if spot else ''})..."
        )
        try:
            rc, _data, stderr = _shared.gcloud(
                *args, check=False, parse_json=False,
                capture=True, timeout_s=600.0,
            )
        except RuntimeError as exc:
            _shared.die(f"gcloud create failed: {exc}")

        if rc == 0:
            if stderr:
                for line in stderr.splitlines():
                    _shared.log(f"  {line}")
            return (name, target_zone)

        last_err = stderr or ""
        if any(h in last_err for h in ZONE_EXHAUSTED_HINTS):
            if not candidate_zones[zone_index + 1:]:
                fallback = [
                    z for z in _zones_in_region(region, project)
                    if z not in tried_zones
                ]
                candidate_zones.extend(fallback)
            if zone_index + 1 < len(candidate_zones):
                zone_index += 1
                _shared.warn(
                    f"zone {target_zone} out of stock; trying "
                    f"{candidate_zones[zone_index]} ..."
                )
                continue
            _shared.die(
                f"all zones in {region} are out of stock for {machine_type} "
                f"(tried: {', '.join(tried_zones)}). Try a different region."
            )
        _shared.die(
            f"VM create failed in {target_zone} (rc={rc}). Last error:\n  "
            + (last_err or "(no detail)").replace("\n", "\n  ")
        )


def get_vm(vm_name: str, zone: str, project: str) -> Dict[str, Any]:
    rc, data, _err = _shared.gcloud(
        "compute", "instances", "describe", vm_name,
        f"--zone={zone}", project=project,
        check=False, timeout_s=20.0,
    )
    if rc != 0 or not isinstance(data, dict):
        raise RuntimeError(f"`compute instances describe {vm_name}` (rc={rc})")
    return data


def _external_ip(vm: Dict[str, Any]) -> Optional[str]:
    for nic in vm.get("networkInterfaces") or []:
        if not isinstance(nic, dict):
            continue
        for ac in nic.get("accessConfigs") or []:
            if isinstance(ac, dict) and ac.get("natIP"):
                return str(ac["natIP"])
    return None


def wait_vm_running(
    vm_name: str,
    zone: str,
    project: str,
    timeout_s: int = VM_RUNNING_TIMEOUT_S,
) -> Dict[str, Any]:
    _shared.log(f"waiting for VM {vm_name} in {zone} to reach RUNNING (timeout {timeout_s}s)...")
    deadline = time.time() + timeout_s
    last_status = "?"
    while time.time() < deadline:
        try:
            vm = get_vm(vm_name, zone, project)
        except RuntimeError as exc:
            _shared.warn(f"describe failed: {exc}; retrying")
            time.sleep(VM_POLL_INTERVAL_S)
            continue
        status = str(vm.get("status") or "?")
        if status != last_status:
            _shared.log(f"  status={status}")
            last_status = status
        if status == "RUNNING":
            return vm
        if status in ("TERMINATED", "STOPPED", "STOPPING"):
            _shared.die(f"VM transitioned to {status} during boot.")
        time.sleep(VM_POLL_INTERVAL_S)
    _shared.die(f"VM {vm_name} did not reach RUNNING within {timeout_s}s (last={last_status})")
    return {}


def wait_client_http(url: str, timeout_s: int = HTTP_READY_TIMEOUT_S) -> bool:
    return _cc.wait_for_http_ready(
        url,
        logger=_shared.logger(),
        timeout_s=timeout_s,
        timeout_hint=(
            "The VM is still booting (Docker install + image pull + nginx startup). "
            "Bump DEPLOY_GCP_HTTP_TIMEOUT_S or re-run with --vm-name to reuse the VM."
        ),
    )


def capture_vm_info(
    *,
    vm: Dict[str, Any],
    project: str,
    zone: str,
    region: str,
    machine_type: str,
    boot_disk_gb: int,
    boot_disk_type: str,
    image_family: str,
    image_project: str,
    spot: bool,
    docker_image: str,
    image_digest: Optional[str],
    public_ip: str,
    http_port: int,
    public_url: str,
    ssh_user: str,
) -> Dict[str, Any]:
    cost = _estimate_hourly_cost(machine_type, spot)
    return {
        "provider": "gcp",
        "captured_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "vm_name": vm.get("name"),
        "vm_id": str(vm.get("id") or ""),
        "project_id": project,
        "region": region,
        "zone": zone,
        "machine_type": machine_type,
        "boot_disk_gb": boot_disk_gb,
        "boot_disk_type": boot_disk_type,
        "image_family": image_family,
        "image_project": image_project,
        "docker_image": docker_image,
        "image_digest": image_digest,
        "spot": spot,
        "cost_per_hr_usd": cost,
        "public_url": public_url,
        "public_ip": public_ip,
        "http_port": http_port,
        "ssh": {"host": public_ip, "port": 22, "user": ssh_user},
    }


def teardown(
    vm_name: str,
    zone: str,
    project: str,
    *,
    choice: str,
    keep: bool = False,
    dry_run: bool = False,
) -> None:
    if dry_run:
        _shared.log(f"DRY-RUN: would prompt for teardown of {vm_name}")
        return
    if keep:
        choice = "leave"

    if choice == "prompt":
        print()
        print("[gcp] VM teardown options:")
        print("  [d] delete (removes the VM and boot disk; irreversible)")
        print("  [s] stop   (stops compute; boot disk retained)")
        print("  [l] leave  (VM keeps running; you keep paying full rate)")
        try:
            ans = input("[gcp] choose [d/s/l] (default=d): ").strip().lower() or "d"
        except EOFError:
            ans = "d"
        choice = {"d": "delete", "s": "stop", "l": "leave"}.get(ans, "delete")

    if choice == "delete":
        _shared.log(f"deleting VM {vm_name} in {zone}...")
        try:
            _shared.gcloud(
                "compute", "instances", "delete", vm_name,
                f"--zone={zone}", "--quiet",
                project=project, check=False, parse_json=False,
                capture=False, timeout_s=300.0,
            )
        except RuntimeError as exc:
            _shared.warn(f"delete failed: {exc}")
        else:
            _shared.log("VM deleted.")
    elif choice == "stop":
        _shared.log(f"stopping VM {vm_name} in {zone}...")
        try:
            _shared.gcloud(
                "compute", "instances", "stop", vm_name,
                f"--zone={zone}", "--quiet",
                project=project, check=False, parse_json=False,
                capture=False, timeout_s=300.0,
            )
        except RuntimeError as exc:
            _shared.warn(f"stop failed: {exc}")
        else:
            _shared.log(
                "VM stopped (boot disk still billed; "
                f"`gcloud compute instances start {vm_name} --zone={zone}` to resume)."
            )
    else:
        _shared.log(
            f"leaving VM {vm_name} running. Manual teardown:\n"
            f"  gcloud compute instances delete {vm_name} --zone={zone} "
            f"--project={project} --quiet\n"
            f"  or: ./deploy/gcp/leak_check.sh --delete {vm_name}"
        )


def _collect_vite_build_args() -> Dict[str, str]:
    out: Dict[str, str] = {}
    for key in VITE_BUILD_ARG_KEYS:
        val = os.environ.get(key, "").strip()
        if val:
            out[key] = val
    return out


def interactive_machine_config(
    *,
    default_zone: str,
    default_region: str,
    docker_image: str,
) -> Tuple[str, bool, str, str]:
    """Return (machine_type, spot, zone, region) from the interactive menu."""
    print()
    print("[gcp] Select a machine type:")
    print()
    for num, label, mt in MACHINE_PRESETS:
        cost = _estimate_hourly_cost(mt, spot=False)
        cost_str = f"~${cost:.3f}/hr" if cost is not None else "cost unknown"
        print(f"  [{num}] {label:<28} {mt:<18} ({cost_str})")
    print(f"  [6] Custom                     (enter your own machine type)")
    print()

    try:
        choice = input("[gcp] choice (default=3): ").strip() or "3"
    except EOFError:
        choice = "3"

    machine_type = DEFAULT_MACHINE_TYPE
    if choice == "6":
        try:
            custom = input("[gcp] machine type (e.g. e2-standard-8): ").strip()
        except EOFError:
            custom = ""
        if custom:
            machine_type = custom
        else:
            _shared.warn(f"empty custom type; using {DEFAULT_MACHINE_TYPE}")
    else:
        matched = False
        for num, _label, mt in MACHINE_PRESETS:
            if choice == num:
                machine_type = mt
                matched = True
                break
        if not matched:
            _shared.warn(f"unknown choice {choice!r}; using {DEFAULT_MACHINE_TYPE}")

    try:
        spot_ans = input("[gcp] use Spot VM? (~70% cheaper, can be preempted) [y/N]: ").strip().lower()
    except EOFError:
        spot_ans = "n"
    spot = spot_ans in ("y", "yes")

    region = default_region
    zone = default_zone

    cost = _estimate_hourly_cost(machine_type, spot)
    cost_str = f"${cost:.4f}/hr" if cost is not None else "unknown"
    print()
    print("[gcp] Deployment summary:")
    print(f"  machine type:  {machine_type}")
    print(f"  spot:          {spot}")
    print(f"  zone:          {zone} (region {region})")
    print(f"  docker image:  {docker_image}")
    print(f"  estimated:     {cost_str}")
    print()

    try:
        confirm = input("[gcp] proceed with deployment? [Y/n]: ").strip().lower()
    except EOFError:
        confirm = "y"
    if confirm in ("n", "no"):
        _shared.die("deployment cancelled.")

    return machine_type, spot, zone, region


def _default_repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _parse_args(argv: List[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="gcp-deploy",
        description="Provision a GCP Compute Engine VM and deploy the client SPA.",
    )
    p.add_argument("--project", default=None)
    p.add_argument("--region", default=os.environ.get("GCP_DEFAULT_REGION") or DEFAULT_REGION)
    p.add_argument("--zone", default=os.environ.get("GCP_DEFAULT_ZONE") or DEFAULT_ZONE)
    p.add_argument(
        "--machine-type",
        default=None,
        help="Skip the interactive menu when set.",
    )
    p.add_argument("--boot-disk-gb", type=int, default=DEFAULT_BOOT_DISK_GB)
    p.add_argument("--boot-disk-type", default=DEFAULT_BOOT_DISK_TYPE)
    p.add_argument("--image-family", default=DEFAULT_IMAGE_FAMILY)
    p.add_argument("--image-project", default=DEFAULT_IMAGE_PROJECT)
    p.add_argument("--spot", action="store_true")
    p.add_argument("--http-port", type=int, default=DEFAULT_HTTP_PORT)
    p.add_argument("--vm-name", default=None, help="Reuse an existing VM (skip create).")
    p.add_argument("--ssh-user", default=os.environ.get("DEPLOY_GCP_SSH_USER") or "pycad")
    p.add_argument("--ssh-key-path", default=os.environ.get("DEPLOY_GCP_SSH_KEY_PATH"))
    p.add_argument(
        "--docker-image",
        default=os.environ.get("DEPLOY_DOCKER_IMAGE")
        or "nourislampycad/implant-demo-platform:latest",
    )
    p.add_argument(
        "--build-push",
        action="store_true",
        help="Rebuild and push the client image before provisioning.",
    )
    p.add_argument("--http-timeout-s", type=int, default=HTTP_READY_TIMEOUT_S)
    p.add_argument("--keep", action="store_true", help="Skip teardown prompt; leave VM running.")
    p.add_argument(
        "--teardown",
        choices=("delete", "stop", "leave", "prompt"),
        default=DEFAULT_TEARDOWN,
    )
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--preflight-only", action="store_true")
    p.add_argument(
        "--no-wait",
        action="store_true",
        help="Skip HTTP readiness wait (useful with --dry-run or when debugging).",
    )
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    repo_root = _default_repo_root()
    _shared.load_dotenv(repo_root)

    args = _parse_args(argv if argv is not None else sys.argv[1:])

    if args.preflight_only:
        preflight()
        return 0

    info = preflight()
    project = args.project or info["project_id"]

    machine_type = args.machine_type
    spot = args.spot
    region = args.region
    zone = args.zone

    if machine_type is None and not args.vm_name:
        machine_type, spot, zone, region = interactive_machine_config(
            default_zone=zone,
            default_region=region,
            docker_image=args.docker_image,
        )
    elif machine_type is None:
        machine_type = DEFAULT_MACHINE_TYPE

    docker_image = args.docker_image
    image_digest_val: Optional[str] = None

    if args.build_push:
        if args.vm_name:
            _shared.warn(
                "--build-push is a no-op when --vm-name is set; the existing "
                f"VM {args.vm_name} already pulled its image at boot."
            )
        else:
            build_args = _collect_vite_build_args()
            image_digest_val = _cc.build_and_push_image(
                image_ref=docker_image,
                repo_root=repo_root,
                logger=_shared.logger(),
                build_args=build_args or None,
                dry_run=args.dry_run,
            )

    ssh_key_path = (args.ssh_key_path or "").strip()
    ssh_pub = _read_ssh_pub_key(ssh_key_path) if ssh_key_path else None

    reg_user = os.environ.get("DEPLOY_DOCKER_REGISTRY_USERNAME", "").strip() or None
    reg_pass = os.environ.get("DEPLOY_DOCKER_REGISTRY_PASSWORD", "").strip() or None

    vm_name = args.vm_name
    created = False

    if vm_name:
        _shared.log(f"reusing existing VM: {vm_name}")
        try:
            vm = get_vm(vm_name, zone, project)
        except RuntimeError as exc:
            _shared.die(f"could not describe VM {vm_name}: {exc}")
    else:
        stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%d-%H%M%S")
        vm_name = f"{DEFAULT_VM_NAME_PREFIX}-{stamp}"
        vm_name, zone = create_vm(
            name=vm_name,
            region=region,
            zone=zone,
            machine_type=machine_type,
            boot_disk_gb=args.boot_disk_gb,
            boot_disk_type=args.boot_disk_type,
            image_family=args.image_family,
            image_project=args.image_project,
            spot=spot,
            docker_image=docker_image,
            http_port=args.http_port,
            ssh_user=args.ssh_user,
            ssh_pub_key=ssh_pub,
            project=project,
            repo_root=repo_root,
            docker_registry_username=reg_user,
            docker_registry_password=reg_pass,
            dry_run=args.dry_run,
        )
        created = True
        if args.dry_run:
            _shared.log("DRY-RUN complete.")
            return 0
        vm = wait_vm_running(vm_name, zone, project)

    public_ip = _external_ip(vm) or ""
    if not public_ip:
        _shared.die(f"VM {vm_name} has no external IP.")

    staging_host = os.environ.get("STAGING_HOST", "implant-demo.pycad.co")
    public_url = f"https://{staging_host}/health"
    _shared.log(f"embed URL: https://{staging_host}/")
    _shared.log(f"health URL: {public_url}")

    http_ok = True
    if not args.no_wait and not args.dry_run:
        http_ok = wait_client_http(public_url, timeout_s=args.http_timeout_s)
        if not http_ok:
            _shared.warn(
                "HTTP probe timed out. The VM may still be pulling the image. "
                f"Try opening {public_url} in a browser in a few minutes."
            )

    state_dir = _shared.state_root(repo_root) / vm_name
    vm_info = capture_vm_info(
        vm=vm,
        project=project,
        zone=zone,
        region=region,
        machine_type=machine_type,
        boot_disk_gb=args.boot_disk_gb,
        boot_disk_type=args.boot_disk_type,
        image_family=args.image_family,
        image_project=args.image_project,
        spot=spot,
        docker_image=docker_image,
        image_digest=image_digest_val,
        public_ip=public_ip,
        http_port=args.http_port,
        public_url=public_url,
        ssh_user=args.ssh_user,
    )
    vm_info["http_ready"] = http_ok
    vm_info_path = state_dir / "vm_info.json"
    _cc.write_json(vm_info_path, vm_info)
    _shared.log(f"state written to {vm_info_path}")

    if ssh_pub:
        _shared.log(f"SSH: ssh -i {ssh_key_path} {args.ssh_user}@{public_ip}")

    if created:
        if args.teardown == "prompt":
            teardown(
                vm_name, zone, project,
                choice="prompt",
                keep=args.keep,
                dry_run=args.dry_run,
            )
        elif args.teardown in ("delete", "stop"):
            teardown(
                vm_name, zone, project,
                choice=args.teardown,
                keep=args.keep,
                dry_run=args.dry_run,
            )
        else:
            _shared.log(f"VM left running at {public_url}")
            _shared.log("tear down later with: ./deploy/gcp/leak_check.sh")

    return 0 if http_ok or args.no_wait else 1


if __name__ == "__main__":
    raise SystemExit(main())

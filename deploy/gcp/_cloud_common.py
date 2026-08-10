"""Shared cloud primitives for deploy/gcp/.

Provides logging, dotenv loading, Docker build/push, and HTTP readiness
polling used by gcp_deploy.py.
"""
from __future__ import annotations

import json
import os
import shlex
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence


@dataclass(frozen=True)
class CloudLogger:
    prefix: str

    def log(self, msg: str) -> None:
        print(f"[{self.prefix}] {msg}", flush=True)

    def warn(self, msg: str) -> None:
        print(f"[{self.prefix}] WARN: {msg}", file=sys.stderr, flush=True)

    def die(self, msg: str, code: int = 1) -> None:
        print(f"[{self.prefix}] ERROR: {msg}", file=sys.stderr, flush=True)
        raise SystemExit(code)


_SECRET_KEY_HINTS = ("KEY", "TOKEN", "SECRET", "PASSWORD", "CREDENTIAL")


def mask_secret(value: str) -> str:
    if not value:
        return "<empty>"
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-3:]} (len={len(value)})"


def _looks_secret(key: str) -> bool:
    upper = key.upper()
    return any(hint in upper for hint in _SECRET_KEY_HINTS)


def parse_dotenv(path: Path, *, logger: Optional[CloudLogger] = None) -> Dict[str, str]:
    out: Dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        if logger:
            logger.warn(f"cannot read {path}: {exc}")
        return out
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        if key:
            out[key] = value
    return out


def load_dotenv(
    *,
    env_path: Path,
    allowlist: Sequence[str],
    logger: CloudLogger,
    verbose: bool = True,
) -> None:
    if not env_path.is_file():
        return
    parsed = parse_dotenv(env_path, logger=logger)
    if not parsed:
        return
    loaded: List[str] = []
    for key, value in parsed.items():
        if key not in allowlist:
            continue
        if os.environ.get(key):
            continue
        os.environ[key] = value
        loaded.append(key)
    if loaded and verbose:
        bits: List[str] = []
        for key in loaded:
            val = os.environ[key]
            if _looks_secret(key):
                bits.append(f"{key}={mask_secret(val)}")
            else:
                bits.append(f"{key}={val}")
        logger.log(f"loaded from {env_path}: " + " ".join(bits))


SSH_COMMON_OPTS: List[str] = [
    "-o", "ServerAliveInterval=20",
    "-o", "ServerAliveCountMax=30",
    "-o", "TCPKeepAlive=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "LogLevel=ERROR",
    "-o", "ConnectTimeout=15",
    "-o", "BatchMode=yes",
]


def stage_key_if_needed(key_path: Path, *, logger: CloudLogger) -> Path:
    if not sys.platform.startswith("linux"):
        return key_path
    src_str = str(key_path)
    on_drvfs = (
        src_str.startswith("/mnt/")
        and len(key_path.parts) >= 3
        and len(key_path.parts[2]) == 1
    )
    bad_perms = False
    try:
        mode = key_path.stat().st_mode & 0o777
        if mode & 0o077:
            bad_perms = True
    except OSError:
        pass
    if not on_drvfs and not bad_perms:
        return key_path
    try:
        home = Path.home()
    except Exception:
        logger.warn(f"cannot resolve $HOME to stage ssh key {key_path}; using as-is")
        return key_path
    staging_dir = home / ".ssh"
    if str(staging_dir).startswith("/mnt/"):
        logger.warn(
            f"$HOME ({home}) is on DrvFs too; ssh key staging would not "
            "fix permissions. Use a WSL-native shell ($HOME=/home/<user>)."
        )
        return key_path
    try:
        staging_dir.mkdir(mode=0o700, exist_ok=True)
    except OSError as exc:
        logger.warn(f"cannot create {staging_dir}: {exc}; using key as-is")
        return key_path
    staged = staging_dir / "deploy_gcp_ssh_key_staged"
    src_bytes = key_path.read_bytes()
    needs_write = True
    if staged.exists():
        try:
            if staged.read_bytes() == src_bytes:
                needs_write = False
        except OSError:
            needs_write = True
    if needs_write:
        staged.write_bytes(src_bytes)
        logger.log(f"staged ssh key {key_path} -> {staged} (perms 600)")
    try:
        os.chmod(staged, 0o600)
    except OSError as exc:
        logger.warn(f"chmod 600 {staged} failed: {exc}; ssh may still reject it")
    return staged


def docker_available() -> bool:
    if shutil.which("docker") is None:
        return False
    try:
        proc = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return proc.returncode == 0
    except Exception:
        return False


def image_digest(image_ref: str) -> Optional[str]:
    try:
        proc = subprocess.run(
            [
                "docker",
                "inspect",
                "--format",
                "{{index .RepoDigests 0}}",
                image_ref,
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception:
        return None
    if proc.returncode != 0:
        return None
    out = (proc.stdout or "").strip()
    return out or None


def build_and_push_image(
    *,
    image_ref: str,
    repo_root: Path,
    logger: CloudLogger,
    dockerfile: Optional[Path] = None,
    build_args: Optional[Dict[str, str]] = None,
    dry_run: bool = False,
) -> Optional[str]:
    if not image_ref:
        logger.die("--build-push requires DEPLOY_DOCKER_IMAGE or --docker-image")
    df = dockerfile or (repo_root / "Dockerfile")
    if not df.is_file():
        logger.die(f"--build-push: no Dockerfile at {df}; nothing to build.")

    cli_build_args: List[str] = []
    for k, v in (build_args or {}).items():
        cli_build_args += ["--build-arg", f"{k}={v}"]

    logger.log(f"--build-push: building {image_ref}")
    logger.log(f"              context={repo_root}")
    logger.log(f"              dockerfile={df}")
    for k, v in (build_args or {}).items():
        logger.log(f"              {k}={v}")
    logger.log("              (this usually takes 2-10 min depending on Docker layer cache)")

    if dry_run:
        extra = " ".join(shlex.quote(a) for a in cli_build_args)
        logger.log(
            f"DRY-RUN: would run `docker build -t {image_ref} "
            f"{extra + ' ' if extra else ''}-f {df} {repo_root}`"
        )
        logger.log(f"DRY-RUN: would run `docker push {image_ref}`")
        return None

    if not docker_available():
        logger.die(
            "local Docker daemon is not reachable; --build-push needs it.\n"
            "  - On WSL, enable Docker integration in Docker Desktop.\n"
            "  - Or start the daemon: `sudo service docker start`."
        )

    build = subprocess.run(
        ["docker", "build", "-t", image_ref, *cli_build_args, "-f", str(df), str(repo_root)],
        cwd=str(repo_root),
    )
    if build.returncode != 0:
        logger.die(
            f"docker build failed (rc={build.returncode}). Fix the build "
            "errors above, then re-run with --build-push."
        )
    logger.log(f"build OK; pushing {image_ref}...")

    push = subprocess.run(
        ["docker", "push", image_ref],
        capture_output=True,
        text=True,
    )
    if push.returncode != 0:
        stderr = (push.stderr or "").strip()
        hint = ""
        if "denied" in stderr.lower() or "unauthor" in stderr.lower():
            hint = (
                "\nLikely cause: no cached docker-hub credentials. "
                "Run `docker login` once and retry."
            )
        logger.die(
            f"docker push failed (rc={push.returncode}):\n  "
            + stderr.replace("\n", "\n  ")
            + hint
        )
    sys.stdout.write(push.stdout or "")
    sys.stdout.flush()

    digest = image_digest(image_ref)
    if digest:
        logger.log(f"pushed: {digest}")
    else:
        logger.warn(
            f"push succeeded but couldn't read a RepoDigest for {image_ref!r}; "
            "vm_info.json will record the mutable tag only."
        )
    return digest


HTTP_READY_TIMEOUT_S = 600
HTTP_PROBE_INTERVAL_S = 5
HTTP_HEARTBEAT_EVERY_S = 30

BROWSERLIKE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

PROXY_NOT_READY_CODES = {403, 404, 502, 503, 504}


def wait_for_http_ready(
    url: str,
    *,
    logger: CloudLogger,
    timeout_s: int = HTTP_READY_TIMEOUT_S,
    timeout_hint: str = "",
) -> bool:
    logger.log(f"waiting for HTTP at {url} (timeout {timeout_s}s)...")
    start = time.time()
    deadline = start + timeout_s
    last_err = ""
    last_heartbeat = start
    attempt = 0
    while time.time() < deadline:
        attempt += 1
        status: Optional[int] = None
        try:
            req = urllib.request.Request(url, method="GET", headers=BROWSERLIKE_HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
        except urllib.error.HTTPError as exc:
            status = exc.code
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_err = str(exc).splitlines()[0][:120]
            status = None

        if status is not None:
            if 200 <= status < 400:
                elapsed = int(time.time() - start)
                logger.log(f"  http {status} - reachable ({attempt} attempts, {elapsed}s)")
                return True
            if status in PROXY_NOT_READY_CODES:
                last_err = f"http {status} (front-end up, upstream not listening yet)"
            else:
                last_err = f"http {status}"

        now = time.time()
        if now - last_heartbeat >= HTTP_HEARTBEAT_EVERY_S:
            elapsed = int(now - start)
            logger.log(f"  still waiting ({elapsed}s, attempt {attempt}): {last_err}")
            last_heartbeat = now
        time.sleep(HTTP_PROBE_INTERVAL_S)

    msg = f"client HTTP did not come up within {timeout_s}s (last={last_err})."
    if timeout_hint:
        msg = msg + " " + timeout_hint
    logger.warn(msg)
    return False


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

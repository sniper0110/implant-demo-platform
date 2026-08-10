"""GCP-specific helpers for deploy/gcp/ CLI scripts."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_DEPLOY = Path(__file__).resolve().parent
if str(_DEPLOY) not in sys.path:
    sys.path.insert(0, str(_DEPLOY))

import _cloud_common as _cc  # noqa: E402


_LOGGER = _cc.CloudLogger("gcp")


def log(msg: str) -> None:
    _LOGGER.log(msg)


def warn(msg: str) -> None:
    _LOGGER.warn(msg)


def die(msg: str, code: int = 1) -> None:
    _LOGGER.die(msg, code)


def logger() -> _cc.CloudLogger:
    return _LOGGER


def default_repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def state_root(repo_root: Optional[Path] = None) -> Path:
    return (repo_root or default_repo_root()) / "deploy" / "gcp" / "_state"


# Keys loaded from deploy/gcp/.env (same names as pycad-dicom-viewer/bench/gcp/.env).
DOTENV_KEYS = (
    "GCP_PROJECT_ID",
    "GCP_DEFAULT_REGION",
    "GCP_DEFAULT_ZONE",
    "BENCH_GCP_SSH_KEY_PATH",
    "BENCH_GCP_SSH_USER",
    "BENCH_GCP_HTTP_TIMEOUT_S",
    "BENCH_DOCKER_REGISTRY_USERNAME",
    "BENCH_DOCKER_REGISTRY_PASSWORD",
    "DEPLOY_GCP_SSH_KEY_PATH",
    "DEPLOY_GCP_SSH_USER",
    "DEPLOY_GCP_HTTP_TIMEOUT_S",
    "DEPLOY_DOCKER_IMAGE",
    "DEPLOY_DOCKER_REGISTRY_USERNAME",
    "DEPLOY_DOCKER_REGISTRY_PASSWORD",
    "GCLOUD",
    "GSUTIL",
    "VITE_DICOM_WEB_URL",
    "VITE_DICOM_WEB_NAME",
    "VITE_SENTRY_DSN",
    "VITE_ENABLE_REMOTE_SAVE",
    "VITE_REMOTE_SERVER_URL",
    "VITE_SHOW_SAMPLE_DATA",
)

# BENCH_* keys in .env map onto DEPLOY_* when the latter is unset.
_ENV_ALIASES = (
    ("DEPLOY_GCP_SSH_KEY_PATH", "BENCH_GCP_SSH_KEY_PATH"),
    ("DEPLOY_GCP_SSH_USER", "BENCH_GCP_SSH_USER"),
    ("DEPLOY_GCP_HTTP_TIMEOUT_S", "BENCH_GCP_HTTP_TIMEOUT_S"),
    ("DEPLOY_DOCKER_REGISTRY_USERNAME", "BENCH_DOCKER_REGISTRY_USERNAME"),
    ("DEPLOY_DOCKER_REGISTRY_PASSWORD", "BENCH_DOCKER_REGISTRY_PASSWORD"),
)


def deploy_env_path(repo_root: Path) -> Path:
    return repo_root / "deploy" / "gcp" / ".env"


def _apply_env_aliases() -> None:
    for dest, src in _ENV_ALIASES:
        if not os.environ.get(dest, "").strip() and os.environ.get(src, "").strip():
            os.environ[dest] = os.environ[src]


def load_dotenv(repo_root: Optional[Path] = None, *, verbose: bool = True) -> None:
    """Load ``deploy/gcp/.env`` into ``os.environ`` (without overriding shell env)."""
    repo_root = repo_root or default_repo_root()
    override = os.environ.get("DEPLOY_GCP_ENV_FILE", "").strip()
    env_path = Path(override) if override else deploy_env_path(repo_root)

    if not env_path.is_file():
        if override:
            warn(f"DEPLOY_GCP_ENV_FILE={override} not found; skipping .env load")
        else:
            warn(
                f"no {deploy_env_path(repo_root)} found. Copy from "
                f"{repo_root / 'deploy' / 'gcp' / '.env.example'} or from "
                "pycad-dicom-viewer/bench/gcp/.env"
            )
        _apply_env_aliases()
        return

    _cc.load_dotenv(
        env_path=env_path,
        allowlist=DOTENV_KEYS,
        logger=_LOGGER,
        verbose=verbose,
    )
    _apply_env_aliases()

    global GCLOUD, _GCLOUD_RESOLVED
    GCLOUD = os.environ.get("GCLOUD", GCLOUD)
    _GCLOUD_RESOLVED = None


GCLOUD = os.environ.get("GCLOUD", "gcloud")
_GCLOUD_RESOLVED: Optional[str] = None


def find_gcloud_executable() -> Optional[str]:
    import shutil

    name = os.environ.get("GCLOUD", "gcloud").strip() or "gcloud"
    candidates: List[str] = []
    p = Path(name)
    if p.is_file():
        candidates.append(str(p.resolve()))
    for probe in (name, "gcloud", "gcloud.cmd", "gcloud.bat"):
        found = shutil.which(probe)
        if found:
            candidates.append(found)
    if sys.platform == "win32":
        local = os.environ.get("LOCALAPPDATA", "")
        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        for base in (
            Path(local) / "Google/Cloud SDK/google-cloud-sdk/bin",
            Path(program_files) / "Google/Cloud SDK/google-cloud-sdk/bin",
            Path(program_files_x86) / "Google/Cloud SDK/google-cloud-sdk/bin",
        ):
            for exe in ("gcloud.cmd", "gcloud.bat", "gcloud.exe"):
                cp = base / exe
                if cp.is_file():
                    candidates.append(str(cp.resolve()))
    seen: set[str] = set()
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            if Path(c).exists():
                return c
    return None


def resolve_gcloud_executable() -> str:
    global _GCLOUD_RESOLVED
    if _GCLOUD_RESOLVED:
        return _GCLOUD_RESOLVED
    found = find_gcloud_executable()
    if found:
        _GCLOUD_RESOLVED = found
        return found
    name = os.environ.get("GCLOUD", "gcloud").strip() or "gcloud"
    die(
        f"gcloud not found (looked for {name!r} on PATH and standard "
        "Windows install dirs). Install Google Cloud SDK from "
        "https://cloud.google.com/sdk/docs/install, open a **new** "
        "terminal, or set GCLOUD in deploy/gcp/.env."
    )
    return ""


def gcloud(
    *args: str,
    check: bool = True,
    parse_json: bool = True,
    timeout_s: float = 60.0,
    project: Optional[str] = None,
    capture: bool = True,
) -> Tuple[int, Any, str]:
    exe = resolve_gcloud_executable()
    cmd = [exe, *args]
    if parse_json and "--format" not in args and "--format=json" not in args:
        cmd += ["--format=json"]
    if project:
        cmd += [f"--project={project}"]
    import subprocess

    try:
        proc = subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(
            f"gcloud {' '.join(args)!r} timed out after {timeout_s}s"
        ) from exc
    stdout = (proc.stdout or "").strip() if capture else ""
    stderr = (proc.stderr or "").strip() if capture else ""
    if check and proc.returncode != 0:
        raise RuntimeError(
            f"gcloud {' '.join(args)!r} failed (rc={proc.returncode}):\n"
            f"stdout: {stdout}\nstderr: {stderr}"
        )
    parsed: Any = stdout
    if parse_json and stdout:
        try:
            parsed = json.loads(stdout)
        except json.JSONDecodeError:
            warn(
                f"expected JSON from `gcloud {' '.join(args)}` but got "
                "plain text; using raw output"
            )
    return proc.returncode, parsed, stderr


def project_id() -> str:
    pid = os.environ.get("GCP_PROJECT_ID", "").strip()
    if pid:
        return pid
    try:
        rc, val, _err = gcloud(
            "config", "get-value", "project",
            check=False, parse_json=False, timeout_s=20.0,
        )
    except RuntimeError as exc:
        die(f"could not query gcloud for the active project: {exc}")
        return ""
    if rc != 0 or not val or val == "(unset)":
        die(
            "no GCP project set. Either:\n"
            "  - put `GCP_PROJECT_ID=<your-project>` in deploy/gcp/.env, or\n"
            "  - run `gcloud config set project <your-project>`."
        )
    return val.strip()

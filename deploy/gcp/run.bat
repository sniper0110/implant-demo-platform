@echo off
setlocal
cd /d "%~dp0\..\.."

set "PY=python"
where python >nul 2>&1 || set "PY=python3"
where %PY% >nul 2>&1 || (
  echo [gcp] ERROR: python not found on PATH >&2
  exit /b 1
)

%PY% "%~dp0gcp_deploy.py" %*
exit /b %ERRORLEVEL%

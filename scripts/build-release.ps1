<#
.SYNOPSIS
  Builds the complete DocSortR Windows installer.

.DESCRIPTION
  Orchestrates the release pipeline:
    1. Installs/refreshes Python deps in a local venv.
    2. Runs `alembic upgrade head` against a throwaway template DB so the
       frozen exe ships with a schema-ready database file (optional).
    3. Freezes the FastAPI server via PyInstaller — outputs
       server/dist/docsortr-server/docsortr-server.exe.
    4. Installs/refreshes the client npm deps.
    5. Runs `npm run dist:win` which builds React, compiles Electron,
       and packages everything into an NSIS installer under
       client/build/.

  Assumes: Python 3.11+ on PATH, Node 20+ on PATH, PowerShell 5.1+.

.PARAMETER SkipPython
  Skip the PyInstaller step (useful when iterating on the frontend).

.PARAMETER SkipNpm
  Skip the Electron packaging step (useful when iterating on the backend).

.EXAMPLE
  ./scripts/build-release.ps1
#>
[CmdletBinding()]
param(
  [switch]$SkipPython,
  [switch]$SkipNpm
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Section([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

# -----------------------------------------------------------------------------
# Python backend
# -----------------------------------------------------------------------------
if (-not $SkipPython) {
  Section "Preparing Python virtual environment"
  $ServerDir = Join-Path $Root "server"
  $VenvDir = Join-Path $ServerDir ".venv-build"

  if (-not (Test-Path $VenvDir)) {
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) { throw "venv creation failed" }
  }

  $Activate = Join-Path $VenvDir "Scripts\Activate.ps1"
  . $Activate

  Section "Installing backend dependencies"
  python -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed" }
  python -m pip install -r (Join-Path $ServerDir "requirements.txt")
  if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
  python -m pip install pyinstaller
  if ($LASTEXITCODE -ne 0) { throw "pyinstaller install failed" }

  Section "Running Alembic migrations on template DB"
  Push-Location $ServerDir
  try {
    $env:DATABASE_URL = "sqlite+aiosqlite:///./data/template.db"
    New-Item -ItemType Directory -Force -Path "./data" | Out-Null
    alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "alembic upgrade failed; continuing without template DB"
    }
  } finally {
    Pop-Location
  }

  Section "Freezing backend with PyInstaller"
  Push-Location $ServerDir
  try {
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    pyinstaller --noconfirm pyinstaller.spec
    if ($LASTEXITCODE -ne 0) { throw "pyinstaller failed" }
    if (-not (Test-Path "dist\docsortr-server\docsortr-server.exe")) {
      throw "Expected dist\docsortr-server\docsortr-server.exe not found"
    }
  } finally {
    Pop-Location
  }

  deactivate
}
else {
  Section "Skipping Python / PyInstaller (per --SkipPython)"
}

# -----------------------------------------------------------------------------
# Electron frontend
# -----------------------------------------------------------------------------
if (-not $SkipNpm) {
  Section "Installing client dependencies"
  $ClientDir = Join-Path $Root "client"
  Push-Location $ClientDir
  try {
    if (-not (Test-Path "node_modules")) {
      npm ci
      if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    }

    Section "Building + packaging Electron installer"
    npm run dist:win
    if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }
  } finally {
    Pop-Location
  }
}
else {
  Section "Skipping Electron packaging (per --SkipNpm)"
}

Section "Done"
Write-Host "Installer ready in: $Root\client\build\" -ForegroundColor Green

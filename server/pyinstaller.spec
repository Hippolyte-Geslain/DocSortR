# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for docsortr-server.

Produces `dist/docsortr-server/docsortr-server.exe` (onedir) bundling:
  - the FastAPI app under app/
  - all Alembic migrations under alembic/versions/
  - alembic.ini
  - .env.example (so operators know which env vars are read)

The Electron main process spawns the resulting exe with --host/--port.
"""
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

ROOT = Path(SPECPATH).resolve()  # noqa: F821 — PyInstaller global

block_cipher = None

datas = [
    (str(ROOT / "app"), "app"),
    (str(ROOT / "alembic"), "alembic"),
    (str(ROOT / "alembic.ini"), "."),
]

env_example = ROOT / ".env.example"
if env_example.exists():
    datas.append((str(env_example), "."))

# RapidOCR ships ONNX models as package data.
datas += collect_data_files("rapidocr_onnxruntime")

hidden = [
    "uvicorn.logging",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.lifespan.on",
    "aiosqlite",
]
hidden += collect_submodules("app")
hidden += collect_submodules("alembic")

a = Analysis(  # noqa: F821
    [str(ROOT / "run_server.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hidden,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)  # noqa: F821

exe = EXE(  # noqa: F821
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="docsortr-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(  # noqa: F821
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="docsortr-server",
)

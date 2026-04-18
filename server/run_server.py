"""
PyInstaller entry point for the frozen DocSortR backend.

Accepts `--host` and `--port` on the command line; falls back to the
HOST / PORT env vars if omitted. The Electron main process sets both
when it spawns the frozen executable.
"""
from __future__ import annotations

import argparse
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser(prog="docsortr-server")
    default_host = os.environ.get("SERVER_HOST") or os.environ.get("HOST") or "127.0.0.1"
    default_port = int(
        os.environ.get("SERVER_PORT") or os.environ.get("PORT") or "8000"
    )
    parser.add_argument("--host", default=default_host)
    parser.add_argument("--port", type=int, default=default_port)
    args = parser.parse_args()

    # Run migrations on startup so the DB is always up to date. Uses the
    # bundled alembic/ directory relative to the frozen executable.
    try:
        from alembic import command
        from alembic.config import Config

        if getattr(sys, "frozen", False):
            base = os.path.dirname(sys.executable)
        else:
            base = os.path.dirname(os.path.abspath(__file__))
        ini_path = os.path.join(base, "alembic.ini")
        if os.path.isfile(ini_path):
            cfg = Config(ini_path)
            cfg.set_main_option("script_location", os.path.join(base, "alembic"))
            command.upgrade(cfg, "head")
    except Exception as exc:  # noqa: BLE001
        # Non-fatal: the app may still work with existing DB state.
        print(f"[docsortr-server] migration skipped: {exc}", file=sys.stderr)

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        log_level=os.environ.get("LOG_LEVEL", "info"),
        access_log=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

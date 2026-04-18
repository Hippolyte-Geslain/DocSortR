# build-resources/

Assets consumed by electron-builder at package time.

## Required
- `icon.ico` — 256×256 multi-size Windows icon. Drop the final brand icon here
  before running `npm run dist:win`. Missing icon falls back to the default
  Electron icon (builds still succeed).
- `installer.nsh` — NSIS customization hooks (committed).

## Optional (recommended)
- `installerSidebar.bmp` (164×314) — NSIS left-pane image.
- `installerHeader.bmp` (150×57) — NSIS top-banner image.

## Signing
In CI, set the following env vars before `npm run dist:win`:

- `CSC_LINK` — path or URL to the `.pfx` Authenticode certificate.
- `CSC_KEY_PASSWORD` — password unlocking the `.pfx`.

Local/unsigned builds still work; Windows will show a SmartScreen prompt
on first install until the binary earns enough reputation or a real
cert is attached.

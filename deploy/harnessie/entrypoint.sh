#!/bin/sh
# Start `dsh web` on loopback (the only bind it accepts) and publish it on the
# container interface with socat. socat forwards bytes unchanged, so the
# browser-facing Host header, cookies, and WebSocket upgrades reach dsh intact.
set -eu

INTERNAL_PORT=3080
PUBLIC_PORT=3000

mkdir -p "$DSH_HOME"

# A workspace whose folder is missing loses its sessions to Ungrouped, and the
# app does not recreate the folder. Recreate registered workspace folders under
# the persistent home and /workspace volumes before the server starts.
node -e '
const fs = require("fs")
let doc
try { doc = JSON.parse(fs.readFileSync(process.env.DSH_HOME + "/storages/workspace.json", "utf8")) } catch { process.exit(0) }
const roots = [process.env.HOME, "/workspace"]
const visit = (value) => {
  if (value === null || typeof value !== "object") return
  if (typeof value.path === "string" && Array.isArray(value.sessionIds)
    && roots.some(root => value.path === root || value.path.startsWith(root + "/"))) {
    fs.mkdirSync(value.path, { recursive: true })
  }
  for (const child of Object.values(value)) visit(child)
}
visit(doc)
' || echo "harnessie: workspace folder restore skipped" >&2

(
  while true; do
    socat "TCP-LISTEN:${PUBLIC_PORT},fork,reuseaddr,bind=0.0.0.0" "TCP:127.0.0.1:${INTERNAL_PORT}" || true
    sleep 1
  done
) &

# Launcher flags (--profile, --patch) come first; the web app parses the rest.
exec node /app/apps/cli/lib/bin.js \
  --profile web \
  --patch /app/deploy/harnessie/cordis.overlay.yml \
  --no-open \
  --port "$INTERNAL_PORT" \
  --public-url "$HARNESSIE_PUBLIC_URL" \
  --trusted-host "$HARNESSIE_TRUSTED_HOST"

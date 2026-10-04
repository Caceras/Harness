#!/bin/sh
# Start `dsh web` on loopback (the only bind it accepts) and publish it on the
# container interface with socat. socat forwards bytes unchanged, so the
# browser-facing Host header, cookies, and WebSocket upgrades reach dsh intact.
set -eu

INTERNAL_PORT=3080
PUBLIC_PORT=3000

mkdir -p "$DSH_HOME"

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

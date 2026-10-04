# syntax=docker/dockerfile:1.7
# Harnessie: the repository built with the `harnessie` client profile and served
# by `dsh web` behind a TLS-terminating reverse proxy (Dokploy's Traefik).
# Build from the repository root: docker build -f deploy/harnessie/Dockerfile .
FROM node:22-bookworm

# Tools the agent's shell commands commonly reach for, plus socat (publishes the
# loopback listener) and tini (PID 1 signal forwarding and reaping).
RUN apt-get update \
  && apt-get install -y --no-install-recommends jq less procps ripgrep socat tini unzip \
  && rm -rf /var/lib/apt/lists/*

# The skips avoid browser and Electron downloads that only the test and
# desktop paths use.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable

RUN mkdir -p /app /data/dsh /workspace && chown node:node /app /data /data/dsh /workspace
WORKDIR /app
COPY --chown=node:node . .
USER node
# CI=true skips the git-hook installer, which needs a .git checkout.
RUN CI=true pnpm install --frozen-lockfile

# The build context carries no .git, so the commit embedded in client
# artifacts arrives as a build argument.
ARG DSH_CLIENT_COMMIT_HASH=0000000
RUN DSH_CLIENT_BUILD_PROFILE=harnessie DSH_CLIENT_TITLE=Harnessie \
  DSH_CLIENT_COMMIT_HASH=${DSH_CLIENT_COMMIT_HASH} pnpm run build

# DSH_HOME keeps credentials, settings, sessions, and the browser-cookie
# signing secret; /workspace is the agent's default working directory.
ENV DSH_HOME=/data/dsh \
  NPM_CONFIG_PREFIX=/home/node/.npm-global \
  PATH=/home/node/.npm-global/bin:/home/node/.local/bin:$PATH \
  HARNESSIE_PUBLIC_URL=https://harnessie.online/ \
  HARNESSIE_TRUSTED_HOST=harnessie.online
VOLUME ["/data", "/workspace"]
WORKDIR /workspace
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD curl -s -o /dev/null -H "Host: ${HARNESSIE_TRUSTED_HOST}" http://127.0.0.1:3000/manifest.webmanifest || exit 1

ENTRYPOINT ["tini", "--", "/app/deploy/harnessie/entrypoint.sh"]

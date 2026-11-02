# Use the official prebuilt OpenClaw runtime image.
# This avoids rebuilding OpenClaw from source on every Railway deploy.
# Railway auto-deploy trigger: use latest main source revision.
FROM ghcr.io/openclaw/openclaw:2026.9.35

# Keep the current Railway deployment permission model for compatibility with
# the existing /data volume, which was created by the previous root-based image.
USER root

# Preserve python venv support that existed in the previous runtime image.
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

# Keep the Railway wrapper isolated from OpenClaw's /app tree.
WORKDIR /wrapper

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

# The official image ships the OpenClaw CLI at /app/openclaw.mjs.
# src/server.js invokes the CLI through node, so point it at the official entry.
ENV OPENCLAW_ENTRY=/app/openclaw.mjs
ENV OPENCLAW_NODE=node

# Persist user-installed tools on the Railway volume as before.
ENV NPM_CONFIG_PREFIX=/data/npm
ENV NPM_CONFIG_CACHE=/data/npm-cache
ENV PNPM_HOME=/data/pnpm
ENV PNPM_STORE_DIR=/data/pnpm-store
ENV PATH="/data/npm/bin:/data/pnpm:${PATH}"

# Railway injects PORT at runtime and routes traffic to that port.
EXPOSE 8080

# Override the official gateway entrypoint because this image runs the Railway
# wrapper, which starts the Gateway internally on loopback and proxies to it.
ENTRYPOINT ["tini", "-s", "--"]
CMD ["node", "src/server.js"]

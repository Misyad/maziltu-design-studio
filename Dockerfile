# syntax=docker/dockerfile:1

# ---- Build stage: install deps + produce the Nitro node-server output ----
FROM oven/bun:1-alpine AS build
WORKDIR /app

# Layer the lockfiles first so dependency installs are cached.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

# Public URL the browser uses (e.g. http://<server-ip>:3015/api).
# SSR_URL is optional; the node-server reaches the backend through the host.
ARG VITE_API_BASE_URL
ARG SSR_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    SSR_API_BASE_URL=$SSR_API_BASE_URL

RUN bun run build

# ---- Runtime stage: run the self-contained Nitro server ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

USER node

COPY --from=build --chown=node:node /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
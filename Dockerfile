# The render backend. Deploy this to any host that runs a container with a
# real filesystem — Render, Railway, Fly.io, a VM. Not a serverless function:
# see the Deploying section of the README for why.
FROM node:22-bookworm-slim

# Chromium's runtime libraries, plus a colour emoji font. Without
# fonts-noto-color-emoji every emoji in the video renders as a blank box,
# because a slim Linux image ships no emoji font at all.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-noto-color-emoji \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libgbm1 \
      libnss3 \
      libpango-1.0-0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Pull the headless shell and synthesise the soundtrack at build time so the
# first request doesn't pay for either.
RUN npx remotion browser ensure && node scripts/make-audio.mjs

ENV PORT=8765
EXPOSE 8765
CMD ["node", "server.js"]

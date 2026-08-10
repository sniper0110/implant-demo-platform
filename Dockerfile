# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS web-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_RELEASE_ID=v1
ENV VITE_RELEASE_ID=${VITE_RELEASE_ID}
RUN npm run optimize:models
RUN npm run build && npm run build:loader

FROM node:${NODE_VERSION} AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY server/ ./
RUN npm run build

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV STATIC_ROOT=/app/dist
ENV RELEASE_ID=v1

COPY --from=web-build /app/dist /app/dist
COPY --from=server-build /app/server/dist /app/server/dist
COPY --from=server-build /app/server/node_modules /app/server/node_modules
COPY --from=server-build /app/server/package.json /app/server/package.json
COPY --from=server-build /app/server/migrations /app/server/migrations

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1

CMD ["node", "server/dist/app.js"]

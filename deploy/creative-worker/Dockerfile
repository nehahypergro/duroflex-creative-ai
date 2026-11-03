FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
COPY lib ./lib
COPY scripts/ops/execution-worker.cjs ./scripts/ops/execution-worker.cjs
USER node
CMD ["node", "scripts/ops/execution-worker.cjs"]

FROM node:20-bookworm-slim AS dev
WORKDIR /app
ENV NODE_ENV=development

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
  && mkdir -p /prod \
  && cp package*.json /prod/ \
  && npm ci --omit=dev --prefix /prod \
  && npm cache clean --force

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY --from=dev /prod/node_modules ./node_modules
COPY --from=dev /app/package.json ./package.json
COPY --from=dev /app/dist ./dist

RUN useradd -m -u 10001 nodeapp \
  && mkdir -p /app/data \
  && chown -R nodeapp:nodeapp /app

USER nodeapp
EXPOSE 3000
CMD ["node", "dist/server.js"]

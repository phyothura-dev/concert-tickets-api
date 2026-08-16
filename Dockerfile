FROM node:20-bookworm-slim AS dev
WORKDIR /app
ENV NODE_ENV=development

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
  && chown -R nodeapp:nodeapp /app

USER nodeapp
EXPOSE 3000
CMD ["sh", "-c", "npm run boot:prod"]

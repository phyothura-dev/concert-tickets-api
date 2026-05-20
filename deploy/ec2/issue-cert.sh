#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

source .env.production

EMAIL="${1:-}"

[[ -n "$EMAIL" ]] || exit 1

docker compose -f docker-compose.prod.yml stop nginx || true

docker compose -f docker-compose.prod.yml run --rm --service-ports certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --no-eff-email \
  -d "$SERVER_NAME"

docker compose -f docker-compose.prod.yml up -d nginx
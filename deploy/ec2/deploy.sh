#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

[[ -f ".env.production" ]] || exit 1

source .env.production

COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

SSL_CERT="/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem"

if [[ -f "$SSL_CERT" ]]; then
  $COMPOSE up -d --build --remove-orphans
else
  $COMPOSE up -d --build app redis
fi

$COMPOSE ps
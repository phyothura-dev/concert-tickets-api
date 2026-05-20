#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.production" ]]; then
  echo "ERROR: .env.production not found. Copy from .env.production.example first."
  exit 1
fi

SERVER_NAME="$(grep '^SERVER_NAME=' .env.production | cut -d '=' -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
if [[ -z "$SERVER_NAME" ]]; then
  echo "ERROR: SERVER_NAME is empty in .env.production."
  exit 1
fi

CERT_PATH="/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem"
if [[ -f "$CERT_PATH" ]]; then
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
else
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans app redis
  echo "INFO: SSL cert not found for ${SERVER_NAME}. Nginx is skipped for now."
  echo "INFO: Run ./deploy/ec2/issue-cert.sh <email> and then rerun this deploy script."
fi

docker compose --env-file .env.production -f docker-compose.prod.yml ps

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.production" ]]; then
  echo "ERROR: .env.production not found."
  exit 1
fi

SERVER_NAME="$(grep '^SERVER_NAME=' .env.production | cut -d '=' -f2-)"
LETSENCRYPT_EMAIL="${1:-}"

if [[ -z "$SERVER_NAME" ]]; then
  echo "ERROR: SERVER_NAME is empty in .env.production."
  exit 1
fi

if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "Usage: ./deploy/ec2/issue-cert.sh <email>"
  exit 1
fi

docker compose -f docker-compose.prod.yml up -d nginx

docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$SERVER_NAME"

docker compose -f docker-compose.prod.yml restart nginx

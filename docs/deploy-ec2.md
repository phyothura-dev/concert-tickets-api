# EC2 Deployment (Production)

## 1) Prepare EC2

```bash
sudo apt-get update && sudo apt-get upgrade -y
git clone <your-repo-url> concert-tickets-backend
cd concert-tickets-backend
chmod +x deploy/ec2/bootstrap-ubuntu.sh
./deploy/ec2/bootstrap-ubuntu.sh
```

After script finishes, logout/login once.

## 2) Prepare Environment

```bash
cp .env.production.example .env.production
```

Set real values in `.env.production`:
- `SERVER_NAME` => `<subdomain>.int.yt`
- `SENTRY_DSN` / `SENTRY_*`
- keep `REDIS_URL=redis://redis:6379`

## 3) First Deploy

```bash
chmod +x deploy/ec2/deploy.sh
./deploy/ec2/deploy.sh
```

If certificate does not exist yet, script starts only `app` + `redis` and tells you to issue cert first.

## 4) DNS + Security Group

- Attach Elastic IP to EC2.
- Point `<subdomain>.int.yt` A record to Elastic IP.
- Security Group inbound: `80`, `443` (and `22` only from trusted IP).

## 5) Issue TLS Certificate

```bash
chmod +x deploy/ec2/issue-cert.sh
./deploy/ec2/issue-cert.sh <your-email>
```

After certificate is issued, run deploy again:

```bash
./deploy/ec2/deploy.sh
```

Then Nginx will force `http -> https`.

## 6) GitHub Actions Secrets

Set these repository secrets:
- `EC2_HOST`
- `EC2_PORT` (optional, default `22`)
- `EC2_USERNAME`
- `EC2_SSH_PRIVATE_KEY`
- `EC2_APP_DIR` (example: `/home/ubuntu/concert-tickets-backend`)

After that, every push to `main` will run build/test and deploy.

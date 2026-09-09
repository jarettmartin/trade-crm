# Lightsail Infrastructure

Terraform for the single-instance Sprout CRM production stack. This replaces
ECS + ECR + RDS + ALB with one Lightsail VM running Docker Compose (PostgreSQL +
NestJS API + Caddy reverse proxy). The frontend stays on S3 behind CloudFront.

## Cost

| Bundle       | Price/mo | RAM | Notes                                          |
| ------------ | -------- | --- | ---------------------------------------------- |
| `micro_3_0`  | $7.00    | 1GB | Cheaper; risks OOM during Playwright PDF builds |
| `small_3_0`  | $12.00   | 2GB | **Recommended** (default)                       |
| `medium_3_0` | $24.00   | 4GB | Extra headroom                                  |

> The `*_ipv6_3_0` bundles are IPv6-only (no public IPv4) and can't be used for
> this app, which needs IPv4 for SSH/deploy and direct HTTPS access.

A static IP is free while attached to a running instance. CloudFront and ACM
are within the AWS free tier at this traffic level, so the total cost is
essentially just the bundle price.

## Prerequisites

- AWS CLI with credentials for the target account. The existing
  `sprout-crm-api` IAM user will need `lightsail:*` — attach the managed policy
  `AmazonLightsailFullAccess` (the current policies don't cover Lightsail).
- Terraform >= 1.5.
- An SSH public key (paste its contents into `terraform.tfvars`).

## Setup

```bash
cd infra/lightsail
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars -> set ssh_public_key (and optionally lock ssh_cidr_blocks)
terraform init
terraform plan
terraform apply
```

`apply` prints `public_ip` (Lightsail) and `frontend_domain` (CloudFront). Point
DNS in Cloudflare:

- `api.sprout-crm.com` → `public_ip` (A record, **DNS-only**)
- `sprout-crm.com` → `frontend_domain` (CNAME, **DNS-only**)

The ACM certificate for `sprout-crm.com` is DNS-validated — on a fresh setup,
add the CNAME shown by the `acm_validation_records` output to Cloudflare
(DNS-only, not proxied).

## What gets created

- `aws_lightsail_instance` — Ubuntu VM. On first boot, user data installs
  Docker + the Compose plugin and adds a 2GB swap file.
- `aws_lightsail_static_ip` + attachment — persistent public IP.
- `aws_lightsail_instance_public_ports` — opens 22 (SSH), 80 (HTTP), 443 (HTTPS).
- `aws_lightsail_key_pair` — imports your public key for SSH access.
- `aws_acm_certificate` — `sprout-crm.com` cert (us-east-1, DNS-validated).
- `aws_cloudfront_distribution` — serves the SPA over HTTPS.
- `aws_s3_bucket` + website/policy config — the `sprout-crm-web` static site.

Postgres (`5432`) is intentionally **not** opened to the internet. Manage the
database over SSH (see below).

## Deploying the application

From the repo root, once the instance is up:

```bash
cp .env.production.example .env.production   # fill in real secrets
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
```

`deploy.sh` rsyncs the repo to the instance and runs
`docker compose -f docker-compose.prod.yml up -d --build`, which builds the API
image, runs migrations + seed, and starts the stack.

## Managing the database (manual)

SSH in and use `docker compose exec`:

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d trade_crm
```

Postgres is bound to localhost on the instance, so for a local GUI client use
an SSH tunnel:

```bash
ssh -L 5432:127.0.0.1:5432 ubuntu@<public_ip>
# then connect your client to localhost:5432
```

## Backups

The `sprout-crm-backups` S3 bucket (private, SSE-S3 encrypted) stores daily
`pg_dump` backups with a 7-day retention policy.

- **Terraform**: [`backups.tf`](backups.tf) creates the bucket.
- **Script**: [`scripts/backup-db.sh`](../../scripts/backup-db.sh) dumps the
  `trade_crm` database, compresses it, uploads to
  `s3://sprout-crm-backups/sprout-crm-db-<unix-ms>.sql.gz`, and prunes backups
  older than 7 days.
- **Schedule**: daily at 1am Eastern via cron (`CRON_TZ=America/New_York`).
  [`scripts/install-backup-cron.sh`](../../scripts/install-backup-cron.sh)
  installs it idempotently; `deploy.sh` runs it on every deploy.

### Restore a backup

SSH in and stream the backup into Postgres:

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
aws s3 cp s3://sprout-crm-backups/sprout-crm-db-<ms>.sql.gz - | gunzip | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d trade_crm
```

## Notes

- Verify available bundles/blueprints for your region:
  `aws lightsail get-bundles` and `aws lightsail get-blueprints`.
- To add daily automatic snapshots, enable the `add_on` block on the instance
  resource (snapshots are billed per GB/month).
- State is stored locally by default; see the commented S3 backend in
  `main.tf` if you later want shared/remote state.

## Teardown

```bash
terraform destroy
```

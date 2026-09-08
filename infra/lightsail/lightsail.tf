locals {
  # Lightsail user_data only accepts a single line, so join the bootstrap steps.
  # Runs once on first boot: installs Docker (Engine + CLI + Compose plugin via
  # the official convenience script), enables it, and adds a 2GB swap file so
  # on-instance `docker build` (Playwright/Nest/Vite) doesn't OOM a 2GB box.
  user_data = join(" && ", [
    "curl -fsSL https://get.docker.com | sh",
    "usermod -aG docker ubuntu",
    "systemctl enable --now docker",
    "fallocate -l 2G /swapfile",
    "chmod 600 /swapfile",
    "mkswap /swapfile",
    "swapon /swapfile",
    "echo '/swapfile none swap sw 0 0' >> /etc/fstab",
  ])
}

# Import our public key so we can SSH in to deploy.
resource "aws_lightsail_key_pair" "this" {
  name       = var.ssh_key_name
  public_key = var.ssh_public_key
}

resource "aws_lightsail_instance" "this" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  # IPv4 is required: the *_ipv6_3_0 bundles are IPv6-only (no public IPv4) and
  # would break SSH/deploy and direct access. small_3_0 provides a public IPv4.
  ip_address_type = "ipv4"
  key_pair_name   = aws_lightsail_key_pair.this.name

  user_data = local.user_data

  tags = var.tags
}

# Persistent public IP so the address survives restarts.
resource "aws_lightsail_static_ip" "this" {
  name = "${var.instance_name}-ip"
}

resource "aws_lightsail_static_ip_attachment" "this" {
  instance_name  = aws_lightsail_instance.this.name
  static_ip_name = aws_lightsail_static_ip.this.name
}

# Lightsail firewall: this resource is authoritative — any port NOT listed is
# closed. Postgres (5432) is deliberately left closed; it's only reachable over
# the Docker network or via SSH (see infra/lightsail/README.md).
resource "aws_lightsail_instance_public_ports" "this" {
  instance_name = aws_lightsail_instance.this.name

  # SSH (restrict to your IP via ssh_cidr_blocks).
  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = var.ssh_cidr_blocks
  }

  # HTTP — Caddy ACME http-01 challenge + HTTPS redirect.
  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  # HTTPS.
  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }
}

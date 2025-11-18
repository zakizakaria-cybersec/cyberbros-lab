terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Generate random password if not provided
resource "random_password" "ssh_password" {
  count   = var.ssh_password == "" ? 1 : 0
  length  = 16
  special = true
}

# Cloud-init configuration
locals {
  ssh_password = var.ssh_password != "" ? var.ssh_password : random_password.ssh_password[0].result
  
  cloud_init = <<-EOF
    #cloud-config
    users:
      - name: ${var.ssh_username}
        sudo: ALL=(ALL) NOPASSWD:ALL
        shell: /bin/bash
        lock_passwd: false
        passwd: ${bcrypt(local.ssh_password)}
        ssh_authorized_keys: []
    
    chpasswd:
      expire: false
    
    ssh_pwauth: true
    
    runcmd:
      - sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config
      - systemctl restart sshd
      - echo "VM provisioned for challenge: ${var.challenge_name}" > /root/challenge_info.txt
  EOF
}

# SSH key (for initial access, password auth enabled via cloud-init)
resource "hcloud_ssh_key" "vm_key" {
  name       = "${var.instance_name}-key"
  public_key = var.ssh_public_key != "" ? var.ssh_public_key : "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDummy"
}

# Hetzner server
resource "hcloud_server" "vm" {
  name        = var.instance_name
  server_type = var.server_type
  image       = var.ubuntu_image_name
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.vm_key.id]

  # Cloud-init user data
  user_data = local.cloud_init

  # Labels for identification
  labels = merge(
    {
      "managed-by"    = "terraform"
      "project"       = "cyberbros-lab"
      "challenge"     = var.challenge_name
      "user_id"       = var.user_id
      "expires_at"    = replace(var.expires_at, ":", "-")
    },
    var.additional_labels
  )

  # Firewall
  firewall_ids = [hcloud_firewall.vm_firewall.id]

  # Keep server running
  keep_disk = false
}

# Firewall
resource "hcloud_firewall" "vm_firewall" {
  name = "${var.instance_name}-firewall"

  # SSH access
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = [
      var.allowed_ssh_cidr
    ]
  }

  # HTTP
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # HTTPS
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Custom ports for challenges
  dynamic "rule" {
    for_each = var.allowed_ports
    content {
      direction = "in"
      protocol  = "tcp"
      port      = tostring(rule.value)
      source_ips = [
        "0.0.0.0/0",
        "::/0"
      ]
    }
  }
}

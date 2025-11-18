terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
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

# Cloud-init configuration for SSH user setup
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

# Scaleway instance
resource "scaleway_instance_server" "vm" {
  name  = var.instance_name
  type  = var.instance_type
  image = var.ubuntu_image_id
  zone  = var.zone

  # Cloud-init user data
  user_data = {
    cloud-init = local.cloud_init
  }

  # Tags for identification
  tags = concat(
    [
      "cyberbros-lab",
      "challenge:${var.challenge_name}",
      "user_id:${var.user_id}",
      "expires:${var.expires_at}"
    ],
    var.additional_tags
  )

  # Security group with SSH access
  security_group_id = scaleway_instance_security_group.vm_sg.id
}

# Security group
resource "scaleway_instance_security_group" "vm_sg" {
  name        = "${var.instance_name}-sg"
  description = "Security group for ${var.instance_name}"

  inbound_default_policy  = "drop"
  outbound_default_policy = "accept"

  # SSH access from allowed CIDR
  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = 22
    ip_range = var.allowed_ssh_cidr
  }

  # HTTP access (for web challenges)
  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = 80
    ip_range = "0.0.0.0/0"
  }

  # HTTPS access
  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = 443
    ip_range = "0.0.0.0/0"
  }

  # Allow custom ports for challenges
  dynamic "inbound_rule" {
    for_each = var.allowed_ports
    content {
      action   = "accept"
      protocol = "TCP"
      port     = inbound_rule.value
      ip_range = "0.0.0.0/0"
    }
  }
}

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.44"
    }
  }
  required_version = ">= 1.0"
}

provider "hcloud" {
  token = var.hcloud_token
}

# Firewall for VM instances
resource "hcloud_firewall" "cyberbros_vm" {
  name = "cyberbros-vm-firewall"

  # Allow SSH
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Allow HTTP
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Allow HTTPS
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Allow custom ports (for various CTF challenges)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "3000-9999"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Allow ICMP (ping)
  rule {
    direction = "in"
    protocol  = "icmp"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }
}

# Example: Create a base server for snapshot creation
# This is optional - you can create snapshots manually
resource "hcloud_server" "base_template" {
  count = var.create_base_template ? 1 : 0

  name        = "cyberbros-base-template"
  server_type = "cx11"
  image       = "ubuntu-22.04"
  location    = "nbg1"

  firewall_ids = [hcloud_firewall.cyberbros_vm.id]

  ssh_keys = var.ssh_key_ids

  labels = {
    managed_by = "terraform"
    purpose    = "base-template"
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y curl wget git vim htop net-tools
    
    # Add additional setup commands here
    # This server can be used to create snapshots for challenges
    
    echo "Base template setup complete"
  EOF
}

output "firewall_id" {
  description = "Firewall ID for VMs"
  value       = hcloud_firewall.cyberbros_vm.id
}

output "base_template_id" {
  description = "Base template server ID (if created)"
  value       = var.create_base_template ? hcloud_server.base_template[0].id : null
}

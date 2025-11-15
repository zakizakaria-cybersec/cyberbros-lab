terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.44"
    }
  }
}

# Hetzner Cloud Provider
provider "hcloud" {
  token = var.hetzner_api_token
}

# Variables
variable "hetzner_api_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "server_name" {
  description = "Name of the server"
  type        = string
  default     = "cyberbros-challenge"
}

variable "server_type" {
  description = "Server type (e.g., cx11, cx21)"
  type        = string
  default     = "cx11"
}

variable "image" {
  description = "OS image (e.g., ubuntu-20.04)"
  type        = string
  default     = "ubuntu-20.04"
}

variable "location" {
  description = "Server location (e.g., nbg1, fsn1, hel1)"
  type        = string
  default     = "nbg1"
}

# SSH Key
resource "hcloud_ssh_key" "default" {
  name       = "cyberbros-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

# Server
resource "hcloud_server" "challenge" {
  name        = var.server_name
  server_type = var.server_type
  image       = var.image
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io
    systemctl start docker
    systemctl enable docker
  EOF

  labels = {
    purpose = "cybersecurity-challenge"
    managed = "terraform"
  }
}

# Outputs
output "server_id" {
  description = "The ID of the server"
  value       = hcloud_server.challenge.id
}

output "server_ip" {
  description = "The public IPv4 address of the server"
  value       = hcloud_server.challenge.ipv4_address
}

output "server_name" {
  description = "The name of the server"
  value       = hcloud_server.challenge.name
}

# Main provisioning logic with fallback
# This will be executed by GitHub Actions

terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend for state storage (Cloudflare R2 or S3)
  backend "s3" {
    # Configure in terraform init with:
    # -backend-config="bucket=cyberbros-terraform-state"
    # -backend-config="key=vms/${var.instance_id}/terraform.tfstate"
    # -backend-config="region=auto"
    # -backend-config="endpoint=https://<account-id>.r2.cloudflarestorage.com"
  }
}

variable "provider_primary" {
  description = "Primary cloud provider (scaleway or hetzner)"
  type        = string
  default     = "scaleway"
}

variable "instance_name" {
  description = "VM instance name"
  type        = string
}

variable "challenge_name" {
  description = "Challenge name"
  type        = string
}

variable "user_id" {
  description = "User ID"
  type        = string
}

variable "challenge_id" {
  description = "Challenge ID"
  type        = string
}

variable "instance_id" {
  description = "Backend instance ID"
  type        = string
}

variable "expires_at" {
  description = "Expiration timestamp"
  type        = string
}

variable "cpu_count" {
  description = "Number of CPU cores"
  type        = number
  default     = 2
}

variable "memory_gb" {
  description = "Memory in GB"
  type        = number
  default     = 4
}

variable "allowed_ssh_cidr" {
  description = "Allowed SSH CIDR"
  type        = string
  default     = "0.0.0.0/0"
}

variable "scaleway_access_key" {
  description = "Scaleway access key"
  type        = string
  sensitive   = true
}

variable "scaleway_secret_key" {
  description = "Scaleway secret key"
  type        = string
  sensitive   = true
}

variable "scaleway_project_id" {
  description = "Scaleway project ID"
  type        = string
}

variable "hetzner_token" {
  description = "Hetzner API token"
  type        = string
  sensitive   = true
}

# Generate SSH credentials
resource "random_string" "ssh_username" {
  length  = 8
  special = false
  upper   = false
  numeric = false
}

resource "random_password" "ssh_password" {
  length  = 16
  special = true
}

locals {
  ssh_username = "user${random_string.ssh_username.result}"
  ssh_password = random_password.ssh_password.result
  
  # Map instance requirements to provider types
  scaleway_type = var.memory_gb <= 2 ? "DEV1-S" : (var.memory_gb <= 4 ? "DEV1-M" : "DEV1-L")
  hetzner_type  = var.memory_gb <= 2 ? "cx11" : (var.memory_gb <= 4 ? "cx21" : "cx31")
}

# Provider configurations
provider "scaleway" {
  access_key = var.scaleway_access_key
  secret_key = var.scaleway_secret_key
  project_id = var.scaleway_project_id
  zone       = "fr-par-1"
  region     = "fr-par"
}

provider "hcloud" {
  token = var.hetzner_token
}

# Conditional provisioning based on primary provider
module "scaleway_vm" {
  count  = var.provider_primary == "scaleway" ? 1 : 0
  source = "./modules/scaleway_vm"

  instance_name    = var.instance_name
  instance_type    = local.scaleway_type
  ssh_username     = local.ssh_username
  ssh_password     = local.ssh_password
  challenge_name   = var.challenge_name
  user_id          = var.user_id
  expires_at       = var.expires_at
  allowed_ssh_cidr = var.allowed_ssh_cidr
}

module "hetzner_vm" {
  count  = var.provider_primary == "hetzner" ? 1 : 0
  source = "./modules/hetzner_vm"

  instance_name    = var.instance_name
  server_type      = local.hetzner_type
  ssh_username     = local.ssh_username
  ssh_password     = local.ssh_password
  challenge_name   = var.challenge_name
  user_id          = var.user_id
  expires_at       = var.expires_at
  allowed_ssh_cidr = var.allowed_ssh_cidr
}

# Outputs
output "instance_id" {
  description = "Cloud provider instance ID"
  value       = var.provider_primary == "scaleway" ? (length(module.scaleway_vm) > 0 ? module.scaleway_vm[0].instance_id : "") : (length(module.hetzner_vm) > 0 ? module.hetzner_vm[0].instance_id : "")
}

output "public_ip" {
  description = "Public IP address"
  value       = var.provider_primary == "scaleway" ? (length(module.scaleway_vm) > 0 ? module.scaleway_vm[0].public_ip : "") : (length(module.hetzner_vm) > 0 ? module.hetzner_vm[0].public_ip : "")
}

output "ssh_username" {
  description = "SSH username"
  value       = local.ssh_username
}

output "ssh_password" {
  description = "SSH password"
  value       = local.ssh_password
  sensitive   = true
}

output "provider_used" {
  description = "Cloud provider used"
  value       = var.provider_primary
}

output "backend_instance_id" {
  description = "Backend database instance ID"
  value       = var.instance_id
}

# Infrastructure Setup

This directory contains Terraform configuration for setting up the cloud infrastructure for CyberBros Lab.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- Hetzner Cloud account and API token

## Setup

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` and add your Hetzner Cloud API token.

3. Initialize Terraform:
   ```bash
   terraform init
   ```

4. Review the planned changes:
   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

## Resources Created

- **Firewall**: Configured with rules for SSH, HTTP, HTTPS, and custom ports
- **Base Template** (optional): A base server that can be used to create snapshots

## Creating Challenge Snapshots

To create snapshots for challenges:

1. Set `create_base_template = true` in `terraform.tfvars`
2. Apply the configuration to create the base server
3. SSH into the server and set up your challenge environment
4. Create a snapshot through the Hetzner Cloud Console or CLI
5. Note the snapshot ID for use in the application
6. Destroy the base template server (optional)

## Firewall Configuration

The firewall allows:
- SSH (port 22)
- HTTP (port 80)
- HTTPS (port 443)
- Custom ports (3000-9999) for various CTF challenges
- ICMP (ping)

Modify `main.tf` to adjust firewall rules as needed.

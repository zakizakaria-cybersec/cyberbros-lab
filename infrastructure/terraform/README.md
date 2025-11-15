# Terraform Infrastructure for CyberBros Lab

This directory contains Terraform configurations for provisioning VMs on Hetzner Cloud.

## Prerequisites

- Terraform installed (v1.0+)
- Hetzner Cloud account and API token

## Usage

1. Initialize Terraform:
```bash
terraform init
```

2. Create a `terraform.tfvars` file from the example:
```bash
cp variables.tfvars.example terraform.tfvars
```

3. Edit `terraform.tfvars` with your API token and desired configuration.

4. Plan the deployment:
```bash
terraform plan
```

5. Apply the configuration:
```bash
terraform apply
```

6. To destroy resources:
```bash
terraform destroy
```

## Variables

- `hetzner_api_token`: Your Hetzner Cloud API token (required)
- `server_name`: Name for the server (default: "cyberbros-challenge")
- `server_type`: Server type - cx11, cx21, etc. (default: "cx11")
- `image`: OS image to use (default: "ubuntu-20.04")
- `location`: Data center location (default: "nbg1")

## Outputs

- `server_id`: The unique ID of the created server
- `server_ip`: The public IPv4 address
- `server_name`: The name of the server

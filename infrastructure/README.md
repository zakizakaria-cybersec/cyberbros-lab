# Infrastructure Management

This directory contains Infrastructure as Code (IaC) for managing VM resources on cloud providers.

## Directory Structure

```
infrastructure/
├── terraform/          # Terraform configurations for VM provisioning
│   ├── main.tf        # Main Terraform configuration
│   ├── variables.tfvars.example  # Example variables
│   └── README.md      # Terraform-specific documentation
└── scripts/           # Shell scripts for VM management
    ├── provision-vm.sh      # Create a new VM
    ├── teardown-vm.sh       # Delete a VM
    └── cleanup-expired.sh   # Remove expired VMs
```

## Quick Start

### Prerequisites

- Hetzner Cloud or Scaleway API credentials
- `jq` installed for JSON parsing (scripts)
- Terraform installed (for terraform/)

### Using Shell Scripts

The shell scripts provide a simple way to manage VMs via API calls.

**1. Set up environment:**
```bash
export HETZNER_API_TOKEN="your-token-here"
```

**2. Provision a VM:**
```bash
cd scripts
./provision-vm.sh challenge-sql-01 cx11 ubuntu-20.04 nbg1
```

Output:
```
Creating server: challenge-sql-01
Type: cx11, Image: ubuntu-20.04, Location: nbg1
Server created successfully!
Server ID: 12345678
Server IP: 95.217.x.x
Root Password: xxxxxxxxxx
Details saved to: vm-12345678.json
```

**3. Teardown a VM:**
```bash
./teardown-vm.sh 12345678
```

**4. Clean up expired VMs:**
```bash
# Remove VMs older than 2 hours
./cleanup-expired.sh 2
```

### Using Terraform

For more complex deployments, use Terraform.

**1. Initialize:**
```bash
cd terraform
terraform init
```

**2. Configure:**
```bash
cp variables.tfvars.example terraform.tfvars
nano terraform.tfvars
```

**3. Deploy:**
```bash
terraform plan
terraform apply
```

**4. Destroy:**
```bash
terraform destroy
```

## VM Configurations

### Hetzner Cloud Server Types

| Type | vCPU | RAM | Disk | Price/month |
|------|------|-----|------|-------------|
| cx11 | 1 | 2GB | 20GB | ~€4.15 |
| cx21 | 2 | 4GB | 40GB | ~€6.40 |
| cx31 | 2 | 8GB | 80GB | ~€12.40 |
| cx41 | 4 | 16GB | 160GB | ~€24.40 |

### Recommended Images

- `ubuntu-20.04` - Ubuntu 20.04 LTS (Stable)
- `ubuntu-22.04` - Ubuntu 22.04 LTS (Latest LTS)
- `debian-11` - Debian 11 Bullseye
- `centos-7` - CentOS 7

### Locations

- `nbg1` - Nuremberg, Germany
- `fsn1` - Falkenstein, Germany  
- `hel1` - Helsinki, Finland
- `ash` - Ashburn, USA

## Script Details

### provision-vm.sh

Creates a new VM with specified configuration.

**Usage:**
```bash
./provision-vm.sh [name] [type] [image] [location]
```

**Arguments:**
- `name` - Server name (default: cyberbros-challenge-{timestamp})
- `type` - Server type (default: cx11)
- `image` - OS image (default: ubuntu-20.04)
- `location` - Data center (default: nbg1)

**Example:**
```bash
./provision-vm.sh web-challenge cx11 ubuntu-20.04 nbg1
```

**Output File:**
Creates `vm-{server_id}.json` with connection details.

### teardown-vm.sh

Deletes a VM by server ID.

**Usage:**
```bash
./teardown-vm.sh <server_id>
```

**Example:**
```bash
./teardown-vm.sh 12345678
```

### cleanup-expired.sh

Automatically removes VMs older than specified hours.

**Usage:**
```bash
./cleanup-expired.sh [max_age_hours]
```

**Arguments:**
- `max_age_hours` - Maximum age in hours (default: 2)

**Example:**
```bash
# Clean VMs older than 3 hours
./cleanup-expired.sh 3
```

**Scheduling with Cron:**
```bash
# Run cleanup every hour
0 * * * * cd /path/to/scripts && ./cleanup-expired.sh 2
```

## Automation

### Integrating with Backend

The backend service automatically uses these APIs through:
- `backend/src/services/hetznerService.ts`
- `backend/src/services/scalewayService.ts`

The cleanup job runs every 15 minutes via `node-cron`.

### Manual Cleanup

If you need to manually clean up all challenge VMs:

```bash
# List all VMs with auto_delete label
curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  'https://api.hetzner.cloud/v1/servers?label_selector=auto_delete=true'

# Delete specific VM
curl -X DELETE \
  -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  "https://api.hetzner.cloud/v1/servers/{id}"
```

## Cost Management

### Estimated Monthly Costs

**Light Usage** (10 concurrent VMs, cx11):
- 10 VMs × €4.15/month = ~€41.50/month

**Medium Usage** (25 concurrent VMs, mix of cx11/cx21):
- 15 × cx11 (€4.15) = €62.25
- 10 × cx21 (€6.40) = €64.00
- Total: ~€126.25/month

**High Usage** (50+ concurrent VMs):
- Consider volume discounts
- Use auto-scaling
- Implement user limits

### Cost Optimization Tips

1. **Set short VM lifetimes** (2 hours default)
2. **Use smallest server types** for beginners
3. **Implement user limits** (max VMs per user)
4. **Monitor usage** with cloud provider dashboards
5. **Clean up orphaned VMs** regularly
6. **Use reserved instances** for always-on infrastructure

## Monitoring

### Check Active VMs

```bash
# Hetzner
curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  https://api.hetzner.cloud/v1/servers | jq '.servers[] | {id, name, created, status}'
```

### Resource Usage

```bash
# Get server metrics
curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  "https://api.hetzner.cloud/v1/servers/{id}/metrics"
```

## Security Best Practices

1. **Rotate API tokens** regularly
2. **Use read-only tokens** where possible
3. **Label VMs** for easy identification
4. **Enable firewall rules** on cloud provider
5. **Monitor for unusual activity**
6. **Set up billing alerts**
7. **Use separate accounts** for dev/prod

## Troubleshooting

### API Rate Limits

Hetzner: 3600 requests/hour per token
- Implement exponential backoff
- Cache responses when possible
- Use multiple tokens for high volume

### VM Creation Fails

Common causes:
- Insufficient account balance
- API token invalid/expired
- Server type unavailable in location
- Rate limit exceeded

Check:
```bash
# Verify token
curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  https://api.hetzner.cloud/v1/servers

# Check account
curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  https://api.hetzner.cloud/v1/account
```

### Cleanup Not Working

- Verify `jq` is installed: `which jq`
- Check API token permissions
- Ensure label selector is correct
- Review VM creation timestamps

## Support

- Hetzner Cloud API: https://docs.hetzner.cloud/
- Scaleway API: https://developers.scaleway.com/
- Terraform Hetzner Provider: https://registry.terraform.io/providers/hetznercloud/hcloud/

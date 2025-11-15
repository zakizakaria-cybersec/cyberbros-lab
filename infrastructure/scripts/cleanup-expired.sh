#!/bin/bash
# Cleanup Expired VMs Script for CyberBros Lab

set -e

if [ -z "$HETZNER_API_TOKEN" ]; then
    echo "Error: HETZNER_API_TOKEN environment variable is not set"
    exit 1
fi

# Auto-delete VMs with specific label that are older than 2 hours
MAX_AGE_HOURS=${1:-2}
MAX_AGE_SECONDS=$((MAX_AGE_HOURS * 3600))
CURRENT_TIME=$(date +%s)

echo "Checking for VMs older than $MAX_AGE_HOURS hours..."

# Get all servers with the auto_delete label
SERVERS=$(curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  'https://api.hetzner.cloud/v1/servers?label_selector=auto_delete=true')

echo "$SERVERS" | jq -r '.servers[] | "\(.id) \(.name) \(.created)"' | while read -r ID NAME CREATED; do
    CREATED_TIME=$(date -d "$CREATED" +%s)
    AGE=$((CURRENT_TIME - CREATED_TIME))
    
    if [ $AGE -gt $MAX_AGE_SECONDS ]; then
        echo "Deleting expired VM: $NAME (ID: $ID, Age: $((AGE / 3600)) hours)"
        curl -s -X DELETE \
          -H "Authorization: Bearer $HETZNER_API_TOKEN" \
          "https://api.hetzner.cloud/v1/servers/$ID" > /dev/null
        echo "  ✓ Deleted"
    else
        echo "Keeping VM: $NAME (Age: $((AGE / 3600)) hours)"
    fi
done

echo "Cleanup completed!"

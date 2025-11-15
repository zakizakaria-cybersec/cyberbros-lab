#!/bin/bash
# VM Teardown Script for CyberBros Lab

set -e

SERVER_ID=$1

if [ -z "$SERVER_ID" ]; then
    echo "Usage: $0 <server_id>"
    exit 1
fi

if [ -z "$HETZNER_API_TOKEN" ]; then
    echo "Error: HETZNER_API_TOKEN environment variable is not set"
    exit 1
fi

echo "Deleting server: $SERVER_ID"

# Delete server using Hetzner API
RESPONSE=$(curl -s -X DELETE \
  -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  "https://api.hetzner.cloud/v1/servers/$SERVER_ID")

# Check for errors
if echo $RESPONSE | jq -e '.error' > /dev/null 2>&1; then
    echo "Error deleting server:"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "Server $SERVER_ID deleted successfully!"

# Remove the details file if it exists
if [ -f "vm-${SERVER_ID}.json" ]; then
    rm "vm-${SERVER_ID}.json"
    echo "Removed details file: vm-${SERVER_ID}.json"
fi

#!/bin/bash
# VM Provisioning Script for CyberBros Lab

set -e

# Configuration
SERVER_NAME=${1:-"cyberbros-challenge-$(date +%s)"}
SERVER_TYPE=${2:-"cx11"}
IMAGE=${3:-"ubuntu-20.04"}
LOCATION=${4:-"nbg1"}

if [ -z "$HETZNER_API_TOKEN" ]; then
    echo "Error: HETZNER_API_TOKEN environment variable is not set"
    exit 1
fi

echo "Creating server: $SERVER_NAME"
echo "Type: $SERVER_TYPE, Image: $IMAGE, Location: $LOCATION"

# Create server using Hetzner API
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$SERVER_NAME\",
    \"server_type\": \"$SERVER_TYPE\",
    \"image\": \"$IMAGE\",
    \"location\": \"$LOCATION\",
    \"labels\": {
      \"purpose\": \"cybersecurity-challenge\",
      \"auto_delete\": \"true\"
    }
  }" \
  'https://api.hetzner.cloud/v1/servers')

# Extract server details
SERVER_ID=$(echo $RESPONSE | jq -r '.server.id')
SERVER_IP=$(echo $RESPONSE | jq -r '.server.public_net.ipv4.ip')
ROOT_PASSWORD=$(echo $RESPONSE | jq -r '.root_password')

if [ "$SERVER_ID" = "null" ] || [ -z "$SERVER_ID" ]; then
    echo "Error creating server:"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "Server created successfully!"
echo "Server ID: $SERVER_ID"
echo "Server IP: $SERVER_IP"
echo "Root Password: $ROOT_PASSWORD"

# Save details to a file
OUTPUT_FILE="vm-${SERVER_ID}.json"
echo "{
  \"server_id\": \"$SERVER_ID\",
  \"server_ip\": \"$SERVER_IP\",
  \"username\": \"root\",
  \"password\": \"$ROOT_PASSWORD\",
  \"created_at\": \"$(date -Iseconds)\"
}" > $OUTPUT_FILE

echo "Details saved to: $OUTPUT_FILE"

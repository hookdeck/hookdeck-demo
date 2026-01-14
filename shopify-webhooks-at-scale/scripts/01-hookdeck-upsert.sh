#!/bin/bash

# Hookdeck CLI Connection Upsert Script
# This script creates or updates a Hookdeck connection with:
# - A webhook source
# - An HTTP destination
# - Topic filtering (orders/updated)
# - Deduplication based on X-Shopify-Event-Id header
# - Low throughput limit for backpressure demos

set -e  # Exit on any error

# Configuration
CONNECTION_NAME="shopify-orders"
SOURCE_NAME="shopify-orders-source"
DESTINATION_NAME="shopify-orders-destination"
OUTPUT_FILE="hookdeck-connection-output.json"

# Check if DESTINATION_URL is set
if [ -z "$DESTINATION_URL" ]; then
  echo "Error: DESTINATION_URL environment variable is not set"
  echo "Please set it to your publicly accessible destination URL (e.g., via ngrok)"
  exit 1
fi

echo "Creating/updating Hookdeck connection: $CONNECTION_NAME"
echo "Destination URL: $DESTINATION_URL"
echo ""

# Run hookdeck connection upsert command
# This command is idempotent - safe to run multiple times
hookdeck connection upsert "$CONNECTION_NAME" \
  --source-name "$SOURCE_NAME" \
  --source-type WEBHOOK \
  --destination-name "$DESTINATION_NAME" \
  --destination-type HTTP \
  --destination-url "$DESTINATION_URL" \
  --destination-rate-limit 5 \
  --destination-rate-limit-period second \
  --rule-filter-headers '.X-Shopify-Topic == "orders/updated"' \
  --rule-deduplicate-include-fields headers.X-Shopify-Event-Id \
  --output json > "$OUTPUT_FILE"

# Check if command succeeded
if [ $? -ne 0 ]; then
  echo "Error: hookdeck connection upsert failed"
  exit 1
fi

echo "Connection upserted successfully. JSON output saved to: $OUTPUT_FILE"
echo ""

# Extract source URL from JSON output
# Try multiple possible paths in case the structure varies
SOURCE_URL=$(jq -r '.source.url // .data.source.url // .connection.source.url // empty' "$OUTPUT_FILE" 2>/dev/null)

if [ -z "$SOURCE_URL" ] || [ "$SOURCE_URL" = "null" ]; then
  echo "Warning: Could not extract source URL from JSON output"
  echo "Please check the output file: $OUTPUT_FILE"
  echo "JSON structure:"
  cat "$OUTPUT_FILE" | jq '.' 2>/dev/null || cat "$OUTPUT_FILE"
  exit 1
fi

echo "=========================================="
echo "Hookdeck Source URL:"
echo "$SOURCE_URL"
echo "=========================================="
echo ""

# Get the script directory to find the shopify.app.toml file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOML_FILE="$SCRIPT_DIR/../shopify/shopify.app.toml"

# Check if shopify.app.toml file exists
if [ ! -f "$TOML_FILE" ]; then
  echo "Warning: shopify.app.toml file not found: $TOML_FILE"
  echo "Please ensure you have initialized the Shopify app in the shopify/ directory"
  echo "Skipping TOML file update"
else
  # Check if the file contains the placeholder
  if grep -q "{{HOOKDECK_URL}}" "$TOML_FILE"; then
    echo "Updating shopify.app.toml with Hookdeck source URL..."
    
    # Update the existing file by replacing the URI value for orders/updated webhook
    # Only replace the URI line that contains {{HOOKDECK_URL}} placeholder
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS uses BSD sed - replace only lines containing the placeholder
      sed -i '' "s|uri = \"{{HOOKDECK_URL}}\"|uri = \"$SOURCE_URL\"|g" "$TOML_FILE"
    else
      # Linux uses GNU sed
      sed -i "s|uri = \"{{HOOKDECK_URL}}\"|uri = \"$SOURCE_URL\"|g" "$TOML_FILE"
    fi
    
    echo "Updated shopify.app.toml file:"
    echo "  $TOML_FILE"
    echo ""
    echo "The Hookdeck source URL has been updated in the webhook configuration."
  else
    echo "Note: shopify.app.toml does not contain {{HOOKDECK_URL}} placeholder"
    echo "The file may have already been updated, or the webhook is not configured."
  fi
fi

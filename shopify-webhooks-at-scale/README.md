# Shopify Webhooks at Scale - Demo Harness

A deterministic demo harness for three Shopify webhook demonstrations used in technical meetup talks.

## Overview

This demo harness supports three key demonstrations:

1. **Setup Demo**: Use Hookdeck CLI to create a connection with deduplication and topic filtering
2. **Backpressure Demo**: Generate high-volume simulated webhooks to demonstrate backpressure handling
3. **Logs + Retry Demo**: Generate failures, filter events in logs, and retry them

## Prerequisites

- Node.js (v18 or higher)
- Hookdeck CLI installed and authenticated (`hookdeck login`)
- A publicly accessible URL for the destination server (e.g., via ngrok)
- `jq` installed for JSON parsing (macOS: `brew install jq`, Linux: `apt-get install jq`)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   # Required: Destination URL (must be publicly accessible)
   DESTINATION_URL=https://mock.hookdeck.com/webhook
   
   # Optional: Will be set by the upsert script
   HOOKDECK_SOURCE_URL=https://hkdk.events/your-source-id
   ```

3. **Set up Hookdeck connection**:
   ```bash
   ./scripts/01-hookdeck-upsert.sh
   ```
   
   This script will:
   - Create or update a Hookdeck connection
   - Extract the source URL from the JSON output
   - Automatically update `shopify/shopify.app.toml` with the Hookdeck source URL

4. **Verify Shopify webhook configuration**:
   - The `shopify/shopify.app.toml` file has been automatically updated with the Hookdeck source URL
   - The webhook subscription for `orders/updated` is configured to send to Hookdeck

## Demo Checklists

### Demo 1: Setup

**Objective**: Demonstrate setting up a Hookdeck connection with deduplication and topic filtering.

**Steps**:

1. Run the Hookdeck CLI upsert script:
   ```bash
   ./scripts/01-hookdeck-upsert.sh
   ```

2. Verify the connection appears in the Hookdeck dashboard
   - Connection name: `shopify-orders`
   - Source: `shopify-orders-source`
   - Destination: `shopify-orders-destination`
   - Rules: Topic filter (`orders/updated`) and deduplication (`X-Shopify-Event-Id`)

3. Verify the `shopify/shopify.app.toml` file has been updated
   - The script automatically replaces `{{HOOKDECK_URL}}` with the actual Hookdeck source URL
   - The webhook subscription for `orders/updated` should now point to your Hookdeck source

**Observable Behavior**:
- Connection appears in Hookdeck dashboard
- Source URL is valid and accessible
- Connection shows configured rules (filter + deduplication)

**Narration Cue**:
> "We use the Hookdeck CLI to create a connection with deduplication and topic filtering. The CLI creates the source, destination, and connection in a single idempotent command."

---

### Demo 2: Backpressure

**Objective**: Demonstrate how high-volume traffic creates backpressure and how to relieve it by adjusting throughput limits.

**Steps**:

1. Start the demo destination server:
   ```bash
   npm run destination
   ```
   Or:
   ```bash
   ts-node scripts/03-demo-destination.ts
   ```

2. Ensure the server is publicly accessible (e.g., via ngrok):
   ```bash
   ngrok http 3000
   ```
   Update `DESTINATION_URL` in `.env` with the ngrok URL.

3. Update the Hookdeck connection with the destination URL if needed:
   ```bash
   export DESTINATION_URL=https://your-ngrok-url.ngrok.io/webhook
   ./scripts/01-hookdeck-upsert.sh
   ```

4. Send a high-volume burst of simulated webhooks:
   ```bash
   npm run send:simulated -- --burst 300
   ```
   Or:
   ```bash
   ts-node scripts/02-send-simulated-webhooks.ts --burst 300
   ```

5. Show backpressure in the Hookdeck dashboard:
   - Navigate to the connection
   - Observe queued events
   - Note the throughput limit (5 requests/second)

6. Relieve backpressure by increasing the throughput limit:
   ```bash
   hookdeck connection upsert shopify-orders \
     --destination-rate-limit 50 \
     --destination-rate-limit-period second
   ```

7. Observe events clearing from the queue

**Observable Behavior**:
- Events queue up when throughput limit is reached
- Queue size increases during the burst
- After increasing the limit, events process and queue clears

**Narration Cue**:
> "High-volume traffic creates backpressure when the throughput limit is reached. We can adjust the throughput limit in real-time to relieve the backpressure and process the queued events."

---

### Demo 3: Logs + Retry

**Objective**: Demonstrate filtering failed events in logs and retrying them (single and bulk).

**Steps**:

1. Start the demo destination server in failure mode:
   ```bash
   FAILURE_MODE=always npm run destination
   ```
   Or:
   ```bash
   FAILURE_MODE=always ts-node scripts/03-demo-destination.ts
   ```

2. Send webhooks to generate failures:
   ```bash
   npm run send:simulated -- --burst 50
   ```

3. In the Hookdeck dashboard:
   - Navigate to the connection's events/logs
   - Filter for failed events (status: 500)
   - Observe the failed deliveries

4. Retry a single event:
   - Click on a failed event
   - Click "Retry" button
   - Observe the retry attempt

5. Retry multiple events (bulk):
   - Select multiple failed events
   - Click "Retry Selected" or "Bulk Retry"
   - Observe retry attempts

6. Switch destination to success mode:
   ```bash
   # In another terminal, restart the server
   FAILURE_MODE=none npm run destination
   ```

7. Retry the events again:
   - They should now succeed

**Observable Behavior**:
- Failed events appear in logs with 500 status
- Filtering shows only failed events
- Single retry works immediately
- Bulk retry processes multiple events
- After switching to success mode, retries succeed

**Narration Cue**:
> "Failed deliveries are visible in logs. We can filter for specific status codes and retry individual or bulk events. When the destination is fixed, retries succeed automatically."

---

## Scripts Reference

### `01-hookdeck-upsert.sh`

Creates or updates a Hookdeck connection with:
- Webhook source
- HTTP destination
- Topic filter (`orders/updated`)
- Deduplication (`X-Shopify-Event-Id` header)
- Low throughput limit (5 req/s) for backpressure demos

**Usage**:
```bash
export DESTINATION_URL=https://your-url.com/webhook
./scripts/01-hookdeck-upsert.sh
```

**Output**:
- Prints the Hookdeck source URL
- Provides a ready-to-paste `shopify.app.toml` snippet

### `02-send-simulated-webhooks.ts`

Sends simulated Shopify webhook requests to a Hookdeck source URL.

**Usage**:
```bash
# Using npm script
npm run send:simulated -- --burst 300 --duplicate-every 10

# Direct execution
ts-node scripts/02-send-simulated-webhooks.ts --burst 300 --topic orders/updated
```

**Options**:
- `--burst <number>`: Number of webhooks to send (default: 300)
- `--duplicate-every <number>`: Reuse same event ID every N requests (default: 0 = unique IDs)
- `--topic <string>`: Webhook topic (default: `orders/updated`)

**Environment Variables**:
- `HOOKDECK_SOURCE_URL`: Required - Hookdeck source URL
- `SHOPIFY_CLIENT_SECRET`: Optional - For HMAC signature generation
- `BURST_SIZE`: Default burst size
- `DUPLICATE_EVERY`: Default duplicate frequency
- `TOPIC`: Default topic

### `03-demo-destination.ts`

Demo destination server that receives webhooks and supports configurable failure modes.

**Usage**:
```bash
# Using npm script
npm run destination

# Direct execution
ts-node scripts/03-demo-destination.ts
```

**Failure Modes** (via `FAILURE_MODE` environment variable):
- `none` (default): Always return 200
- `always`: Always return 500
- `first-N`: Fail first N requests, then succeed (set `FAILURE_COUNT=10`)
- `percentage`: Fail at fixed percentage (set `FAILURE_PERCENT=50`)

**Environment Variables**:
- `PORT`: Server port (default: 3000)
- `FAILURE_MODE`: Failure mode (default: `none`)
- `FAILURE_COUNT`: Number of requests to fail in `first-N` mode (default: 10)
- `FAILURE_PERCENT`: Percentage of requests to fail in `percentage` mode (default: 50)

**Endpoints**:
- `POST /webhook`: Webhook delivery endpoint
- `GET /health`: Health check endpoint

## Troubleshooting

### Hookdeck CLI not found
```bash
npm install -g hookdeck
hookdeck login
```

### jq not found
- macOS: `brew install jq`
- Linux: `apt-get install jq` or `yum install jq`

### Destination not accessible
Ensure your destination server is publicly accessible. Use ngrok or similar:
```bash
ngrok http 3000
```

### Connection upsert fails
- Verify you're logged into Hookdeck: `hookdeck whoami`
- Check that `DESTINATION_URL` is set and valid
- Ensure the destination URL is publicly accessible

### Webhooks not reaching destination
- Verify the destination URL in the Hookdeck connection matches your server
- Check that the server is running and accessible
- Review Hookdeck logs for delivery errors

## License

ISC

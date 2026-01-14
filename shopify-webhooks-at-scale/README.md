# Shopify Webhooks at Scale - Demo Harness

A deterministic demo harness for three Shopify webhook demonstrations used in technical meetup talks.

## Overview

This demo harness supports three key demonstrations:

1. **Setup Demo**: Use Hookdeck CLI to create production and development connections with deduplication and topic filtering
2. **Backpressure Demo**: Generate high-volume simulated webhooks to demonstrate backpressure handling
3. **Logs + Retry Demo**: Production deployment with payload-based failures, local debugging via CLI connection, and retry functionality

## Prerequisites

- Node.js (v18 or higher)
- Hookdeck CLI installed and authenticated (`hookdeck login`)
- A publicly accessible URL for the destination server (e.g., Vercel deployment, mock.hookdeck.com, or ngrok)
- `jq` installed for JSON parsing (macOS: `brew install jq`, Linux: `apt-get install jq`)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   cd shopify && npm install && cd ..
   ```

2. **Configure environment variables**:
   Create a `.env` file in the project root:
   ```bash
   # Required: Destination URL (must be publicly accessible)
   # Can be Vercel deployment, mock.hookdeck.com, or any public URL
   DESTINATION_URL=https://your-url.com/webhook
   
   # Optional: Will be set by the upsert script
   HOOKDECK_SOURCE_URL=https://hkdk.events/your-source-id
   ```

3. **Set up Hookdeck connections** (First step - generates shopify.app.toml):
   ```bash
   ./scripts/01-hookdeck-upsert.sh
   ```
   
   This script will:
   - Create or update two Hookdeck connections:
     - `shopify-orders-prod` - HTTP destination (for production)
     - `shopify-orders-dev` - CLI destination (for local debugging)
   - Both connections share the same source and filter rules
   - Extract the source URL from the JSON output
   - Generate `shopify/shopify.app.toml` from the template with the Hookdeck source URL
   
   **Note**: The generated file will have `client_id = "YOUR_CLIENT_ID"` as a placeholder.

4. **Set up your Shopify app**:
   
   Now that `shopify/shopify.app.toml` exists, you need to connect it to a Shopify app in your Partners account. You have two options:
   
   **Option A: Let Shopify CLI create the app (Recommended)**
   ```bash
   cd shopify
   shopify app dev --reset
   ```
   The `--reset` flag will:
   - Create a new app in your Partners account
   - Update the `client_id` in the existing `shopify.app.toml` file
   - Set up authentication and environment variables
   - Start the development server
   
   Press `Ctrl+C` to stop the dev server after the app is created.
   
   **Option B: Manually create the app**
   1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
   2. Create a new app
   3. Copy the **Client ID** from the app settings
   4. Edit `shopify/shopify.app.toml` and replace `YOUR_CLIENT_ID` with your actual client ID

5. **Verify Shopify webhook configuration**:
   - Check that `shopify/shopify.app.toml` has your actual `client_id` (not `YOUR_CLIENT_ID`)
   - Verify the order webhook subscriptions (all events starting with `orders/`) point to your Hookdeck source URL
   - If you need to regenerate the file later, the script will preserve your `client_id`

## Demo Checklists

### Demo 1: Setup

**Objective**: Demonstrate setting up Hookdeck connections with deduplication and topic filtering for all order events.

**Steps**:

1. Run the Hookdeck CLI upsert script:
   ```bash
   ./scripts/01-hookdeck-upsert.sh
   ```

2. Verify both connections appear in the Hookdeck dashboard:
   - **Production connection**: `shopify-orders-prod`
     - Source: `shopify-orders-source`
     - Destination: `shopify-orders-prod-destination` (HTTP)
     - Rules: Topic filter (all `orders/*` events) and deduplication (`X-Shopify-Event-Id`)
   - **Development connection**: `shopify-orders-dev`
     - Source: Same as production (shared)
     - Destination: `shopify-orders-dev-destination` (CLI)
     - Rules: Same as production

3. Verify the `shopify/shopify.app.toml` file has been updated
   - The script automatically replaces `{{HOOKDECK_URL}}` with the actual Hookdeck source URL
   - The webhook subscriptions for all order events should now point to your Hookdeck source

**Observable Behavior**:
- Two connections appear in Hookdeck dashboard
- Source URL is valid and accessible
- Both connections show configured rules (filter + deduplication)
- Filter matches all `orders/*` events (orders/create, orders/updated, orders/paid, etc.)

**Narration Cue**:
> "We use the Hookdeck CLI to create two connections: one for production with an HTTP destination, and one for development with a CLI destination for local debugging. Both share the same source and have deduplication and topic filtering configured for all order events."

---

### Demo 2: Backpressure

**Objective**: Demonstrate how high-volume traffic creates backpressure and how to relieve it by adjusting throughput limits.

**Steps**:

1. Ensure `DESTINATION_URL` in `.env` points to a publicly accessible endpoint:
   ```bash
   # Can be Vercel deployment, mock.hookdeck.com, or ngrok
   DESTINATION_URL=https://your-url.com/webhook
   ```

2. Update the production connection if the destination URL changed:
   ```bash
   ./scripts/01-hookdeck-upsert.sh
   ```

3. Send a high-volume burst of simulated webhooks:
   ```bash
   npm run send:simulated -- --burst 300
   ```
   Or:
   ```bash
   ts-node scripts/02-send-simulated-webhooks.ts --burst 300
   ```

4. Show backpressure in the Hookdeck dashboard:
   - Navigate to the `shopify-orders-prod` connection
   - Observe queued events
   - Note the throughput limit (5 requests/second)

5. Relieve backpressure by increasing the throughput limit:
   ```bash
   hookdeck connection upsert shopify-orders-prod \
     --destination-rate-limit 50 \
     --destination-rate-limit-period second
   ```

6. Observe events clearing from the queue

**Observable Behavior**:
- Events queue up when throughput limit is reached
- Queue size increases during the burst
- After increasing the limit, events process and queue clears

**Narration Cue**:
> "High-volume traffic creates backpressure when the throughput limit is reached. We can adjust the throughput limit in real-time to relieve the backpressure and process the queued events."

---

### Demo 3: Logs + Retry

**Objective**: Demonstrate production failures, local debugging via CLI connection, fixing the issue, and retrying failed events.

**Prerequisites**:
- Production destination deployed (e.g., Vercel)
- Production connection (`shopify-orders-prod`) configured with production URL

**Steps**:

1. **Deploy production destination** (if not already deployed):
   - Deploy `scripts/03-demo-destination.ts` to Vercel or similar
   - Set `FAILURE_MODE=missing-phone` environment variable
   - Update `DESTINATION_URL` in `.env` to point to production URL
   - Run `./scripts/01-hookdeck-upsert.sh` to update the production connection

2. **Send events that trigger failures**:
   ```bash
   # Send events without customer.phone to trigger failures
   npm run send:simulated -- --burst 50 --no-customer-phone
   ```
   Or:
   ```bash
   ts-node scripts/02-send-simulated-webhooks.ts --burst 50 --no-customer-phone
   ```

3. **Show failures in Hookdeck dashboard**:
   - Navigate to the `shopify-orders-prod` connection's events/logs
   - Filter for failed events (status: 500)
   - Observe the failed deliveries with error message "Missing customer.phone field"

4. **Use CLI connection for local debugging**:
   ```bash
   # Start local destination server in missing-phone mode
   FAILURE_MODE=missing-phone npm run destination
   ```
   
   In another terminal:
   ```bash
   # Use the CLI connection to retry events locally
   hookdeck listen 3000 shopify-orders-source
   ```

5. **Replicate the problem locally**:
   - Send a test event without customer.phone to the CLI connection
   - Observe the failure in local server logs
   - Confirm the issue: missing `customer.phone` field

6. **Fix the issue locally**:
   - Update the local destination server to handle missing phone gracefully
   - Test with events that include customer.phone
   - Verify the fix works

7. **Push fix to production**:
   - Deploy the updated destination server
   - Update production environment variables if needed

8. **Retry failed events on production connection**:
   - In Hookdeck dashboard, select failed events
   - Click "Retry Selected" or "Bulk Retry"
   - Observe retry attempts succeeding

9. **Verify all events are processed**:
   - Check that all previously failed events are now successful
   - Show the event timeline in Hookdeck dashboard

**Observable Behavior**:
- Failed events appear in logs with 500 status and clear error message
- Filtering shows only failed events
- CLI connection allows local debugging and testing
- After fixing and deploying, retries succeed
- Bulk retry processes multiple events efficiently

**Narration Cue**:
> "When production events fail, we can see them clearly in Hookdeck logs with specific error messages. We use the CLI connection to replicate the issue locally, fix it, and then retry the failed events. Hookdeck automatically retries with the fixed destination, ensuring no events are lost."

---

## Scripts Reference

### `01-hookdeck-upsert.sh`

Creates or updates two Hookdeck connections:
- `shopify-orders-prod` - HTTP destination (for production)
- `shopify-orders-dev` - CLI destination (for local debugging)

Both connections have:
- Shared webhook source
- Topic filter (all `orders/*` events)
- Deduplication (`X-Shopify-Event-Id` header)
- Low throughput limit (5 req/s) for backpressure demos

**Usage**:
```bash
export DESTINATION_URL=https://your-url.com/webhook
./scripts/01-hookdeck-upsert.sh
```

**Output**:
- Prints the Hookdeck source URL
- Generates `shopify/shopify.app.toml` from template
- Preserves existing `client_id` if present

### `02-send-simulated-webhooks.ts`

Sends simulated Shopify webhook requests to a Hookdeck source URL.

**Usage**:
```bash
# Using npm script
npm run send:simulated -- --burst 300 --topic orders/create --no-customer-phone

# Direct execution
ts-node scripts/02-send-simulated-webhooks.ts --burst 300 --topic orders/updated
```

**Options**:
- `--burst <number>`: Number of webhooks to send (default: 300)
- `--duplicate-every <number>`: Reuse same event ID every N requests (default: 0 = unique IDs)
- `--topic <string>`: Webhook topic (default: `orders/updated`)
  - Supported: `orders/create`, `orders/updated`, `orders/paid`, `orders/cancelled`, etc.
- `--no-customer-phone`: Exclude customer.phone from payload (for failure scenarios)
- `--with-customer-phone`: Include customer.phone in payload (default)

**Environment Variables**:
- `HOOKDECK_SOURCE_URL`: Required - Hookdeck source URL
- `SHOPIFY_CLIENT_SECRET`: Optional - For HMAC signature generation
- `BURST_SIZE`: Default burst size
- `DUPLICATE_EVERY`: Default duplicate frequency
- `TOPIC`: Default topic
- `INCLUDE_CUSTOMER_PHONE`: Set to "false" to exclude customer.phone (default: true)

### `03-demo-destination.ts`

Demo destination server that receives webhooks and supports payload-based failure detection.

**Usage**:
```bash
# Using npm script
npm run destination

# Direct execution
ts-node scripts/03-demo-destination.ts
```

**Failure Modes** (via `FAILURE_MODE` environment variable):
- `none` (default): Always return 200
- `missing-phone`: Return 500 when `customer.phone` is missing or null

**Environment Variables**:
- `PORT`: Server port (default: 3000)
- `FAILURE_MODE`: Failure mode (default: `none`)

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
Ensure your destination server is publicly accessible. Options:
- Deploy to Vercel, Railway, or similar
- Use `https://mock.hookdeck.com` for testing
- Use ngrok for local testing: `ngrok http 3000`

### Connection upsert fails
- Verify you're logged into Hookdeck: `hookdeck whoami`
- Check that `DESTINATION_URL` is set and valid
- Ensure the destination URL is publicly accessible

### Webhooks not reaching destination
- Verify the destination URL in the Hookdeck connection matches your server
- Check that the server is running and accessible
- Review Hookdeck logs for delivery errors

### CLI connection not working
- Verify the `shopify-orders-dev` connection exists in Hookdeck dashboard
- Ensure you're using the correct source name: `hookdeck listen 3000 shopify-orders-source`
- Check that the local server is running on the correct port

## License

ISC

# Hookdeck Deduplication Demo - Sender-Only

This guide explains how to run the TypeScript demo scripts to demonstrate **deduplication** in the Hookdeck Event Gateway by sending events directly to Hookdeck Sources.

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Setup Hookdeck Connection

In the Hookdeck Event Gateway:
- Create or select a **Source**
- Create a **Connection** from that Source to your destination. For simplicity, use a **Mock** destination
- Copy your Source URL (format: `https://events.hookdeck.com/e/src_XXXX`)

---

## 3. Send baseline duplicates (dedupe OFF)

Make sure deduplication is **disabled** in the Source settings in the dashboard.

Then run:

```bash
# Two identical payloads
npm run send:dupe:same-payload -- --url https://events.hookdeck.com/e/src_XXXX

# Or two events with the same event_id
npm run send:dupe:same-id -- --url https://events.hookdeck.com/e/src_XXXX
```

**Expected:** **Two events** are sent to Hookdeck and **two deliveries** are made to the Destination.

---

## 4. Enable deduplication (dashboard)

In the Hookdeck Console:
- Open the Source
- Turn on **Deduplication**
  - Use **Payload hash** if running `send:dupe:same-payload`
  - Use **Field: event_id** if running `send:dupe:same-id`

---

## 5. Re-send duplicates (dedupe ON)

Run the same script again:

```bash
npm run send:dupe:same-payload -- --url https://events.hookdeck.com/e/src_XXXX
# or
npm run send:dupe:same-id -- --url https://events.hookdeck.com/e/src_XXXX
```

**Expected:**
- **Two events** are sent to Hookdeck but **only one delivery** is made to the destination
- In the Hookdeck Console → Events, the duplicate is marked as **discarded**

---

## 6. Optional: send a burst with duplicates

```bash
npm run send:flood -- --url https://events.hookdeck.com/e/src_XXXX --count 25 --dupePercent 60
```

This sends multiple events with a specified percentage of duplicates, useful for demonstrating deduplication at scale.

---

## 7. Additional Scripts

### Send a single event
```bash
npm run send:one -- --url https://events.hookdeck.com/e/src_XXXX
```

---

## 8. Cleanup

- Rotate the Source URL if you shared it during demos

---

## 9. Talking points for demo

- "I'm sending duplicate events to Hookdeck - notice both are being delivered to the destination."
- "Now I'll enable deduplication in the Hookdeck dashboard."
- "When I send the same duplicates again, only one delivery reaches the destination, and duplicates are discarded at the gateway."
- "At scale, this prevents retry storms, duplicate processing, and wasted resources."

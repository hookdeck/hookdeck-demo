import * as dotenv from "dotenv";
import express, { Request, Response } from "express";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || "3000");
const FAILURE_MODE = process.env.FAILURE_MODE || "none";
const FAILURE_COUNT = parseInt(process.env.FAILURE_COUNT || "10");
const FAILURE_PERCENT = parseInt(process.env.FAILURE_PERCENT || "50");

// Track request count for failure modes
let requestCount = 0;

// Format timestamp for logging
function formatTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `[${hours}:${minutes}:${seconds}]`;
}

// Determine if this request should fail based on failure mode
function shouldFail(): boolean {
  requestCount++;

  switch (FAILURE_MODE.toLowerCase()) {
    case "always":
      return true;

    case "first-n":
      return requestCount <= FAILURE_COUNT;

    case "percentage":
      return requestCount % 100 < FAILURE_PERCENT;

    case "none":
    default:
      return false;
  }
}

// Webhook endpoint
app.post("/webhook", (req: Request, res: Response) => {
  const eventId = (req.headers["x-shopify-event-id"] as string) || "unknown";
  const topic = (req.headers["x-shopify-topic"] as string) || "unknown";
  const shopDomain =
    (req.headers["x-shopify-shop-domain"] as string) || "unknown";
  const timestamp = formatTime();

  // Log the incoming webhook
  console.log(
    `${timestamp} <- Received: ${topic} | Event ID: ${eventId} | Shop: ${shopDomain}`
  );

  // Determine if we should fail this request
  const fail = shouldFail();

  if (fail) {
    console.log(`${timestamp} ✗ Returning 500 (failure mode: ${FAILURE_MODE})`);
    res.status(500).json({
      error: "Intentional failure for demo purposes",
      failure_mode: FAILURE_MODE,
      request_count: requestCount,
    });
  } else {
    console.log(`${timestamp} ✓ Returning 200`);
    res.status(200).json({
      status: "received",
      event_id: eventId,
      topic: topic,
      shop_domain: shopDomain,
    });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    failure_mode: FAILURE_MODE,
    request_count: requestCount,
  });
});

// Start server
app.listen(PORT, () => {
  console.log("==========================================");
  console.log("Demo Destination Server");
  console.log("==========================================");
  console.log(`Listening on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log("");
  console.log("Configuration:");
  console.log(`  FAILURE_MODE: ${FAILURE_MODE}`);
  if (FAILURE_MODE === "first-n") {
    console.log(`  FAILURE_COUNT: ${FAILURE_COUNT}`);
  }
  if (FAILURE_MODE === "percentage") {
    console.log(`  FAILURE_PERCENT: ${FAILURE_PERCENT}%`);
  }
  console.log("");
  console.log("Failure Modes:");
  console.log("  none       - Always return 200 (default)");
  console.log("  always     - Always return 500");
  console.log("  first-N    - Fail first N requests, then succeed");
  console.log("  percentage - Fail at fixed percentage");
  console.log("");
  console.log("To change failure mode, set FAILURE_MODE environment variable");
  console.log("and restart the server.");
  console.log("==========================================");
  console.log("");
});

// Handle errors
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down server...");
  process.exit(0);
});

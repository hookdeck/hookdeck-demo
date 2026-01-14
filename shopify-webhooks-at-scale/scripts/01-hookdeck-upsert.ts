import * as dotenv from "dotenv";
import { resolve } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

// Load environment variables from .env file in project root
dotenv.config({ path: resolve(process.cwd(), ".env") });

// Configuration constants
const PROD_CONNECTION_NAME = "shopify-orders-prod-conn";
const DEV_CONNECTION_NAME = "shopify-orders-dev-conn";
const SOURCE_NAME = "shopify-orders";
const PROD_DESTINATION_NAME = "shopify-orders-prod";
const DEV_DESTINATION_NAME = "shopify-orders-dev";

// Validate required environment variables
if (!process.env.HOOKDECK_API_KEY) {
  console.error("Error: HOOKDECK_API_KEY environment variable is not set");
  console.error(
    "Please set it in your .env file or as an environment variable"
  );
  process.exit(1);
}

if (!process.env.DESTINATION_URL) {
  console.error("Error: DESTINATION_URL environment variable is not set");
  console.error(
    "Please set it in your .env file or as an environment variable"
  );
  console.error("Example: DESTINATION_URL=https://your-url.com/webhook");
  process.exit(1);
}

if (!process.env.SHOPIFY_CLIENT_SECRET) {
  console.error("Error: SHOPIFY_CLIENT_SECRET environment variable is not set");
  console.error(
    "Please set it in your .env file or as an environment variable"
  );
  console.error(
    "Example: SHOPIFY_CLIENT_SECRET=your_shopify_webhook_secret_here"
  );
  process.exit(1);
}

// Types for API responses
interface HookdeckSource {
  id: string;
  url: string;
  name: string;
  type: string;
}

interface HookdeckDestination {
  id: string;
  name: string;
  type: string;
}

interface HookdeckConnection {
  id: string;
  name: string;
  source: HookdeckSource;
  destination: HookdeckDestination;
}

// API client function
async function upsertConnection(payload: any): Promise<HookdeckConnection> {
  const response = await fetch(
    "https://api.hookdeck.com/2025-07-01/connections",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.HOOKDECK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API request failed with status ${response.status}: ${errorBody}`
    );
  }

  return await response.json();
}

// Main function
async function main() {
  console.log("Creating/updating Hookdeck connections...");
  console.log(`Production connection: ${PROD_CONNECTION_NAME}`);
  console.log(`Development connection: ${DEV_CONNECTION_NAME}`);
  console.log(`Destination URL: ${process.env.DESTINATION_URL}`);
  console.log("");

  // Build rules array for filtering and deduplication
  // Filter: All events where x-shopify-topic starts with "orders/"
  // Deduplicate: Based on X-Shopify-Event-Id header with 60 second window
  const rules = [
    {
      type: "filter",
      headers: {
        "x-shopify-topic": {
          $startsWith: "orders/",
        },
      },
    },
    {
      type: "deduplicate",
      include_fields: ["headers.X-Shopify-Event-Id"],
      window: 60000, // 60 seconds in milliseconds
    },
  ];

  // Step 1: Create/update production connection (HTTP destination)
  console.log(
    `Creating/updating production connection: ${PROD_CONNECTION_NAME}`
  );

  const prodConnectionPayload = {
    name: PROD_CONNECTION_NAME,
    source: {
      name: SOURCE_NAME,
      type: "SHOPIFY",
      config: {
        auth: {
          webhook_secret_key: process.env.SHOPIFY_CLIENT_SECRET,
        },
      },
    },
    destination: {
      name: PROD_DESTINATION_NAME,
      type: "HTTP",
      config: {
        url: process.env.DESTINATION_URL,
        rate_limit: 5,
        rate_limit_period: "second",
      },
    },
    rules: rules,
  };

  let prodConnection: HookdeckConnection;
  try {
    prodConnection = await upsertConnection(prodConnectionPayload);
    console.log("Production connection upserted successfully.");
    console.log("");
  } catch (error: any) {
    console.error(
      "Error: hookdeck connection upsert failed for production connection"
    );
    console.error(error.message);
    process.exit(1);
  }

  // Extract source URL and ID from production connection
  const sourceUrl = prodConnection.source.url;
  const sourceId = prodConnection.source.id;

  if (!sourceUrl || !sourceId) {
    console.error(
      "Error: Could not extract source URL or ID from API response"
    );
    console.error(
      "Response structure:",
      JSON.stringify(prodConnection, null, 2)
    );
    process.exit(1);
  }

  console.log("==========================================");
  console.log("Hookdeck Source URL:");
  console.log(sourceUrl);
  console.log(`Source ID: ${sourceId}`);
  console.log("==========================================");
  console.log("");

  // Step 2: Create/update development connection (CLI destination) reusing the same source
  console.log(
    `Creating/updating development connection: ${DEV_CONNECTION_NAME}`
  );
  console.log(`Reusing source: ${sourceId}`);
  console.log("");

  const devConnectionPayload = {
    name: DEV_CONNECTION_NAME,
    source_id: sourceId, // Reuse the source from production connection
    destination: {
      name: DEV_DESTINATION_NAME,
      type: "CLI",
      config: {
        path: "/webhooks/shopify",
      },
    },
    rules: rules, // Same rules as production
  };

  let devConnection: HookdeckConnection;
  try {
    devConnection = await upsertConnection(devConnectionPayload);
    console.log("Development connection upserted successfully.");
    console.log("");
  } catch (error: any) {
    console.error(
      "Error: hookdeck connection upsert failed for development connection"
    );
    console.error(error.message);
    process.exit(1);
  }

  console.log("==========================================");
  console.log("Both connections created successfully!");
  console.log("==========================================");
  console.log(`Production: ${PROD_CONNECTION_NAME} (HTTP destination)`);
  console.log(`Development: ${DEV_CONNECTION_NAME} (CLI destination)`);
  console.log("");
  console.log("To use the CLI connection for local debugging, run:");
  console.log(`  hookdeck listen 3000 ${SOURCE_NAME}`);
  console.log("==========================================");
  console.log("");

  // Step 3: Generate shopify.app.toml from template
  const templatePath = resolve(
    process.cwd(),
    "shopify",
    "shopify.app.toml.template"
  );
  const outputPath = resolve(process.cwd(), "shopify", "shopify.app.toml");

  if (!existsSync(templatePath)) {
    console.log(`Warning: Template file not found: ${templatePath}`);
    console.log("Skipping TOML file generation");
    return;
  }

  // Check if output file already exists and extract existing client_id
  let existingClientId: string | null = null;
  if (existsSync(outputPath)) {
    const existingContent = readFileSync(outputPath, "utf-8");
    const clientIdMatch = existingContent.match(/^client_id = "([^"]+)"/m);
    if (clientIdMatch && clientIdMatch[1] !== "YOUR_CLIENT_ID") {
      existingClientId = clientIdMatch[1];
      console.log(`Found existing client_id in ${outputPath}`);
      console.log("This will regenerate the file but preserve your client_id.");
      console.log("");
    } else {
      console.log(`Warning: The file ${outputPath} already exists.`);
      console.log(
        "This will regenerate it from the template with the new Hookdeck source URL."
      );
      console.log("");
    }
  }

  // Read template and replace placeholder
  let templateContent = readFileSync(templatePath, "utf-8");
  templateContent = templateContent.replace(/{{HOOKDECK_URL}}/g, sourceUrl);

  // Restore existing client_id if it was found
  if (existingClientId) {
    templateContent = templateContent.replace(
      /^client_id = ".*"/m,
      `client_id = "${existingClientId}"`
    );
  }

  // Write the generated file
  writeFileSync(outputPath, templateContent, "utf-8");

  console.log(`Generated shopify.app.toml file:`);
  console.log(`  ${outputPath}`);
  console.log("");

  // Check if client_id is still the placeholder
  if (templateContent.includes('client_id = "YOUR_CLIENT_ID"')) {
    console.log("⚠️  WARNING: The client_id is still set to 'YOUR_CLIENT_ID'");
    console.log(
      "   You need to update it with your actual Shopify app client ID."
    );
    console.log("");
    console.log("   To get your client ID:");
    console.log(
      "   1. Run 'cd shopify && shopify app dev --reset' (recommended - creates app automatically)"
    );
    console.log(
      "   2. Or create an app at https://partners.shopify.com and copy the Client ID"
    );
    console.log(`   3. Then edit ${outputPath} and replace YOUR_CLIENT_ID`);
    console.log("");
  }

  console.log(
    "The file has been created from the template with the Hookdeck source URL."
  );
  console.log("You can now use this file in your Shopify app configuration.");
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

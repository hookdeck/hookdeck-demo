# Hookdeck Demo Repository

This repository contains demonstration code for [Hookdeck](https://hookdeck.com), showcasing how to integrate and manage webhooks from various services like Stripe and Shopify.

## Stripe Fetch Before Process

The `stripe-fetch-before-process/` directory contains an Express.js application that demonstrates a common pattern for handling webhooks: fetching the latest state from the events API before processing.

See the [README](stripe-fetch-before-process/README.md) in the `stripe-fetch-before-process/` directory for more details.

## `general/` Directory

The `general/` directory contains a Next.js application designed to receive and verify webhooks.

### Purpose of `general/src`

The `src` directory holds the core source code for the Next.js application, including API routes and libraries for handling webhooks.

-   **`src/app/api/`**: This is where the API endpoints are defined.
    -   `shopify/route.ts`: Handles incoming Shopify webhooks, including signature verification to ensure they are legitimate.
    -   `stripe/route.ts`: Manages Stripe webhooks with signature verification.
    -   `stripe/invoices/route.ts`: A specific endpoint for Stripe invoice-related webhooks.
    -   `stripe/subscriptions/route.ts`: A dedicated endpoint for Stripe subscription events.
-   **`src/lib/`**: Contains utility functions.
    -   `verify-hookdeck.ts`: A crucial utility for verifying the signature of webhooks forwarded by Hookdeck, ensuring they have not been tampered with.

### Purpose of `general/scripts`

The `scripts` directory contains scripts for automating demo setup and event triggering.

-   **`delete_all.ts`**: A cleanup script that removes all sources and destinations from your Hookdeck account and deletes local Terraform state files. This is useful for resetting the demo environment.
-   **`shopify/trigger.ts`**: Triggers a sample Shopify `orders/create` event to a specified URL, allowing you to test the Shopify webhook endpoint.
-   **`stripe/batch.sh`**: A shell script that uses the Stripe CLI to trigger a variety of Stripe events for both invoices and subscriptions. This is useful for simulating a high volume of events to test your webhook handling logic.

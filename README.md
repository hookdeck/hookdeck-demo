# Hookdeck Demo Repository

This repository contains code for using [Hookdeck](https://hookdeck.com), used in various demos.

## Stripe Fetch Before Process

The `stripe-fetch-before-process/` directory contains an Express.js application that demonstrates a common pattern for handling webhooks: fetching the latest state from the events API before processing.

See the [README](stripe-fetch-before-process/README.md) in the `stripe-fetch-before-process/` directory for more details.

## Shopify Webhooks at Scale

The `shopify-webhooks-at-scale/` directory contains a complete Shopify app demo that showcases Hookdeck's webhook management capabilities with Shopify's order webhooks. This demo covers three key scenarios: setup and configuration, backpressure handling, and logs/retry workflows.

### Key Features

- **Deterministic setup**: TypeScript script that uses the Hookdeck API to create connections and automatically configures Shopify webhook subscriptions
- **Integrated webhook handling**: Webhook handlers built directly into the Shopify React Router app (no separate server needed)
- **Realistic error scenarios**: Simulates real-world application failures (e.g., missing customer phone number) for demonstrating retry workflows
- **Multi-vendor webhook path**: Uses `/webhooks/shopify/orders` to emphasize a multi-vendor webhook architecture
- **Local development support**: Hookdeck CLI destination for local debugging and testing

### Demo Scenarios

1. **Setup & Configuration**: Automated connection creation, webhook subscription injection, and environment variable management
2. **Backpressure**: Demonstrates rate limiting, topic filtering, and destination throughput control
3. **Logs & Retry**: Shows how to debug failed webhooks locally, fix application code, and retry events in bulk

### Usage

See the [README](shopify-webhooks-at-scale/README.md) in the `shopify-webhooks-at-scale/` directory for detailed setup instructions, demo walkthroughs, and configuration options.

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


## Deduplication Demo

The `deduplication/` directory contains a TypeScript application for demonstrating Hookdeck's deduplication capabilities. This is a sender-only demo that sends events to Hookdeck Sources to test deduplication functionality.

### Key Features

-   **`src/sendOne.ts`**: Single event sender for testing basic event delivery
-   **`src/sendDupes.ts`**: Duplicate event sender with both payload-based and ID-based deduplication modes
-   **`src/sendFlood.ts`**: Burst sender with configurable duplicate percentage for load testing
-   **`src/utils/args.ts`**: Command-line argument parsing utilities for flexible script configuration

### Usage

See the [README](deduplication/README.md) in the `deduplication/` directory for detailed usage instructions and configuration options.

## Transformation Reording Demo

The `transformation-reording/` directory contains a TypeScript scripts for demonstrating Hookdeck transformations and filter rule reordering.

### Purpose

This demo is designed for testing different scenarios with sample events, allowing you to understand how reordering Hookdeck Transformation and Filtering rules works in various subscription-related workflows.

### Key Components

-   **TypeScript sender scripts**: Located in `src/` directory for sending different event types
-   **Environment configuration**: Uses `HOOKDECK_ENDPOINT_URL` for directing events to your Hookdeck endpoint

### Available Scripts

-   **`trigger:paused-subscription`**: Sends paused subscription events using the sample data
-   **`trigger:trial-ending-soon`**: Sends trial ending notification events
-   **`trigger:generic-update`**: Sends generic update events for general testing
-   **`trigger:all`**: Runs all trigger scripts sequentially for comprehensive testing

### Usage

Use the NPM scripts defined in the `package.json` to trigger events and test the transformation and reordering capabilities. See the [README](transformation-reording/README.md) in the `transformation-reording/` directory for detailed setup instructions and configuration options.

## Deepgram AI Demos

The `ai/deepgram/` directory contains interactive demos showcasing Deepgram's AI APIs integrated with Hookdeck's webhook management platform.

### Speech-to-Text (STT) Demo

A fully functional browser-based demo that demonstrates asynchronous webhook processing with Hookdeck:

-   **Browser audio recording**: Capture audio directly in your browser using the MediaRecorder API
-   **File upload**: Support for WebM, WAV, MP3, and OGG formats (up to 50MB)
-   **Webhook-based processing**: Audio is sent to Deepgram's STT API with a callback URL pointing to Hookdeck
-   **Real-time transcriptions**: Hookdeck forwards JSON transcription results to your local server
-   **Auto-refresh UI**: Automatically updates when transcriptions are complete
-   **Multiple models**: Choose from Nova-2, Enhanced, Base, and specialized models

This demo highlights Hookdeck's ability to manage JSON webhook callbacks, providing observability, retry logic, and local development support for asynchronous AI processing workflows.

### Key Features

-   **Idempotent setup**: Uses `hookdeck connection upsert` for reproducible configuration
-   **Dual demo support**: Separate Hookdeck sources for STT (working) and TTS (documentation)
-   **Request tracking**: JSON-based persistence for transcription history
-   **TypeScript + Express**: Modern stack with type safety and modular router architecture

### Usage

See the [README](ai/deepgram/README.md) in the `ai/deepgram/` directory for detailed setup instructions, Hookdeck configuration, and usage examples.

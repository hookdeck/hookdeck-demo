# Hookdeck Demo

Work-in-progress repository for code to be used when demoing Hookdeck.

## Setup

Create a `.env` with the following:

```
SHOPIFY_CUSTOMER_PHONE_NUMBER={PHONE_NUMBER}
```

## Walkthroughs

### General

1. What is Hookdeck
   1. Event Gateway overview
   2. Key use cases
      1. Inbound webhooks
      2. Outbound webhooks
      3. Async API Gateway
      4. Connecting services
      5. Generally, a serverless queue for connecting services
2. Creation connection demo
   1. Choose Source Type / highlight authentication
   2. Select Destination Type of mock for testing purposes
   3. Make cURL command and see event arrive `npm run shopify:trigger`
   4. Demo localhost development
      1. Run local server
      2. Use Hookdeck CLI to listen and forward events
      3. Show updated dashboard with CLI connection
      4. Deliver event to localhost via cURL
      5. Show/demo replay event
   5. Create a new Destination of type HTTP and deploy
      1. Deploy from local and get URL
      2. Update Destination URL to https://hookdeck-demo.vercel.app/api/shopify
      3. Deliver event to PROD
3. Connect service demo
   1. Create a new connection and reused the existing Source
   2. Create a new destination with URL and required auth
   3. Use a filter to only trigger on a specific type of event
   4. Use a transformation to change the webhook payload to outbound API payload
   5. Trigger event and see the result
4. Highlight Hookdeck Terraform provider for managing Hookdeck resources
5. Demonstrate issues
   1. Update code to have breaking bug and deploy YOLO
   2. cURL to push an event
   3. See issue being raised
   4. Acknowledge
   5. Pause the connection to stop any more events going through
   6. Implement fix and push
   7. Retry event via dashboard
   8. Resolve issue

### PagerDuty

1. General overview steps up to but not including 4.
2. Demonstrate PagerDuty integration
3. Show an issue being created when a webhook endpoints responds with an error status code
4. Resolve the issue.
5. We want to use PagerDuty for our incident workflow
6. Connect the PagerDuty integration
7. Retry the event via the dashboard (error not fixed so will trigger issue)
8. See PagerDuty incident - acknowledge
9. See Hookdeck Issue has also been acknowledged
10. Implement fix and push
11. Resolve issue
12. Trigger event from Hookdeck dashboard and check we get a 200

### Stripe

1. What is Hookdeck, and what are the common use cases? Mention a couple of customers, including Lemon Squeezy.
2. More detail on the most common Stripe-related use case: receive events, emphasizing that this centralizes event management from all API providers you are receiving webhooks from. Show the Visual designer.
3. Set up connections to both Stripe and trigger and event and then Shopify and trigger an event.
4. Show using filters to route events to different destinations.
   a. Based on event type - prioritizing specific event types.
   b. Based on payload content
5. Hands-on receiving webhooks locally with the Hookdeck CLI. Will show Stripe and also Shopify to emphasize the centralizing of webhook verification and handling.
   a. Also, show errors and the ability to replay events.
6. Transformations to augment the payload. Maybe set a value based on some custom logic or convert into a normalized payload across different providers (e.g., Twilio SMS and Vonage SMS).
7. Push the app live to some hosting provider and update Hookdeck to deliver the events to the live endpoint.
8. Push a bug to the live endpoint (whoops!) and demo the issue notification and webhook retry workflow.

## Notes

### Transform Shopify to Vonage SMS

Destination setup:

- API URL: `https://api.nexmo.com/v1/messages`
- Use basic auth
- Username: from `https://dashboard.nexmo.com/settings`
- Password: use secret as API key from `https://dashboard.nexmo.com/settings`

Transformation:

Add Variable called `VONAGE_FROM_NUMBER` to the transformation.

```js
addHandler("transform", (request, context) => {
  request.body = {
    message_type: "text",
    text: `Hi, ${request.body.customer.first_name}. Your order ${request.body.order_number} has been received.`,
    to: request.body.customer.phone,
    from: process.env.VONAGE_FROM_NUMBER,
    channel: "sms",
  };

  return request;
});
```

Filter:

```json
{
  "to": {
    "$exist": true
  }
}
```

## Run the app

Install the dependencies:

```bash
npm i
```

Then run the app:

```bash
npm run dev
```

Trigger a Shopify event:

```sh
npm run shopify:trigger -- {HOOKDECK_URL}
```

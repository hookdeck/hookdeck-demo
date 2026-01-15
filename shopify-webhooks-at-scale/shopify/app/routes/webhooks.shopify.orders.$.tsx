import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Send a confirmation text message to the customer
 * This function will throw an error if phoneNumber is missing or null
 *
 * Note: This is a placeholder for the demo - in production you would integrate
 * with an SMS service like Twilio, MessageBird, etc.
 */
async function sendConfirmationText(phoneNumber: string): Promise<void> {
  if (!phoneNumber) {
    throw new Error("Phone number is required to send confirmation text");
  }

  // In production, this would call an SMS API:
  // await smsService.send({
  //   to: phoneNumber,
  //   message: "Your order has been confirmed!",
  // });

  console.log(`Sending confirmation text to: ${phoneNumber}`);
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop } = await authenticate.webhook(request);

  const timestamp = new Date().toISOString();
  const eventId = request.headers.get("x-shopify-event-id") || "unknown";

  // Read topic directly from header - Shopify sends it as "orders/create" (lowercase with slash)
  // authenticate.webhook() returns it as "ORDERS_CREATE" (uppercase with underscore)
  const topic = request.headers.get("x-shopify-topic") || "unknown";

  console.log(
    `[${timestamp}] <- Received: ${topic} | Event ID: ${eventId} | Shop: ${shop}`,
  );

  try {
    // Process order webhooks
    if (topic === "orders/create") {
      // For new orders, send a confirmation text message
      // This will throw an error if customer.phone is missing
      const customerPhone = (payload as { customer?: { phone?: string } })
        ?.customer?.phone;
      // sendConfirmationText will throw if phoneNumber is undefined/null
      await sendConfirmationText(customerPhone || "");

      console.log(`[${timestamp}] ✓ Order created, confirmation text sent`);
    } else {
      // Handle other order events (updated, cancelled, etc.)
      console.log(`[${timestamp}] ✓ Processing ${topic} event`);
    }

    console.log(`[${timestamp}] ✓ Returning 200`);

    return new Response(
      JSON.stringify({
        status: "received",
        event_id: eventId,
        topic: topic,
        shop_domain: shop,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log(`[${timestamp}] ✗ Returning 500: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

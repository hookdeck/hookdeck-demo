import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import Stripe from 'stripe';

const app = express();
app.use(express.json());
const port = process.env.PORT || 3456;

if (!process.env.STRIPE_API_KEY) {
  throw new Error("Missing STRIPE_API_KEY environment variable");
}

const stripe = new Stripe(process.env.STRIPE_API_KEY);

app.post("/api/stripe/invoices", async (req: Request, res: Response) => {
  try {
    // Fetch the full event data from Stripe using the event ID
    // You will not hit the Stripe API rate limit here
    const eventId = req.body.id;
    const event = await stripe.events.retrieve(eventId);
    const type = event.type;
    const resource = event.data.object;

    console.log(`Processing event type: ${type}`);
    console.log(`Resource:`, resource);

    // Now you can process the resource, knowing it's the latest version
    // ...

    res.sendStatus(200);
  } catch (err) {
    // Handle errors or network issues
    console.error("Error fetching event:", err);
    // Send Stripe error to Hookdeck for full observability
    res.status(500).json(err);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
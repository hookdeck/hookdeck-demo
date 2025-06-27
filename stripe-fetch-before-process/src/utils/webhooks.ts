import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

if (!process.env.HOOKDECK_WEBHOOK_SECRET) {
  throw new Error("HOOKDECK_WEBHOOK_SECRET not set");
}

export const verifyHookdeck = (req: Request, res: Response, next: NextFunction) => {
  //Extract x-hookdeck-signature and x-hookdeck-signature-2 headers from the request
  const hmacHeader = req.get("x-hookdeck-signature");
  const hmacHeader2 = req.get("x-hookdeck-signature-2");

  //Create a hash based on the parsed body
  const hash = crypto
    .createHmac("sha256", process.env.HOOKDECK_WEBHOOK_SECRET as string)
    .update((req as any).rawBody)
    .digest("base64");

  // Compare the created hash with the value of the x-hookdeck-signature and x-hookdeck-signature-2 headers
  if (hash === hmacHeader || (hmacHeader2 && hash === hmacHeader2)) {
    console.log("Webhook is originating from Hookdeck");
    next();
  } else {
    console.log("Signature is invalid, rejected");
    res.sendStatus(403);
  }
};
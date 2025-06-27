import { spawn } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const stripeApiKey = process.env.STRIPE_API_KEY;
if (!stripeApiKey) {
  console.error('STRIPE_API_KEY is not defined in your .env file.');
  process.exit(1);
}

const args = process.argv.slice(2); // Get user-provided arguments

const stripeArgs: string[] = [
  'trigger',
  ...args,
  '--api-key',
  stripeApiKey,
];

console.log(`Running: stripe ${stripeArgs.join(' ')}`);

const stripeProcess = spawn('stripe', stripeArgs, { stdio: 'inherit', shell: true });

stripeProcess.on('close', (code) => {
  process.exit(code ?? 1);
});

stripeProcess.on('error', (err) => {
  console.error('Failed to start stripe process. Make sure the Stripe CLI is installed.');
  console.error(err);
  process.exit(1);
});
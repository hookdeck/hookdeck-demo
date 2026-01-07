import 'dotenv/config';
import express, { Request, Response } from 'express';
import * as path from 'path';

// Validate required environment variables
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

if (!DEEPGRAM_API_KEY) {
  console.error('❌ ERROR: DEEPGRAM_API_KEY is not set in .env file');
  console.error('Please add your Deepgram API key to the .env file');
  console.error('Get your API key from: https://console.deepgram.com/');
  process.exit(1);
}

if (!CALLBACK_URL) {
  console.error('❌ ERROR: CALLBACK_URL is not set in .env file');
  console.error('Please run Hookdeck and configure the callback URL:');
  console.error('  1. Run: hookdeck listen 4000 --path /webhooks/deepgram');
  console.error('  2. Copy the Source URL from the output');
  console.error('  3. Add it to your .env file as CALLBACK_URL');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.raw({ type: 'audio/*', limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Import demo routers
import ttsRouter from './demos/tts/router';

// Mount demo routes
app.use('/tts', ttsRouter);

// Mount webhook endpoint (at root level for Hookdeck)
// ⚠️ NOTE: This endpoint will NEVER be called because Hookdeck rejects binary data
app.post('/webhooks/deepgram', express.raw({ type: 'audio/mpeg', limit: '50mb' }), (req, res) => {
  // This endpoint is defined but will never receive callbacks because:
  // 1. Deepgram sends binary audio data (audio/mpeg) to the callback URL
  // 2. Hookdeck only supports JSON webhook payloads
  // 3. Hookdeck will reject the request from Deepgram
  const requestId = req.query.requestId as string;
  console.log(`📥 [Webhook] Received Deepgram callback for ${requestId}`);
  console.log(`   ⚠️  WARNING: This should never be called - Hookdeck rejects binary data`);
  console.log(`   Hookdeck rejects binary audio/mpeg content from Deepgram`);
  
  // Just acknowledge receipt (though this should never happen)
  res.status(200).json({
    received: true,
    requestId,
    limitation: 'Hookdeck rejects binary audio/mpeg content'
  });
});

// Landing page (served from public/index.html)
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    deepgram: DEEPGRAM_API_KEY ? 'configured' : 'not configured'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hookdeck Deepgram Demos running on http://localhost:${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
  console.log(`💡 DEEPGRAM_API_KEY: ${DEEPGRAM_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  console.log('Available demos:');
  console.log(`  - TTS (Text-to-Speech): http://localhost:${PORT}/tts`);
});

# Hookdeck + Deepgram Demos

This project showcases various integrations between Deepgram's AI APIs and Hookdeck's webhook management platform.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Hookdeck

Install and run Hookdeck CLI to create a webhook tunnel:

```bash
# Install Hookdeck CLI (if not already installed)
npm install -g hookdeck

# Login to Hookdeck
hookdeck login

# Start Hookdeck listening on port 4000
hookdeck listen 4000 --path /webhooks/deepgram
```

**Copy the Source URL** from the Hookdeck output (format: `https://hkdk.events/...`)

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
PORT=4000
CALLBACK_URL=https://hkdk.events/your-source-id-here
```

- Get your Deepgram API key from [Deepgram Console](https://console.deepgram.com/)
- Use the Hookdeck Source URL from step 2 as your CALLBACK_URL

### 4. Start the Server

```bash
npm start
```

The server will start on `http://localhost:4000`

Open your browser to `http://localhost:4000` to see available demos.

---

## Available Demos

### 🗣️ Text-to-Speech (TTS) - ⚠️ NOT CURRENTLY WORKING

Generate natural-sounding speech from text using Deepgram's TTS API.

**URL:** `http://localhost:4000/tts`

**⚠️ CURRENT STATUS: NON-FUNCTIONAL WITH HOOKDECK**

This demo is configured to use Deepgram's callback-based approach but **does not work** with Hookdeck due to a fundamental limitation:

**The Problem:**
- Deepgram TTS callbacks send binary audio data with `audio/mpeg` content-type
- Hookdeck is designed for JSON webhook payloads only
- Hookdeck cannot forward binary data streams
- The webhook endpoint receives the callback but not the actual audio data

**Why This Demo Exists:**
This demo serves as a documentation of the limitation and shows what would be needed for callback-based TTS if Hookdeck supported binary content types in the future.

**How it Would Work (if supported):**

1. User submits text via the web interface
2. Server calls Deepgram API with a callback URL pointing to Hookdeck
3. Deepgram accepts the request and returns 200 OK
4. Deepgram processes the TTS asynchronously
5. ❌ **Deepgram sends binary audio to Hookdeck** (content-type: `audio/mpeg`)
6. ❌ **Hookdeck rejects the request** - only JSON webhooks are supported, binary data is rejected
7. ❌ **Webhook endpoint never receives the callback**

**Alternative Approach:**

For a working TTS demo, use direct API responses instead of callbacks. The Deepgram TTS API supports both modes:
- **Callback mode** (async): Not compatible with Hookdeck (binary data)
- **Direct response mode** (sync): Works without Hookdeck, audio returned immediately

**Features (if it worked):**
- 🎙️ Web interface to submit text and select voice models
- 📊 Real-time status tracking
- 🎵 Audio playback in browser
- 💾 JSON persistence for request history
- 🗂️ Local audio file storage via webhook callback

**For webhook-based demos with Hookdeck:**
See the upcoming Speech-to-Text demo which returns JSON transcriptions that are fully compatible with Hookdeck.

### 🎧 Speech-to-Text (STT) - Coming Soon

Transcribe audio to text with Deepgram's STT API.

### 📊 Audio Intelligence - Coming Soon

Extract insights from audio using Deepgram's intelligence features.

---

## Project Structure

```
ai/deepgram/
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore patterns
├── README.md                # This file
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── data/                    # Data storage (created automatically)
│   └── tts/                 # TTS demo data
│       ├── audio/           # Generated audio files
│       └── requests.json    # Request tracking
├── public/                  # Static web files
│   ├── index.html           # Landing page
│   └── tts/                 # TTS demo UI
│       ├── index.html       # TTS interface
│       ├── styles.css       # TTS styles
│       └── app.js           # TTS client-side JavaScript
└── src/
    ├── server.ts            # Main Express server
    └── demos/
        └── tts/
            └── router.ts    # TTS demo routes and logic
```

---

## API Endpoints

### Main Server

- `GET /` - Landing page with demo links
- `GET /api/health` - Health check endpoint
- `POST /webhooks/deepgram` - Webhook endpoint for Deepgram callbacks (⚠️ binary data not supported by Hookdeck)

### TTS Demo (⚠️ Non-functional)

- `GET /tts` - TTS demo interface
- `GET /tts/api/requests` - Get all TTS requests (JSON)
- `POST /tts/api/generate` - Generate TTS with callback (accepts `{ text, model }`)
- `POST /tts/webhook` - Webhook callback handler (⚠️ cannot receive binary audio from Hookdeck)
- `GET /tts/audio/:filename` - Serve generated audio files

---

## Development

The project uses:
- **TypeScript** for type safety
- **Express.js** for the web server
- **dotenv** for environment variable management
- **uuid** for generating unique request IDs

Each demo is organized as a separate router module, making it easy to add new demos without affecting existing ones.

---

## Adding New Demos

To add a new demo:

1. Create a new router in `src/demos/{demo-name}/router.ts`
2. Import and mount it in `src/server.ts`
3. Create UI files in `public/{demo-name}/`
4. Add a card to the landing page in `public/index.html`
5. Update this README

---

## Troubleshooting

### TTS Demo

**Audio files not showing:**
- Check the server console logs for any errors
- Verify your DEEPGRAM_API_KEY is valid
- Check that the `data/tts/audio/` directory is writable
- Look for error messages in the browser console

**"DEEPGRAM_API_KEY not configured" error:**
- Make sure you've created a `.env` file
- Copy from `.env.example` and add your actual API key
- Get your API key from [Deepgram Console](https://console.deepgram.com/)

**Server won't start:**
- Make sure you've run `npm install`
- Check that port 4000 isn't already in use
- Verify Node.js version is 14.17 or higher

---

## About Hookdeck

[Hookdeck](https://hookdeck.com) provides webhook management infrastructure including:
- 🔍 **Observability** - View and inspect all webhook deliveries
- 🔄 **Reliability** - Automatic retries and queuing
- 🎛️ **Control** - Filter, transform, and rate limit webhooks
- 🚀 **Development** - Test webhooks locally without exposing your machine

---

## About Deepgram

[Deepgram](https://deepgram.com) provides AI-powered speech recognition and synthesis APIs:
- 🗣️ **Text-to-Speech** - Natural-sounding voice synthesis
- 🎧 **Speech-to-Text** - Accurate transcription
- 📊 **Audio Intelligence** - Sentiment, topic detection, and more

---

## License

ISC

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaigiApp is a full-stack Taiwanese translator web application built with React and Flask. It provides:
- English/Mandarin to Taiwanese translation (using Claude API)
- Taiwanese text to Tâi-lô romanization (using TauPhahJi)
- Authentic audio pronunciation (via Hapsing API with caching)
- Pre-loaded common phrases with instant audio playback

## Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: lucide-react
- **Language**: JavaScript (JSX)

### Backend
- **Framework**: Flask (Python)
- **Romanization**: TauPhahJi-Command (台灣語言音標轉換)
- **Translation**: Anthropic Claude API (English/Mandarin → Taiwanese)
- **Audio**: Hapsing API (with server-side proxy and caching)
- **Production Server**: Gunicorn WSGI
- **Language**: Python 3.8+

### Infrastructure
- **Development**: Vite dev server + Flask dev server
- **Production**: Render (free tier) - Static frontend + Python backend
- **Environment Variables**: python-dotenv for local, Render dashboard for production

## Project Structure

```
TaigiApp/
├── src/                      # Frontend React code
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Root app component
│   ├── taiwanese-translator.jsx # Main translator component
│   └── index.css             # Tailwind CSS imports
├── backend/                  # Python Flask backend
│   └── app.py                # Flask API server with TauPhahJi, Claude API, audio proxy
├── venv/                     # Python virtual environment (not in git)
├── dist/                     # Production build output (not in git)
├── node_modules/             # Node.js dependencies (not in git)
├── .env                      # Environment variables - ANTHROPIC_API_KEY (not in git)
├── .env.example              # Template for environment variables
├── index.html                # HTML template
├── package.json              # Node.js dependencies and scripts
├── requirements.txt          # Python dependencies
├── vite.config.js            # Vite config with proxy to backend
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── render.yaml               # Deployment configuration for Render
└── .gitignore                # Git ignore rules (includes .env)
```

## Development Commands

### Initial Setup

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Set up Python virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create .env file:**
```bash
cp .env.example .env
```
Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

### Running the Application

You need to run both the backend and frontend servers:

**Terminal 1 - Backend Server:**
```bash
source venv/bin/activate  # Activate virtual environment
python3 backend/app.py
```
Backend runs at http://127.0.0.1:5001

Note: Port 5000 is often used by macOS ControlCenter, so we use port 5001.

**Terminal 2 - Frontend Server:**
```bash
npm run dev
```
Frontend runs at http://localhost:5173 (Vite default)

### Build for Production

```bash
npm run build
```
Creates optimized production build in the `dist/` directory.

```bash
npm run preview
```
Preview the production build locally.

## Key Features

1. **English/Mandarin to Taiwanese Translation**: Uses Claude API to translate English or Mandarin text to Taiwanese (traditional Chinese characters)
2. **Romanization**: Converts Taiwanese text (Han characters) to Tâi-lô romanization using TauPhahJi
3. **Audio Playback**: Authentic Taiwanese pronunciation via Hapsing API with server-side proxy
4. **Audio Caching**: In-memory cache for faster repeated audio requests
5. **Pre-caching**: Common phrases pre-loaded on server startup for instant playback
6. **Common Phrases**: 11 pre-loaded phrases with instant audio playback
7. **Clean UI**: No external popups or links - all functionality embedded in the app

## Architecture

### Frontend (`src/taiwanese-translator.jsx`)
- Single-page React component with language toggle (English/Mandarin ↔ Taiwanese)
- Manages translation state (input, output, romanization, Han characters)
- Calls Flask backend `/api/romanize` for translation + romanization
- Fetches audio from backend `/api/audio` proxy (avoids CORS issues)
- Timeout handling for slow audio generation (10-20 seconds first time)
- Includes 11 common phrases with pre-defined Tai-lo romanization

### Backend (`backend/app.py`)
- Flask REST API server with CORS enabled
- **Production mode**: Serves React static build when `FLASK_ENV=production`
- **Development mode**: API only, Vite serves frontend

#### Key Endpoints:

1. **`POST /api/romanize`**
   - Handles English, Mandarin, and Taiwanese input
   - If English/Mandarin: translates to Taiwanese using Claude API, then romanizes
   - If Taiwanese: directly romanizes using TauPhahJi
   - Returns: translation, romanization, Han characters, KIP format

2. **`GET /api/audio?taibun={text}`**
   - Server-side proxy to Hapsing API (avoids CORS)
   - Implements in-memory caching for speed
   - Returns: MP3 audio data

3. **`GET /api/health`**
   - Health check endpoint
   - Returns: `{"status": "ok"}`

4. **`GET /` and `GET /<path:path>` (production only)**
   - Serves React build from `dist/` folder
   - SPA routing: all routes return `index.html`

#### Audio Caching System:
```python
audio_cache = {}  # In-memory cache

def pre_cache_audio():
    # Pre-loads 11 common phrases on startup
    # First request instant, no 10-20 second wait
```

#### Environment Variables:
- `ANTHROPIC_API_KEY`: Required for English translation
- `FLASK_ENV`: Set to `production` for production mode

## API Integration

### Claude API (English/Mandarin → Taiwanese Translation)
- Model: `claude-sonnet-4-20250514`
- Used in `translate_english_to_taiwanese()` function
- Accepts both English and Mandarin Chinese input
- Prompt: Translate to Taiwanese using traditional Chinese characters
- Returns: Han characters only (no romanization)

### TauPhahJi-Command (Python Library)
- Converts Taiwanese text to structured linguistic data
- Provides Han characters, KIP romanization, and word segmentation
- KIP is converted to Tâi-lô in the backend (simplified conversion)

### Hapsing API (Audio)
- Endpoint: `https://hapsing.ithuan.tw/bangtsam?taibun={tailo_text}`
- Input: Tai-lo romanization
- Returns: MP3 audio file for Taiwanese pronunciation
- Note: First generation takes 10-20 seconds, cached after first request

### Vite Proxy (Development)
```javascript
// vite.config.js
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:5001',
      changeOrigin: true
    }
  }
}
```

## Production Deployment

### Render Configuration (render.yaml)

**Backend Service:**
- Type: Web service
- Environment: Python
- Build: `pip install -r requirements.txt`
- Start: `gunicorn backend.app:app`
- Environment variables: `ANTHROPIC_API_KEY`, `FLASK_ENV=production`

**Frontend Service:**
- Type: Static site
- Build: `npm install && npm run build`
- Publish: `./dist`
- Routes: `/api/*` → backend service

### Important Production Notes

1. **Environment Variables**: Set `ANTHROPIC_API_KEY` in Render dashboard (never commit to git)
2. **Audio Cache**: In-memory cache resets when service spins down (free tier)
3. **Free Tier**: Services spin down after 15 minutes of inactivity
4. **First Request**: Takes 30-60 seconds after spin-down to cold start
5. **Static Files**: Backend serves React build in production via Flask routes

## Common Development Tasks

### Adding New API Endpoints
1. Add route in `backend/app.py`
2. Update frontend to call new endpoint
3. Test with both dev servers running

### Modifying Translation Logic
1. Edit `translate_english_to_taiwanese()` in `backend/app.py`
2. Adjust Claude API prompt as needed
3. Test with various English inputs

### Updating Common Phrases
1. Edit `COMMON_PHRASES` array in `backend/app.py` for pre-caching
2. Edit `commonPhrases` array in `src/taiwanese-translator.jsx` for UI
3. Restart backend to pre-cache new phrases

### Debugging Audio Issues
1. Check backend logs for Hapsing API errors
2. Verify Tai-lo romanization is correct (Hapsing is picky)
3. Test direct URL: `https://hapsing.ithuan.tw/bangtsam?taibun={text}`
4. Check cache: `audio_cache` dict in backend

## Port Configuration

- **Backend**: 5001 (macOS uses 5000 for ControlCenter)
- **Frontend (dev)**: 5173 (Vite default)
- **Production**: Render assigns ports automatically

## Security

- `.env` file is gitignored (contains API key)
- `.env.example` committed as template
- Production: API key stored in Render environment variables
- CORS enabled for development (frontend/backend on different ports)

## Troubleshooting

**Error: Failed to fetch**
- Ensure backend is running on port 5001
- Check Vite proxy configuration
- Verify `/api/health` endpoint responds

**Translation fails**
- Check `ANTHROPIC_API_KEY` is set in `.env`
- Verify API key is valid at https://console.anthropic.com/
- Check backend logs for API errors

**Audio slow/timeout**
- First request takes 10-20 seconds (Hapsing generates audio)
- Subsequent requests use cache (instant)
- Increase timeout in frontend if needed
- Check Hapsing API is accessible

**Build fails**
- Run `npm install` to ensure dependencies are current
- Check Node.js version (16+)
- Ensure `dist/` is in `.gitignore`

## Dependencies

### Python (requirements.txt)
```
Flask==3.1.2
flask-cors==6.0.1
Tau-Phah-Ji-Command==1.0.0
anthropic==0.39.0
python-dotenv==1.0.0
gunicorn==21.2.0
```

### Node.js (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

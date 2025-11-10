# Taiwanese Translator (台語翻譯)

A React-based web application for romanizing Taiwanese text, featuring Tâi-lô romanization and authentic audio pronunciation.

## Features

- 🔄 English/Mandarin to Taiwanese translation (using Claude API)
- 📝 Taiwanese text to Tâi-lô (Tai-lo) romanization (using TauPhahJi)
- 🔊 Authentic Taiwanese audio pronunciation via Hapsing API
- 📚 Pre-loaded common phrases with audio
- 🌐 Clean, modern UI with Tailwind CSS
- 🐍 Python backend with TauPhahJi-Command and Claude API

## Setup

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TaigiApp
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Set up Python virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. **Create .env file with your Anthropic API key:**
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

Get your API key from: https://console.anthropic.com/

### Development

You need to run both servers:

**Terminal 1 - Start the Python backend:**
```bash
source venv/bin/activate
python3 backend/app.py
```
Backend runs at http://127.0.0.1:5001 (port 5001 because macOS uses 5000)

**Terminal 2 - Start the React frontend:**
```bash
npm run dev
```
Frontend runs at http://localhost:3000

### Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Usage

### English/Mandarin to Taiwanese Translation

1. **Make sure source language is set to "English/Mandarin"**
2. **Type English or Mandarin text**
   - English examples: "Hello", "Thank you"
   - Mandarin examples: "你好", "謝謝"
3. Click "Translate" or press Ctrl+Enter
4. View:
   - Taiwanese translation in Han characters (漢字)
   - Tâi-lô romanization
   - Audio pronunciation

### Taiwanese Romanization

1. **Switch source language to "Taiwanese"**
2. **Input Taiwanese text** in Han characters (漢字)
   - Example: 你好 (hello)
   - Example: 食飽未 (have you eaten?)
3. Click "Translate" or press Ctrl+Enter
4. View the romanization in Tâi-lô format
5. Click the audio button to hear authentic Taiwanese pronunciation

### Common Phrases

Explore pre-loaded common phrases with audio in the expandable section at the bottom.

## Important Notes

- **Requires Anthropic API key** for English/Mandarin to Taiwanese translation
- Backend server must be running for all functionality
- Audio requires internet connection to fetch from Hapsing API

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS 3** - Styling
- **lucide-react** - Icons

### Backend
- **Flask** - Python web framework
- **TauPhahJi-Command** - Taiwanese romanization
- **Hapsing API** - Taiwanese audio
- **Claude API** - English to Taiwanese translation
- **Gunicorn** - Production WSGI server

## Deployment

### Deploy to Render (Free Tier)

This app is configured for easy deployment to Render's free tier.

#### Prerequisites
- GitHub account
- Render account (https://render.com)
- Anthropic API key (https://console.anthropic.com/)

#### Steps

1. **Push your code to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Deploy on Render:**
   - Go to https://render.com/dashboard
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect the `render.yaml` file and create two services:
     - `taigi-backend` (Python web service)
     - `taigi-frontend` (Static site)

3. **Set Environment Variables:**
   - Go to the `taigi-backend` service dashboard
   - Navigate to "Environment" tab
   - Add environment variable:
     - Key: `ANTHROPIC_API_KEY`
     - Value: Your Anthropic API key from https://console.anthropic.com/
   - Add environment variable:
     - Key: `FLASK_ENV`
     - Value: `production`

4. **Wait for deployment:**
   - Backend: Installs Python dependencies and starts with Gunicorn
   - Frontend: Builds React app and deploys static files
   - First deployment takes 5-10 minutes

5. **Update API routing (if needed):**
   - The `render.yaml` is configured to route `/api/*` requests from the frontend to the backend
   - Backend URL will be: `https://taigi-backend.onrender.com`
   - Frontend URL will be: `https://taigi-frontend.onrender.com`

#### Important Notes

- **Free tier limitations:**
  - Services spin down after 15 minutes of inactivity
  - First request after spin-down will take 30-60 seconds
  - 750 hours/month free tier (sufficient for one service running 24/7)

- **Audio caching:**
  - Audio cache is in-memory only
  - Cache resets when service spins down
  - First audio request after spin-down may be slow (10-20 seconds)

- **API costs:**
  - Anthropic Claude API usage is billed separately
  - Monitor usage at https://console.anthropic.com/

### Alternative: Deploy Locally for Testing

Build and test the production build locally:

```bash
# Build the frontend
npm run build

# Set environment variables
export FLASK_ENV=production
export ANTHROPIC_API_KEY=your_key_here

# Run with Gunicorn
gunicorn backend.app:app
```

Then visit http://localhost:8000

## License

MIT

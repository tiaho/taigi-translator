# Taiwanese Translator (台語翻譯)

A React-based web application for romanizing Taiwanese text, featuring Tâi-lô romanization and authentic audio pronunciation.

## Features

### Translation & Romanization
- 🔄 **Dual Translation**: English → BOTH Taiwan Mandarin (國語) AND Taiwanese (台語) using Claude API
  - Taiwan Mandarin: 腳踏車, 很好, 吃飯 (Taiwan-specific vocabulary, not China Mandarin)
  - Taiwanese: 跤踏車, 真好/誠好/足好, 食飯 (authentic Taiwanese vocabulary)
- 📝 **Advanced Romanization**: Multi-tier Tâi-lô romanization system
  - MOE Dictionary exact match
  - AI-powered heteronym disambiguation (e.g., 看 → khuànn vs khàn based on context)
  - Character variant normalization (Mandarin → Taiwanese: 腳 → 跤)
  - Automatic number conversion (22 → 二十二 → jī-tsa̍p-jī)
  - TauPhahJi fallback for comprehensive coverage
- 📚 **Taiwan MOE Dictionary**: 16,579 entries (14,489 titles + 4,329 synonyms)
- 🔍 **Smart Definition Search**: Finds Mandarin words (like 很) by searching dictionary definitions
- 🔊 **Authentic Audio**: Taiwanese pronunciation via Hapsing API with 3-tier caching
  - In-memory cache (instant)
  - Supabase cloud cache (fast, persistent)
  - On-demand generation (fallback)
- 💬 **Common Phrases**: Pre-loaded phrases with instant audio playback
- 🎯 **Smart Audio Priority**: Pre-generated audio for 3000+ most common words using intelligent scoring

### Learning Tools
- 🃏 **Flashcard System**: Spaced Repetition System (SRS) for effective learning
  - Save translations as flashcards
  - Review with SRS algorithm
  - Track learning progress (learning → known → mastered)
  - Audio playback during review
  - Undo deleted flashcards
- 📖 **Learning Modules**: Interactive contextual dialogues
  - Real-world scenarios (At the Bus Stop, At the Doctor, etc.)
  - Side-by-side Mandarin and Taiwanese
  - Full romanization with audio
  - Vocabulary lists with explanations
  - AI-generated streaming content
- 📚 **Interactive Lesson Viewer**: Structured 15-unit curriculum
  - 6-section tabbed navigation (Overview, Vocabulary, Grammar, Dialogues, Culture, Exercises)
  - Interactive review checklists (progress tracking)
  - Drag-and-drop matching exercises
  - Multiple-choice with instant feedback
  - Fill-in-blank, translation, and role-play activities
  - One-click flashcard generation from lessons
  - Pre-cached audio for instant playback

### User Experience
- 🌐 **Clean, Modern UI**: Built with Tailwind CSS
- ⚡ **Real-time Streaming**: Server-Sent Events for live module generation
- 📱 **Fully Responsive Design**: Optimized for mobile and desktop
  - Icon-only navigation on mobile for space efficiency
  - Touch-friendly buttons with larger tap targets (44px+)
  - Responsive text sizing (scales from mobile to desktop)
  - Stacked layouts on mobile, side-by-side on desktop
  - Scrollable tabs with hidden scrollbars for clean mobile UX
  - Optimized spacing and padding for different screen sizes
- 🐍 **Python Backend**: MOE Dictionary, TauPhahJi-Command, and Claude API
- 📋 **Smart Navigation**: Main menu with dropdown for advanced features
  - **Main tabs**: Translator, Lessons, Flashcards
  - **More dropdown**: Learning Modules, Vocabulary Lists, Common Phrases
  - **Units page**: Organized lesson selection with unit structure
  - **Mobile-optimized**: Icon-only buttons on small screens, full labels on desktop

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

Edit `.env` and add your API keys:
```
ANTHROPIC_API_KEY=your_actual_api_key_here

# Optional: Supabase for audio caching (recommended for faster audio)
SUPABASE_URL=your_project_url_here
SUPABASE_KEY=your_service_role_key_here
```

Get your Anthropic API key from: https://console.anthropic.com/

For Supabase setup (optional but recommended), see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

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

### English to Taiwan Mandarin + Taiwanese Translation

1. **Make sure source language is set to "English/Mandarin"**
2. **Type English text**
   - Examples: "Hello", "riding bikes is a great workout"
3. Click "Translate" or press Ctrl+Enter
4. View **BOTH** translations:
   - **Taiwan Mandarin (國語)**: Uses Taiwan vocabulary (腳踏車, 很好, 計程車)
   - **Taiwanese (台語)**: Uses Taiwanese vocabulary (跤踏車, 真好, 的士)
   - **Tâi-lô romanization**: For the Taiwanese translation
   - **Audio pronunciation**: Authentic Taiwanese pronunciation
5. **Save as flashcard** by clicking the bookmark icon

### Taiwanese Romanization

1. **Switch source language to "Taiwanese"**
2. **Input Taiwanese text** in Han characters (漢字)
   - Example: 你好 (hello)
   - Example: 食飽未 (have you eaten?)
3. Click "Translate" or press Ctrl+Enter
4. View the romanization in Tâi-lô format
5. Click the audio button to hear authentic Taiwanese pronunciation

### Flashcard System

1. **Save translations** to your flashcard deck using the bookmark icon
2. **Review flashcards** by clicking "Flashcards" in the navigation
3. **Study modes**:
   - Review: Show cards due for review based on SRS algorithm
   - View All: Browse entire flashcard collection
4. **Rate your knowledge**: Click "Again", "Hard", "Good", or "Easy"
5. **Track progress**: See learning status for each card
6. **Audio support**: Play audio during review

### Learning Modules

1. **Access modules** via "Learning Modules" in the navigation
2. **Choose a scenario**: At the Bus Stop, At the Doctor, etc.
3. **Study the dialogue**:
   - Read side-by-side Mandarin and Taiwanese
   - See full Tâi-lô romanization
   - Play audio for each line
4. **Review vocabulary**: Study key words and phrases
5. **Save to flashcards**: Add vocabulary directly to your deck

### Interactive Lessons

1. **Access lessons** via "Lessons" in the main navigation menu
2. **Units page**: Browse all available units with their lessons listed below each unit
3. **Choose a lesson**: Click on any lesson to start learning
4. **Navigate sections** using tabs within each lesson:
   - **Overview**: Learning objectives and review checklist
   - **Vocabulary**: Core words with audio and flashcard creation
   - **Grammar**: Rules, patterns, and examples
   - **Dialogues**: Realistic conversations with audio
   - **Culture**: Cultural insights and traditions
   - **Exercises**: Interactive practice activities
5. **Complete exercises**:
   - Drag-and-drop matching
   - Multiple-choice questions with feedback
   - Fill-in-blank with hints
   - Translation practice
   - Role-play scenarios
6. **Track progress**: Check off learning objectives in the review checklist
7. **Create flashcards**: Generate flashcards from lesson content with one click
8. **Navigate back**: Use "Back to Units" button to return to the units page

### Common Phrases

Explore pre-loaded common phrases with audio in the expandable section at the bottom.

## Important Notes

- **Requires Anthropic API key** for English/Mandarin to Taiwanese translation and learning module generation
- Backend server must be running for all functionality
- Audio requires internet connection to fetch from Hapsing API
- **Dual translation system**: Shows BOTH Taiwan Mandarin (國語) AND Taiwanese (台語) with different vocabulary
  - Taiwan Mandarin: 腳踏車, 很好, 吃飯 (Taiwan-specific, not China Mandarin like 自行車, 公共汽車)
  - Taiwanese: 跤踏車, 真好/誠好, 食飯 (authentic Taiwanese vocabulary)
- **Advanced romanization**:
  - MOE Dictionary exact match
  - AI heteronym disambiguation (看 → khuànn vs khàn based on sentence context)
  - Automatic number conversion (22 → 二十二 → jī-tsa̍p-jī)
  - Character normalization (腳 → 跤)
  - Manual dictionary entries for common words (公車, 看, 最近)
  - TauPhahJi fallback for comprehensive coverage
- **Flashcard data**: Stored in browser localStorage (persists across sessions)
- **Learning modules**: Generated dynamically using Claude API with streaming

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS 3** - Styling
- **lucide-react** - Icons

### Backend
- **Flask** - Python web framework
- **MOE Dictionary** - Taiwan Ministry of Education Taiwanese Dictionary (g0v/moedict-data-twblg)
- **TauPhahJi-Command** - Taiwanese romanization fallback
- **Hapsing API** - Taiwanese audio
- **Supabase** - Cloud storage for audio caching (optional)
- **Claude API** - English to BOTH Taiwan Mandarin (國語) and Taiwanese (台語) with vocabulary differences
- **Gunicorn** - Production WSGI server

### Learning Resources
- **15-Unit Curriculum** - Comprehensive lesson plan from beginner to advanced (see [LESSON_PLAN.md](./LESSON_PLAN.md))
- **Smart Prioritization** - AI-scored dictionary ranking for efficient audio pre-generation

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
  - 3-tier caching system: In-memory → Supabase → Hapsing API
  - Optional Supabase integration for persistent cloud caching
  - Add `SUPABASE_URL` and `SUPABASE_KEY` to backend environment variables for faster audio
  - Without Supabase: In-memory cache resets on spin-down
  - First audio request may be slow (10-20 seconds) without Supabase cache

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

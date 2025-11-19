# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaigiApp is a full-stack Taiwanese translator web application built with React and Flask. It provides:
- **Dual Translation System**: English → BOTH Taiwan Mandarin (國語) AND Taiwanese (台語) using Claude API
  - Taiwan Mandarin: 腳踏車, 很好, 吃飯 (Taiwan-specific vocabulary, not China Mandarin)
  - Taiwanese: 跤踏車, 真好/誠好/足好, 食飯 (authentic Taiwanese vocabulary)
- Taiwanese text to Tâi-lô romanization (using MOE Dictionary with TauPhahJi fallback)
- Taiwan Ministry of Education Dictionary (16,579 entries: 14,489 titles + 4,329 synonyms)
- Definition search: Finds Mandarin words (like 很) by searching dictionary definitions
- Character variant normalization (Mandarin → Taiwanese: 腳 → 跤)
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
- **Dictionary**: Taiwan MOE Dictionary (moedict-data-twblg) - 14,489 titles + 4,329 synonyms
- **Romanization**: MOE Dictionary → definition search → TauPhahJi-Command fallback (台灣語言音標轉換)
- **Translation**: Anthropic Claude API - English → BOTH Taiwan Mandarin (國語) AND Taiwanese (台語)
  - Taiwan Mandarin: Uses Taiwan vocabulary (腳踏車, 很好, 吃飯)
  - Taiwanese: Uses Taiwanese vocabulary (跤踏車, 真好/誠好/足好, 食飯)
- **Character Normalization**: Mandarin → Taiwanese variant mapping (腳 → 跤)
- **Audio**: 3-tier caching system
  - In-memory cache (instant)
  - Supabase cloud cache (fast, persistent, optional)
  - Hapsing API (on-demand generation)
- **Audio Priority**: Intelligent dictionary scoring for pre-generation (3000+ words)
- **Cloud Storage**: Supabase (PostgreSQL + Storage) for persistent audio caching
- **Production Server**: Gunicorn WSGI
- **Language**: Python 3.8+

### Infrastructure
- **Development**: Vite dev server + Flask dev server
- **Production**: Render (free tier) - Static frontend + Python backend
- **Storage**: Supabase (optional) - Audio file CDN + metadata database
- **Environment Variables**: python-dotenv for local, Render dashboard for production

## Project Structure

```
TaigiApp/
├── src/                      # Frontend React code
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Root app component
│   ├── taiwanese-translator.jsx # Main translator component
│   ├── components/           # React components
│   │   └── LessonViewer.jsx  # Interactive lesson viewer with tabs, exercises, checklists
│   ├── data/                 # Frontend data files
│   │   └── lessons/          # Lesson JSON files
│   │       └── unit-01.json  # Unit 1: Greetings and Basic Politeness
│   └── index.css             # Tailwind CSS imports
├── backend/                  # Python Flask backend
│   ├── app.py                # Flask API server with MOE dict, TauPhahJi, Claude API, Supabase
│   ├── moedict-twblg.json    # Taiwan MOE Dictionary (7.4MB, 14,489 entries)
│   ├── data/                 # Data files
│   │   └── priority_entries.json  # Ranked dictionary entries (3000 words)
│   └── scripts/              # Utility scripts
│       ├── rank_dictionary_entries.py  # Score & rank dictionary words
│       ├── setup_supabase.py          # Initialize Supabase database & storage
│       ├── generate_audio_supabase.py # Pre-generate audio to Supabase
│       ├── test_supabase_audio.py     # Test Supabase audio cache
│       ├── cache_lesson_audio.py      # Pre-cache audio for a specific lesson
│       ├── validate_lesson_plan.py    # Validate vocabulary in LESSON_PLAN.md
│       ├── validate_and_fix_lesson_plan.py  # Validate and auto-fix romanization
│       └── apply_fixes.py             # Apply romanization fixes
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
├── LESSON_PLAN.md            # 15-unit Taiwanese learning curriculum
├── SUPABASE_SETUP.md         # Guide for setting up Supabase audio caching
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
Edit `.env` and add your API keys:
```
ANTHROPIC_API_KEY=your_actual_api_key_here

# Optional: Supabase for persistent audio caching
SUPABASE_URL=your_project_url_here
SUPABASE_KEY=your_service_role_key_here
```

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed Supabase setup instructions.

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

### Translation & Romanization
1. **Dual Translation System**: English → BOTH Taiwan Mandarin (國語) AND Taiwanese (台語) using Claude API
   - Taiwan Mandarin: Uses Taiwan-specific vocabulary (腳踏車, 很好, 吃飯, not China Mandarin 自行車, 公共汽車)
   - Taiwanese: Uses Taiwanese vocabulary (跤踏車, 真好/誠好/足好, 食飯)
   - Different word order: Taiwanese uses "是 + 真/誠/足 + adjective" (e.g., 是真好 not 真是好)
   - Prevents Taiwanese-only vocabulary in Mandarin (no 看覓, 真好, 誠好, 足 in Mandarin output)
2. **MOE Dictionary Integration**: Loads Taiwan Ministry of Education Taiwanese Dictionary (14,489 titles + 4,329 synonyms = 16,579 entries) for accurate romanization
3. **AI Heteronym Disambiguation**: Uses Claude API to select correct pronunciation based on sentence context
   - Example: 看 → khuànn (to see) vs khàn (to supervise) based on usage
   - Minimal API cost: 10 tokens max per disambiguation
   - Graceful fallback to first option if API unavailable
4. **Automatic Number Conversion**: Converts Arabic numerals to Traditional Chinese characters before romanization
   - Example: 22 → 二十二 → jī-tsa̍p-jī
   - Handles 0-999 with proper Chinese formatting rules
5. **Manual Dictionary Entries**: Override system for common words not in MOE dictionary or needing specific pronunciations
   - Current entries: 最近 (tsuè-kīn), 公車 (kong-tshia), 看 (khuànn)
   - Easy to extend with more words as needed
6. **Definition Search**: Finds Mandarin words (like 很) by searching MOE dictionary definitions to map to Taiwanese equivalents (真/誠/足)
7. **Character Variant Normalization**: Automatically converts Mandarin characters to Taiwanese variants (腳 → 跤) for better dictionary matching
8. **Romanization Priority**: Manual entries → MOE Dictionary exact match → AI disambiguation → character normalization → definition search → TauPhahJi fallback
9. **Pinyin Generation**: Claude generates Taiwan-style Pinyin alongside Mandarin translation (not pypinyin library)
10. **Audio Playback**: Authentic Taiwanese pronunciation via Hapsing API with server-side proxy
11. **Audio Caching**: In-memory cache for faster repeated audio requests
12. **Pre-caching**: Common phrases pre-loaded on server startup for instant playback

### Learning Tools
13. **Flashcard System with SRS**: Spaced Repetition System for effective vocabulary learning
    - Save translations as flashcards
    - Review algorithm: intervals increase based on performance (Again: 1 day, Hard: 3 days, Good: 7 days, Easy: 14 days)
    - Track learning status: learning → known → mastered
    - Audio playback during review
    - Undo deleted flashcards (last 10 deletions)
    - localStorage persistence (survives page refresh)
13a. **Quiz System**: Test your knowledge with interactive quizzes
    - Translation quiz: English → choose correct Taiwanese (multiple choice)
    - Listening quiz: Taiwanese → choose correct English meaning
    - Tâi-lô romanization displayed on answer options (not question) for learning support
    - Audio playback in listening mode
    - Score tracking with detailed results
    - Generated from flashcard collection (requires 4+ flashcards)
13b. **Progress Tracking and Statistics Dashboard**: Comprehensive learning analytics
    - **Key Metrics**: Study streak (current/longest), total flashcards, quiz average, study sessions
    - **Flashcard Statistics**: Status distribution (learning/known/mastered), review rating breakdown
    - **Quiz Performance**: Overall accuracy, mode comparison (translation vs listening), recent quiz history
    - **Achievements System**: 6 milestones with progress tracking (First 10 Cards, Card Collector, Week Warrior, Quiz Master, Dedicated Learner, Master Scholar)
    - **Visual Charts**: Progress bars, status distributions, performance indicators
    - **Automatic Tracking**: Records all quiz completions, flashcard reviews, and study sessions
    - localStorage persistence for all statistics
13c. **Daily Challenge System**: Engaging daily goals to maintain motivation
    - **5 Challenge Types**: Rotating challenges (review cards, quiz master, vocabulary builder, perfect score, study streak)
    - **Automatic Reset**: New challenge each day based on date
    - **Progress Tracking**: Real-time progress bar with percentage completion
    - **Rewards**: Completion status and rewards for finishing challenges
    - **Integration**: Automatically tracks flashcard creation, reviews, quiz completion, and study streaks
    - **Visual Feedback**: Color-coded completion status, animated progress bar
    - localStorage persistence
13d. **Tone Sandhi Trainer**: Practice tone changes unique to Taiwanese pronunciation
    - **15 Exercises**: 6 beginner, 5 intermediate, 4 advanced
    - **Exercise Structure**: Each exercise includes:
      - Compound word (han characters, Tâi-lô, English, Mandarin)
      - Individual character breakdown (han, Tâi-lô, English meaning for each character)
      - Tone sandhi rule explanation
      - Category tag (Transportation, Time, Colors, Technology, Education, Greetings, Politeness)
    - **Audio Comparison**:
      - Play compound word audio with tone sandhi applied
      - Play individual character audio showing original tones
      - Toggle between compound view and individual character breakdown
    - **Progressive Difficulty**:
      - Beginner: 2-syllable common words (跤踏車, 公車, 昨昏, 明仔載, 紅色, 藍色)
      - Intermediate: 3-syllable words (計程車, 台灣人, 電腦, 電話, 學生)
      - Advanced: Conversational phrases (食飽未, 你好無, 對不住, 無要緊)
    - **Progress Tracking**: Mark exercises complete, localStorage persistence for progress
    - **Visual Design**: Gradient UI with color-coded difficulty levels (green/yellow/red)
    - **Navigation**: Previous/Next buttons, level selector, progress summary
    - **Data Structure**: `toneSandhiExercises` object with beginner/intermediate/advanced arrays
    - **Helper Functions**:
      - `playToneSandhiAudio(tailo, audioType)` - Plays audio for compound or individual characters
      - `markExerciseComplete(level, exerciseId)` - Tracks completion in localStorage
      - `getCurrentExercise()` - Returns current exercise based on level and index
      - `changeToneSandhiLevel(level)` - Switches between difficulty levels
    - **Integration**: Accessible via "More" dropdown menu
14. **Learning Modules**: Interactive contextual dialogues generated by Claude API
    - Real-world scenarios (At the Bus Stop, At the Doctor, etc.)
    - Side-by-side Mandarin and Taiwanese with full romanization
    - Vocabulary lists with definitions and examples
    - Server-Sent Events (SSE) for streaming generation
    - Batch add all vocabulary to flashcards
    - Audio playback for each dialogue line
15. **Interactive Lesson Viewer**: Structured 15-unit curriculum with interactive features
    - **Units Page**: Central hub showing all units with lessons listed below each unit
    - **Lesson Navigation**: Click on any lesson to view content, "Back to Units" button to return
    - **Tabbed Navigation**: 6 sections within each lesson (Overview, Vocabulary, Grammar, Dialogues, Culture, Exercises)
    - **Interactive Review Checklist**: Click to check off learning objectives (persists in localStorage per lesson)
    - **Interactive Exercises**:
      - Drag-and-drop matching: Taiwanese phrases on left, draggable English answers on right with sticky positioning
      - Multiple-choice: Clickable options with instant correct/incorrect feedback and explanations
      - Fill-in-blank: Reveal answer functionality
      - Translation: English to Taiwanese practice
      - Role-play: Guided conversation scenarios
    - **Create Flashcards**: One-click generation of flashcards from all exercise items (integrated in Vocabulary tab and Practice Activities)
    - **Practice Activities**: 4 guided learning tasks (Flashcard Review, Daily Journal, Video Practice, Real-World Practice)
    - **Audio Pre-caching**: Server-side pre-caching of all lesson audio for instant playback
    - **Component**: `src/components/LessonViewer.jsx` - Loads lesson data from `src/data/lessons/*.json`
16. **Common Phrases**: 11 pre-loaded phrases with instant audio playback
17. **Smart Navigation Menu**: Organized menu with dropdown for advanced features
    - **Main tabs**: Translator, Lessons, Flashcards (always visible)
    - **More dropdown**: Learning Modules, Vocabulary Lists, Common Phrases
    - **Active indicators**: Highlights current section, "More" button highlights when dropdown items active
    - **Animated chevron**: Rotates when dropdown opens/closes
18. **Clean UI**: No external popups or links - all functionality embedded in the app
19. **Fully Mobile Responsive**: Optimized for both mobile and desktop devices
    - **Icon-only navigation** on mobile (text labels hidden with `hidden sm:inline`)
    - **Touch-friendly targets**: 44px+ button heights for better mobile UX
    - **Responsive text scaling**: `text-2xl md:text-4xl` pattern throughout
    - **Adaptive layouts**: Stacked on mobile (`flex-col`), side-by-side on desktop (`md:flex-row`)
    - **Responsive grids**: Vertical dividers on mobile (`divide-y`), horizontal on desktop (`md:divide-x md:divide-y-0`)
    - **Scrollable tabs**: Horizontal scroll with hidden scrollbars (`overflow-x-auto scrollbar-hide`)
    - **Optimized spacing**: Reduced padding on mobile (`p-3 md:p-6`), larger on desktop
    - **Flexible components**: All major sections (header, navigation, lessons, flashcards) scale appropriately
    - **CSS utilities**: Custom `.scrollbar-hide` class for cleaner mobile scroll experience
    - **Breakpoints**: Uses Tailwind's `sm:` (640px), `md:` (768px) responsive prefixes

## Architecture

### Frontend (`src/taiwanese-translator.jsx`)
- Single-page React component with smart navigation menu
- **Navigation system**: Main tabs + dropdown menu for advanced features
- Manages translation state (input, output, romanization, Han characters)
- Calls Flask backend `/api/romanize` for translation + romanization
- Fetches audio from backend `/api/audio` proxy (avoids CORS issues)
- Timeout handling for slow audio generation (10-20 seconds first time)
- Includes 11 common phrases with pre-defined Tai-lo romanization

### Frontend (`src/components/LessonViewer.jsx`)
- Interactive lesson viewer component for structured learning
- Loads lesson data from JSON files in `src/data/lessons/*.json`
- **Tabbed Navigation**: 6 sections (Overview, Vocabulary, Grammar, Dialogues, Culture, Exercises)
- **State Management**:
  - `lessonData`: Loaded from JSON file
  - `currentSection`: Active tab
  - `audioCache`: In-memory audio URL cache
  - `playingAudio`: Currently playing audio romanization
  - `revealedAnswers`: Fill-in-blank answers revealed by user
  - `selectedAnswers`: Multiple-choice selections
  - `matchingAnswers`: Drag-and-drop matching pairs
  - `draggedItem`: Currently dragged item in matching exercises
  - `checkedItems`: Review checklist completion (persisted to localStorage)
- **Interactive Features**:
  - **Review Checklist**: Click checkboxes to track progress, saved per lesson in localStorage
  - **Drag-and-Drop Matching**: HTML5 drag API with sticky answer bank (top: 140px to account for header)
  - **Multiple-Choice**: Instant feedback with green (correct) / red (incorrect) visual indicators
  - **Audio Playback**: Click volume icons to play Taiwanese pronunciation
  - **Flashcard Creation**: Generate flashcards from vocabulary and all exercise items
- **Audio Pre-caching**: Calls `/api/lessons/{lessonId}/cache-audio` on mount to pre-generate all lesson audio
- **localStorage Keys**:
  - `lesson-{lessonId}-checklist`: Review checklist completion state
  - `flashcards`: Shared flashcard collection across all lessons

### Backend (`backend/app.py`)
- Flask REST API server with CORS enabled
- **Production mode**: Serves React static build when `FLASK_ENV=production`
- **Development mode**: API only, Vite serves frontend

#### Key Endpoints:

1. **`POST /api/romanize`**
   - Handles English, Mandarin, and Taiwanese input
   - If English/Mandarin: translates to BOTH Taiwan Mandarin (國語) AND Taiwanese (台語) using Claude API with different vocabulary, generates Pinyin, then romanizes Taiwanese
   - If Taiwanese: directly romanizes using advanced multi-tier system
   - Romanization priority: Manual entries → MOE dict exact match → AI heteronym disambiguation → character normalization (including number conversion) → definition search → TauPhahJi fallback
   - Returns: mandarin (Taiwan Mandarin), translation (Taiwanese), romanization (Tâi-lô), Han characters, KIP format, Pinyin

2. **`GET /api/audio?taibun={text}`**
   - Server-side proxy to Hapsing API (avoids CORS)
   - Implements in-memory caching for speed
   - Returns: MP3 audio data

3. **`GET /api/learning-modules/stream?topic={topic}`**
   - Generates learning module content using Claude API with Server-Sent Events (SSE)
   - Streams JSON objects as they're generated: metadata, dialogue, vocabulary, examples
   - Creates contextual dialogues with side-by-side Mandarin and Taiwanese
   - Romanizes all Taiwanese content using advanced multi-tier system
   - Returns: SSE stream with progress indicators and final JSON module

4. **`GET /api/health`**
   - Health check endpoint
   - Returns: `{"status": "ok"}`

5. **`GET /` and `GET /<path:path>` (production only)**
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

## Romanization Process

The app uses a sophisticated multi-tier romanization system with advanced features:

### Priority System
1. **Manual Dictionary Entries**: Check override dictionary for manually-specified pronunciations
2. **MOE Dictionary Exact Match**: Check if the full phrase exists in the dictionary
3. **AI Heteronym Disambiguation**: If word has multiple pronunciations, use Claude API to select based on context
4. **Character Normalization**: Convert Mandarin characters to Taiwanese variants AND Arabic numerals to Chinese characters
5. **Definition Search**: Search MOE dictionary definitions to find Mandarin words (like 很) defined in Taiwanese entries (真/誠/足)
6. **TauPhahJi Fallback**: Use TauPhahJi-Command as last resort with normalized text for proper tone sandhi

### Manual Dictionary Entries

Common words that need specific pronunciations or aren't in the MOE dictionary:

```python
manual_entries = {
    '最近': 'tsuè-kīn',  # lately, recently (appears in examples but not as title)
    '公車': 'kong-tshia',  # bus (appears in examples but not as title)
    '看': 'khuànn',  # to see/look (override first heteronym which is khàn = supervise)
}
```

These entries always override MOE dictionary lookups, ensuring consistent pronunciation for common words.

### AI Heteronym Disambiguation

Words with multiple pronunciations are disambiguated using sentence context:

```python
def disambiguate_heteronyms_with_context(sentence, word, heteronyms):
    """Use Claude API to choose the correct heteronym pronunciation based on sentence context"""
    # Shows all heteronym options with definitions to Claude
    # Claude picks correct one based on sentence context
    # Minimal API cost: 10 tokens max per disambiguation
```

**Example**: The word "看" has two pronunciations:
- khuànn (看視, to see/look)
- khàn (看守, to supervise/guard)

The system sends the full sentence to Claude, which picks the correct pronunciation based on context.

### Automatic Number Conversion

Arabic numerals are converted to Traditional Chinese characters before romanization:

```python
def convert_numbers_to_chinese(text):
    """Convert Arabic numerals to Traditional Chinese characters"""
    # 22 → 二十二
    # 100 → 一百
    # 250 → 二百五十
```

**Examples**:
- 22號公車 → 二十二號公車 → jī-tsa̍p-jī hō kong-tshia
- 100元 → 一百元 → tsi̍t-pah înn
- 3個人 → 三個人 → sann ê lâng

This ensures numbers are properly romanized into Taiwanese pronunciation rather than left as digits.

### Character Variant Mapping

Mandarin characters are normalized to Taiwanese variants:

```python
CHAR_VARIANTS = {
    '腳': '跤',  # foot/leg (Mandarin → Taiwanese)
    '脚': '跤',  # simplified variant
}
```

When Claude translates "bicycle" to "腳踏車" (Mandarin variant), the system:
1. Checks manual entries (not found)
2. Checks MOE dict for "腳踏車" (not found)
3. Normalizes to "跤踏車" (Taiwanese variant)
4. Finds "跤踏車" in dict with romanization "kha-ta̍h-tshia"
5. Returns accurate Taiwanese pronunciation

### Dictionary Structure Example
```json
{
  "title": "跤踏車",
  "heteronyms": [{
    "trs": "kha-ta̍h-tshia",
    "synonyms": "孔明車,自轉車,鐵馬",
    "definitions": [{"type": "名", "def": "腳踏車。一種利用雙腳踩踏板前進的兩輪車。"}]
  }]
}
```

## API Integration

### Claude API (English → Taiwan Mandarin + Taiwanese Dual Translation)
- Model: `claude-3-5-haiku-20241022`
- Used in `translate_english_to_taiwanese_with_mandarin()` function
- Accepts English input
- Prompt: Translate to BOTH Taiwan Mandarin (國語) AND Taiwanese (台語) with vocabulary differences
  - Taiwan Mandarin vocabulary: 腳踏車 (bicycle), 很/真的 (very), 吃 (eat), 好玩 (fun), 的 (particle)
  - Taiwanese vocabulary: 跤踏車 (bicycle), 真/誠/足 (very), 食 (eat), 好耍/好sńg (fun), 的 (particle)
  - Word order: Taiwanese uses "是 + 真/誠/足 + adjective" (e.g., 是真好 not 真是好)
- Returns: BOTH translations in traditional characters + Taiwan-style Pinyin for Mandarin
- Format: `MANDARIN: {taiwan_mandarin_text}\nTAIWANESE: {taiwanese_text}\nPINYIN: {pinyin}`
- Examples:
  - "riding bikes is fun": MANDARIN: 騎腳踏車很好玩 / TAIWANESE: 騎跤踏車真好耍
  - "riding bikes is a great workout": MANDARIN: 騎腳踏車是很棒的運動 / TAIWANESE: 騎跤踏車是真好的運動

### MOE Dictionary (moedict-data-twblg)
- Source: Taiwan Ministry of Education Taiwanese Dictionary via g0v (https://github.com/g0v/moedict-data-twblg)
- File: `backend/moedict-twblg.json` (7.4MB, 14,489 entries)
- Indexed: 14,489 titles + 4,329 synonyms = 16,579 total lookup entries
- Structure: `{title: string, heteronyms: [{trs: string (Tâi-lô), synonyms: string, definitions: [...]}]}`
- Provides: Accurate Tâi-lô romanization for Taiwanese words and phrases
- Character normalization: Converts Mandarin variants to Taiwanese (腳 → 跤) before lookup

### TauPhahJi-Command (Python Library - Fallback)
- Converts Taiwanese text to structured linguistic data
- Provides Han characters, KIP romanization, and word segmentation
- KIP is converted to Tâi-lô in the backend (simplified conversion)
- Used only when MOE Dictionary doesn't have the entry

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

## Learning Systems

### Flashcard System with Spaced Repetition (SRS)

The app implements a complete flashcard system with spaced repetition for effective vocabulary learning.

#### Data Structure
```javascript
{
  id: timestamp,
  front: "English or Mandarin",
  back: "Taiwanese text",
  romanization: "Tâi-lô romanization",
  created: timestamp,
  lastReviewed: timestamp,
  nextReview: timestamp,
  interval: days_until_next_review,
  status: "learning" | "known" | "mastered"
}
```

#### SRS Algorithm
- **Again** (forgot): Reset to 1 day, status back to "learning"
- **Hard** (difficult): 3 days, stays "learning"
- **Good** (remembered): 7 days, becomes "known" if was learning
- **Easy** (perfect): 14 days, becomes "mastered" if was known

#### Features
- **localStorage persistence**: Flashcards survive page refresh
- **Audio playback**: Play Taiwanese audio during review
- **Review queue**: Shows only cards due for review based on SRS algorithm
- **View all mode**: Browse entire flashcard collection
- **Undo deletion**: Last 10 deleted cards can be restored
- **Batch add**: Add all vocabulary from learning modules to flashcards

### Learning Module Generation

Learning modules are interactive contextual dialogues generated dynamically by Claude API.

#### Generation Process
1. User selects a topic (e.g., "At the Bus Stop")
2. Backend streams module generation using Server-Sent Events (SSE)
3. Claude API generates:
   - Module metadata (title, description, level)
   - Dialogue lines with both Mandarin and Taiwanese
   - Vocabulary list with key words and phrases
   - Example sentences
4. Each Taiwanese phrase is romanized using the advanced multi-tier system
5. Frontend receives and displays content in real-time

#### Module Structure
```json
{
  "title": "At the Bus Stop",
  "description": "Learn common phrases...",
  "level": "beginner",
  "dialogue": [
    {
      "en": "Excuse me, does this bus go to Taipei Main Station?",
      "mandarin": "不好意思，這台公車有去台北車站嗎？",
      "taiwanese": "歹勢，這台公車有去台北車頭無？",
      "romanization": "pháinn-sè, tsit tâi kong-tshia ū khì Tâi-pak tshia-thâu bô?"
    }
  ],
  "vocabulary": [
    {
      "taiwanese": "公車",
      "romanization": "kong-tshia",
      "mandarin": "公車",
      "english": "bus",
      "notes": "Common transportation term"
    }
  ]
}
```

#### Streaming Implementation
```python
@app.route('/api/learning-modules/stream')
def stream_learning_module():
    def generate():
        # Stream metadata
        yield f"data: {json.dumps({'type': 'metadata', ...})}\n\n"

        # Stream dialogue lines as generated
        for line in dialogue:
            romanize_taiwanese_in_dialogue(line)
            yield f"data: {json.dumps({'type': 'dialogue', 'line': line})}\n\n"

        # Stream vocabulary
        for word in vocabulary:
            romanize_taiwanese_in_vocabulary(word)
            yield f"data: {json.dumps({'type': 'vocab', 'word': word})}\n\n"

        # Send completion
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return Response(generate(), mimetype='text/event-stream')
```

This creates a smooth user experience where content appears progressively as it's generated, rather than waiting for the entire module to complete.

### Lesson Data Structure

Lessons are stored as JSON files in `src/data/lessons/` and follow this structure:

```json
{
  "id": "unit-01",
  "title": "Greetings and Basic Politeness",
  "level": "beginner",
  "duration": "3-4 lessons",
  "goal": "Learn essential greetings and polite expressions",

  "objectives": ["Greet people appropriately", "Introduce yourself", ...],
  "reviewChecklist": ["I can greet people", "I can introduce myself", ...],

  "vocabulary": [
    {
      "taiwanese": "你好",
      "romanization": "lí-hó",
      "mandarin": "你好",
      "pinyin": "nǐ hǎo",
      "english": "Hello",
      "notes": "Most common general greeting",
      "audio": true
    }
  ],

  "grammar": [
    {
      "title": "是 (sī) structure",
      "explanation": "是 (sī) is used to state identity...",
      "pattern": "Subject + 是 + Noun/Identity",
      "examples": [
        {
          "taiwanese": "我是台灣人",
          "romanization": "Guá sī Tâi-uân-lâng",
          "english": "I am Taiwanese",
          "breakdown": "我 (I) + 是 (am) + 台灣人 (Taiwanese)"
        }
      ],
      "notes": "Optional additional notes"
    }
  ],

  "dialogues": [
    {
      "title": "Meeting a Neighbor",
      "scenario": "You meet your elderly neighbor in the morning",
      "lines": [
        {
          "speaker": "You",
          "taiwanese": "𠢕早！",
          "romanization": "Gâu-tsá!",
          "english": "Good morning!",
          "audio": true
        }
      ]
    }
  ],

  "culturalNotes": [
    {
      "title": "Traditional Greeting - 食飽未?",
      "content": "\"食飽未?\" is a traditional greeting that reflects..."
    }
  ],

  "exercises": [
    {
      "type": "matching",
      "title": "Match Taiwanese Greetings",
      "instructions": "Match the Taiwanese phrases with their English meanings",
      "items": [
        {
          "taiwanese": "你好",
          "romanization": "lí-hó",
          "answer": "Hello"
        }
      ]
    },
    {
      "type": "fill-in-blank",
      "items": [
        {
          "prompt": "A: 你好，____？",
          "answer": "食飽未",
          "romanization": "Tsia̍h-pá-buē",
          "hint": "Traditional greeting about eating"
        }
      ]
    },
    {
      "type": "multiple-choice",
      "items": [
        {
          "question": "Someone says 'Lí-hó' to you. How do you respond?",
          "options": [
            { "text": "你好 (Lí-hó)", "correct": true },
            { "text": "再會 (Tsài-huē)", "correct": false }
          ],
          "explanation": "你好 is the appropriate greeting response"
        }
      ]
    },
    {
      "type": "translation",
      "items": [
        {
          "english": "My name is John.",
          "answer": "我的名是John。",
          "romanization": "Guá ê miâ sī John."
        }
      ]
    },
    {
      "type": "role-play",
      "items": [
        {
          "scenario": "You meet your elderly neighbor in the morning",
          "yourRole": "Resident",
          "partnerRole": "Elderly Neighbor",
          "steps": ["Greet them appropriately", "Ask if they've eaten", ...]
        }
      ]
    }
  ],

  "practiceActivities": [
    {
      "title": "Flashcard Review",
      "description": "Create flashcards for all 22 vocabulary words",
      "goal": "Memorize essential vocabulary"
    }
  ]
}
```

**Exercise Types Supported**:
- `matching`: Drag-and-drop matching with sticky answer bank
- `fill-in-blank`: Show/reveal answer functionality
- `multiple-choice`: Clickable options with instant feedback
- `translation`: English to Taiwanese translation practice
- `role-play`: Guided conversation scenarios

**Note**: Pronunciation and listening exercise types were removed as they were counterproductive (showing answers defeats the purpose). Audio playback is integrated throughout vocabulary, dialogues, and other sections instead.

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
1. Edit `translate_english_to_taiwanese_with_mandarin()` in `backend/app.py`
2. Adjust Claude API prompt to modify vocabulary or word order rules
3. Update format parsing if changing output structure (MANDARIN/TAIWANESE/PINYIN lines)
4. Test with various English inputs to verify both Taiwan Mandarin and Taiwanese translations

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
anthropic>=0.40.0
python-dotenv==1.0.0
gunicorn==21.2.0
pypinyin==0.55.0  # Fallback for Pinyin generation when Claude doesn't provide it
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
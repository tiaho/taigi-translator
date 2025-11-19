#!/usr/bin/env python3
"""
Pre-generate and cache all audio for a lesson to Supabase
This makes audio playback instant for all users
"""

import sys
import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Add parent directory to path to import from backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Import Supabase client setup from app.py
try:
    from supabase import create_client
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')

    if SUPABASE_URL and SUPABASE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        SUPABASE_BUCKET = 'taiwanese-audio'
        print(f"✓ Connected to Supabase")
    else:
        print("❌ SUPABASE_URL or SUPABASE_KEY not set")
        sys.exit(1)
except ImportError:
    print("❌ Supabase library not installed. Run: pip install supabase")
    sys.exit(1)

def cache_audio_to_supabase(romanization, audio_data):
    """Cache audio file to Supabase Storage"""
    try:
        # Use romanization as filename (sanitized - remove ALL special characters)
        import re
        # Remove all non-alphanumeric characters except dash and underscore
        filename = re.sub(r'[^a-zA-Z0-9_-]', '', romanization.replace(' ', '_').replace('-', '_')) + '.mp3'

        # Upload to Supabase Storage
        supabase_client.storage.from_(SUPABASE_BUCKET).upload(
            filename,
            audio_data,
            file_options={"content-type": "audio/mpeg", "upsert": "true"}
        )

        # Store metadata in database
        supabase_client.table('audio_cache').upsert({
            'tailo_text': romanization,
            'storage_path': filename,
            'file_size': len(audio_data),
            'tier': 1  # Default tier for lessons
        }, on_conflict='tailo_text').execute()

        return True
    except Exception as e:
        print(f"  ⚠️  Supabase error: {e}")
        return False

def generate_and_cache_audio(romanization, retry_count=0, max_retries=3):
    """Generate audio from Hapsing API and cache to Supabase with retry logic"""
    import time

    try:
        # Generate audio from Hapsing
        audio_url = f"https://hapsing.ithuan.tw/bangtsam?taibun={urllib.parse.quote(romanization)}"
        print(f"  Generating: {romanization}...", end=' ', flush=True)

        response = urllib.request.urlopen(audio_url, timeout=60)
        audio_data = response.read()

        print(f"✓ ({len(audio_data)} bytes)", end=' ', flush=True)

        # Cache to Supabase
        if cache_audio_to_supabase(romanization, audio_data):
            print("→ Cached to Supabase ✓")
            return True
        else:
            print("→ Failed to cache")
            return False

    except Exception as e:
        if retry_count < max_retries:
            wait_time = (retry_count + 1) * 5  # 5s, 10s, 15s
            print(f"✗ Error: {e}")
            print(f"    Retrying in {wait_time}s... (attempt {retry_count + 1}/{max_retries})")
            time.sleep(wait_time)
            return generate_and_cache_audio(romanization, retry_count + 1, max_retries)
        else:
            print(f"✗ Error: {e}")
            return False

def cache_lesson_audio(lesson_id):
    """Pre-generate and cache all audio for a specific lesson"""
    # Load lesson data
    lesson_path = Path(__file__).parent.parent.parent / 'src' / 'data' / 'lessons' / f'{lesson_id}.json'

    if not lesson_path.exists():
        print(f"❌ Lesson file not found: {lesson_path}")
        return 1

    with open(lesson_path, 'r', encoding='utf-8') as f:
        lesson_data = json.load(f)

    print(f"\n{'=' * 80}")
    print(f"PRE-CACHING AUDIO FOR: {lesson_data.get('title', lesson_id)}")
    print(f"{'=' * 80}\n")

    # Collect all romanizations to cache
    phrases_to_cache = []

    # From vocabulary
    for vocab in lesson_data.get('vocabulary', []):
        if vocab.get('audio', False):
            phrases_to_cache.append({
                'romanization': vocab['romanization'],
                'type': 'vocabulary',
                'text': vocab['taiwanese']
            })

    # From dialogues
    for dialogue in lesson_data.get('dialogues', []):
        for line in dialogue.get('lines', []):
            if line.get('audio', False):
                phrases_to_cache.append({
                    'romanization': line['romanization'],
                    'type': 'dialogue',
                    'text': line['taiwanese']
                })

    print(f"Total phrases to cache: {len(phrases_to_cache)}\n")

    # Cache each phrase
    import time
    success_count = 0
    failed = []

    for i, phrase in enumerate(phrases_to_cache, 1):
        print(f"[{i}/{len(phrases_to_cache)}]", end=' ')

        if generate_and_cache_audio(phrase['romanization']):
            success_count += 1
        else:
            failed.append(phrase)

        # Add delay between requests to avoid overwhelming the API
        if i < len(phrases_to_cache):
            time.sleep(2)  # 2 second delay between requests

    # Summary
    print(f"\n{'=' * 80}")
    print(f"SUMMARY")
    print(f"{'=' * 80}")
    print(f"Successfully cached: {success_count}/{len(phrases_to_cache)} phrases")

    if failed:
        print(f"\nFailed ({len(failed)}):")
        for phrase in failed:
            print(f"  - {phrase['text']} ({phrase['romanization']})")

    print(f"\n✅ Audio caching complete for {lesson_id}!")
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python cache_lesson_audio.py <lesson_id>")
        print("Example: python cache_lesson_audio.py unit-01")
        sys.exit(1)

    lesson_id = sys.argv[1]
    sys.exit(cache_lesson_audio(lesson_id))

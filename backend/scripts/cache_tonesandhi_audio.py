#!/usr/bin/env python3
"""
Pre-generate and cache all audio for Tone Sandhi Trainer exercises to Supabase
This makes audio playback instant for all users
"""

import sys
import os
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

# Tone Sandhi Exercises - extracted from taiwanese-translator.jsx
TONE_SANDHI_EXERCISES = {
    'beginner': [
        {'compound': 'kha-ta̍h-tshia', 'characters': ['kha', 'ta̍h', 'tshia']},  # 跤踏車
        {'compound': 'kong-tshia', 'characters': ['kong', 'tshia']},  # 公車
        {'compound': 'tsa-hng', 'characters': ['tsa', 'hng']},  # 昨昏
        {'compound': 'bîn-á-tsài', 'characters': ['bîn', 'á', 'tsài']},  # 明仔載
        {'compound': 'âng-sik', 'characters': ['âng', 'sik']},  # 紅色
        {'compound': 'nâ-sik', 'characters': ['nâ', 'sik']},  # 藍色
    ],
    'intermediate': [
        {'compound': 'kè-thîng-tshia', 'characters': ['kè', 'thîng', 'tshia']},  # 計程車
        {'compound': 'tâi-uân-lâng', 'characters': ['tâi', 'uân', 'lâng']},  # 台灣人
        {'compound': 'tiān-náu', 'characters': ['tiān', 'náu']},  # 電腦
        {'compound': 'tiān-uē', 'characters': ['tiān', 'uē']},  # 電話
        {'compound': 'ha̍k-sing', 'characters': ['ha̍k', 'sing']},  # 學生
    ],
    'advanced': [
        {'compound': 'tsia̍h-pá-buē', 'characters': ['tsia̍h', 'pá', 'buē']},  # 食飽未
        {'compound': 'lí-hó-bô', 'characters': ['lí', 'hó', 'bô']},  # 你好無
        {'compound': 'tuì-put-tiū', 'characters': ['tuì', 'put', 'tiū']},  # 對不住
        {'compound': 'bô-iàu-kín', 'characters': ['bô', 'iàu', 'kín']},  # 無要緊
    ]
}

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
            'tier': 2  # Tier 2 for tone sandhi exercises
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

def cache_tonesandhi_audio():
    """Pre-generate and cache all audio for tone sandhi exercises"""
    print(f"\n{'=' * 80}")
    print(f"PRE-CACHING AUDIO FOR: Tone Sandhi Trainer")
    print(f"{'=' * 80}\n")

    # Collect all unique romanizations
    phrases_to_cache = set()

    for level, exercises in TONE_SANDHI_EXERCISES.items():
        for exercise in exercises:
            # Add compound word
            phrases_to_cache.add(exercise['compound'])
            # Add individual characters
            for char in exercise['characters']:
                phrases_to_cache.add(char)

    phrases_list = sorted(list(phrases_to_cache))
    print(f"Total unique phrases to cache: {len(phrases_list)}\n")

    # Cache each phrase
    import time
    success_count = 0
    failed = []

    for i, phrase in enumerate(phrases_list, 1):
        print(f"[{i}/{len(phrases_list)}]", end=' ')

        if generate_and_cache_audio(phrase):
            success_count += 1
        else:
            failed.append(phrase)

        # Add delay between requests to avoid overwhelming the API
        if i < len(phrases_list):
            time.sleep(2)  # 2 second delay between requests

    # Summary
    print(f"\n{'=' * 80}")
    print(f"SUMMARY")
    print(f"{'=' * 80}")
    print(f"Successfully cached: {success_count}/{len(phrases_list)} phrases")

    if failed:
        print(f"\nFailed ({len(failed)}):")
        for phrase in failed:
            print(f"  - {phrase}")

    print(f"\n✅ Audio caching complete for Tone Sandhi Trainer!")
    return 0

if __name__ == '__main__':
    sys.exit(cache_tonesandhi_audio())

#!/usr/bin/env python3
"""
Test Supabase Audio Cache
Fetches a few entries from Supabase and displays their URLs
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Connect to Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

print("Testing Supabase Audio Cache\n" + "="*70)

# Fetch first 5 entries
result = supabase.table('audio_cache').select('*').limit(5).execute()

print(f"\nFound {len(result.data)} cached audio entries:\n")

for entry in result.data:
    tailo_text = entry['tailo_text']
    storage_path = entry['storage_path']
    file_size = entry['file_size']
    tier = entry['tier']

    # Construct public URL
    public_url = f"{supabase_url}/storage/v1/object/public/taiwanese-audio/{storage_path}"

    print(f"Word: {tailo_text}")
    print(f"  Tier: {tier}")
    print(f"  Size: {file_size} bytes")
    print(f"  URL: {public_url}")
    print()

print("="*70)
print("\nTest one of the URLs above in your browser to hear the audio!")
print("Or use curl:")
print(f"  curl -o test.mp3 '{public_url}'")

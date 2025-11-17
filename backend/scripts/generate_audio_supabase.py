#!/usr/bin/env python3
"""
Audio Generation Script for Supabase
Pre-generates and caches audio in Supabase Storage + PostgreSQL
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import hashlib
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)


class SupabaseAudioGenerator:
    def __init__(self, supabase: Client, priority_file, tier=None):
        self.supabase = supabase
        self.priority_file = priority_file
        self.tier_filter = tier
        self.bucket_name = 'taiwanese-audio'

        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0,
            'total_size': 0
        }

        # Load priority list
        print(f"Loading priority list from {priority_file}...")
        with open(priority_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.entries = data['entries']

        # Filter by tier if specified
        if tier:
            self.entries = [e for e in self.entries if self.get_tier(e['score']) == tier]

        print(f"Loaded {len(self.entries)} entries to process")

    def get_tier(self, score):
        """Determine tier from score"""
        if score >= 60:
            return 1
        elif score >= 40:
            return 2
        else:
            return 3

    def check_exists(self, tailo_text):
        """Check if audio already exists in Supabase"""
        try:
            result = self.supabase.table('audio_cache').select('id').eq('tailo_text', tailo_text).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"    Error checking cache: {e}")
            return False

    def fetch_audio(self, tailo_text):
        """Fetch audio from Hapsing API"""
        url = f"https://hapsing.ithuan.tw/bangtsam?taibun={urllib.parse.quote(tailo_text)}"

        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                audio_data = response.read()
                return audio_data
        except urllib.error.HTTPError as e:
            print(f"    HTTP Error {e.code}: {e.reason}")
            return None
        except urllib.error.URLError as e:
            print(f"    URL Error: {e.reason}")
            return None
        except Exception as e:
            print(f"    Error: {str(e)}")
            return None

    def upload_to_storage(self, tailo_text, audio_data):
        """Upload audio file to Supabase Storage"""
        # Use hash of tailo_text as filename to avoid special character issues
        # The original tailo_text is stored in the database metadata
        file_hash = hashlib.md5(tailo_text.encode('utf-8')).hexdigest()
        file_path = f"{file_hash}.mp3"

        try:
            # Upload to storage
            result = self.supabase.storage.from_(self.bucket_name).upload(
                file_path,
                audio_data,
                file_options={
                    'content-type': 'audio/mpeg',
                    'cache-control': '3600'  # Cache for 1 hour
                }
            )

            return file_path

        except Exception as e:
            # Check if file already exists
            if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                print(f"    File already exists in storage, using existing")
                return file_path
            print(f"    Storage upload error: {e}")
            return None

    def store_metadata(self, tailo_text, storage_path, file_size, tier, score):
        """Store metadata in PostgreSQL"""
        try:
            data = {
                'tailo_text': tailo_text,
                'storage_path': storage_path,
                'file_size': file_size,
                'tier': tier,
                'score': score
            }

            result = self.supabase.table('audio_cache').insert(data).execute()
            return True

        except Exception as e:
            if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
                # Already exists, update instead
                try:
                    result = self.supabase.table('audio_cache').update({
                        'storage_path': storage_path,
                        'file_size': file_size,
                        'last_accessed': 'now()'
                    }).eq('tailo_text', tailo_text).execute()
                    return True
                except:
                    pass
            print(f"    Database error: {e}")
            return False

    def process_entry(self, entry, index, total):
        """Process a single entry"""
        word = entry['word']
        romanization = entry['romanization']
        score = entry['score']
        tier = self.get_tier(score)

        print(f"\n[{index}/{total}] {word} ({romanization}) - Tier {tier}, Score {score}")

        # Check if already exists
        if self.check_exists(romanization):
            print(f"  ⏭️  Already cached, skipping")
            self.stats['skipped'] += 1
            return True

        # Fetch audio
        print(f"  🔊 Fetching audio from Hapsing API...")
        audio_data = self.fetch_audio(romanization)

        if audio_data is None:
            print(f"  ❌ Failed to fetch audio")
            self.stats['failed'] += 1
            return False

        file_size = len(audio_data)
        print(f"  📦 Audio fetched ({file_size} bytes)")

        # Upload to storage
        print(f"  ☁️  Uploading to Supabase Storage...")
        storage_path = self.upload_to_storage(romanization, audio_data)

        if storage_path is None:
            print(f"  ❌ Failed to upload to storage")
            self.stats['failed'] += 1
            return False

        print(f"  💾 Stored at: {storage_path}")

        # Store metadata in database
        print(f"  📝 Saving metadata to database...")
        success = self.store_metadata(romanization, storage_path, file_size, tier, score)

        if success:
            print(f"  ✅ Successfully cached")
            self.stats['success'] += 1
            self.stats['total_size'] += file_size
            return True
        else:
            print(f"  ⚠️  Metadata save failed")
            self.stats['failed'] += 1
            return False

    def generate_all(self, delay=1.0, batch_size=10):
        """Generate audio for all entries with rate limiting"""
        total = len(self.entries)
        self.stats['total'] = total

        print(f"\n{'='*70}")
        print(f"Starting audio generation for {total} entries")
        print(f"Delay between requests: {delay}s")
        print(f"Progress checkpoint every {batch_size} entries")
        print(f"{'='*70}\n")

        start_time = time.time()

        for i, entry in enumerate(self.entries, 1):
            try:
                self.process_entry(entry, i, total)

                # Rate limiting delay (except for last item)
                if i < total:
                    time.sleep(delay)

                # Checkpoint progress
                if i % batch_size == 0:
                    self.print_progress(i, total, time.time() - start_time)

            except KeyboardInterrupt:
                print("\n\n⚠️  Interrupted by user")
                break
            except Exception as e:
                print(f"\n❌ Unexpected error: {str(e)}")
                self.stats['failed'] += 1
                continue

        # Final stats
        elapsed = time.time() - start_time
        self.print_final_stats(elapsed)

    def print_progress(self, current, total, elapsed):
        """Print progress checkpoint"""
        percent = (current / total) * 100
        rate = current / elapsed if elapsed > 0 else 0
        eta = (total - current) / rate if rate > 0 else 0

        print(f"\n{'─'*70}")
        print(f"Progress: {current}/{total} ({percent:.1f}%)")
        print(f"Elapsed: {elapsed/60:.1f} min | Rate: {rate:.1f} entries/sec | ETA: {eta/60:.1f} min")
        print(f"Success: {self.stats['success']} | Failed: {self.stats['failed']} | Skipped: {self.stats['skipped']}")
        print(f"Total size: {self.stats['total_size']/(1024*1024):.2f} MB")
        print(f"{'─'*70}\n")

    def print_final_stats(self, elapsed):
        """Print final statistics"""
        print(f"\n{'='*70}")
        print("GENERATION COMPLETE")
        print(f"{'='*70}")
        print(f"Total entries processed: {self.stats['total']}")
        print(f"Successfully cached: {self.stats['success']}")
        print(f"Failed: {self.stats['failed']}")
        print(f"Skipped (already cached): {self.stats['skipped']}")
        print(f"Total audio size: {self.stats['total_size']/(1024*1024):.2f} MB")
        print(f"Time elapsed: {elapsed/60:.1f} minutes")
        if self.stats['success'] > 0:
            print(f"Average rate: {self.stats['success']/elapsed:.2f} entries/second")
        print(f"{'='*70}\n")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Generate and cache audio in Supabase')
    parser.add_argument('--tier', type=int, choices=[1, 2, 3],
                       help='Only generate for specific tier (1, 2, or 3)')
    parser.add_argument('--delay', type=float, default=1.0,
                       help='Delay between API requests in seconds (default: 1.0)')
    parser.add_argument('--batch-size', type=int, default=10,
                       help='Progress checkpoint frequency (default: 10)')

    args = parser.parse_args()

    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials!")
        print("\nPlease set environment variables:")
        print("  export SUPABASE_URL='your-project-url'")
        print("  export SUPABASE_KEY='your-service-role-key'")
        return 1

    # Paths
    priority_file = Path(__file__).parent.parent / 'data' / 'priority_entries.json'

    if not priority_file.exists():
        print(f"❌ Priority list not found at {priority_file}")
        print("Run rank_dictionary_entries.py first to generate priority list")
        return 1

    # Create Supabase client
    supabase: Client = create_client(supabase_url, supabase_key)

    # Create generator
    generator = SupabaseAudioGenerator(supabase, priority_file, tier=args.tier)

    # Confirm before starting
    tier_msg = f"Tier {args.tier} only" if args.tier else "All tiers"
    print(f"\nReady to generate audio for {len(generator.entries)} entries ({tier_msg})")
    print(f"Delay: {args.delay}s between requests")
    print(f"Estimated time: ~{len(generator.entries) * args.delay / 60:.1f} minutes")

    response = input("\nContinue? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled")
        return 0

    # Generate audio
    generator.generate_all(delay=args.delay, batch_size=args.batch_size)

    return 0


if __name__ == '__main__':
    sys.exit(main())

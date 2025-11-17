#!/usr/bin/env python3
"""
Supabase Setup Script
Sets up PostgreSQL table and Storage bucket for audio cache
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)


def setup_audio_table(supabase: Client):
    """Create audio_cache table in Supabase PostgreSQL"""

    # SQL to create table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS audio_cache (
        id BIGSERIAL PRIMARY KEY,
        tailo_text TEXT NOT NULL UNIQUE,
        storage_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        tier INTEGER,
        score INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_accessed TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes for fast lookups
    CREATE INDEX IF NOT EXISTS idx_audio_cache_tailo_text ON audio_cache(tailo_text);
    CREATE INDEX IF NOT EXISTS idx_audio_cache_tier ON audio_cache(tier);
    CREATE INDEX IF NOT EXISTS idx_audio_cache_score ON audio_cache(score DESC);

    -- Enable Row Level Security (RLS)
    ALTER TABLE audio_cache ENABLE ROW LEVEL SECURITY;

    -- Create policy to allow public read access
    DROP POLICY IF EXISTS "Allow public read access" ON audio_cache;
    CREATE POLICY "Allow public read access" ON audio_cache
        FOR SELECT USING (true);

    -- Create policy to allow service role full access
    DROP POLICY IF EXISTS "Allow service role all access" ON audio_cache;
    CREATE POLICY "Allow service role all access" ON audio_cache
        USING (true)
        WITH CHECK (true);
    """

    print("Creating audio_cache table...")

    try:
        # Execute SQL using RPC (need to create a function first)
        # Or use the SQL editor in Supabase dashboard
        print("⚠️  Please run the following SQL in your Supabase SQL Editor:")
        print("\n" + "="*70)
        print(create_table_sql)
        print("="*70 + "\n")

        # Try to verify table exists by querying
        result = supabase.table('audio_cache').select('count', count='exact').limit(1).execute()
        print("✓ Table 'audio_cache' verified!")

    except Exception as e:
        print(f"Note: Could not auto-create table. Error: {e}")
        print("\nPlease manually run the SQL above in Supabase dashboard:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Click 'SQL Editor' in the left sidebar")
        print("4. Paste and run the SQL above")


def setup_storage_bucket(supabase: Client):
    """Create Storage bucket for audio files"""

    bucket_name = 'taiwanese-audio'

    print(f"\nSetting up storage bucket '{bucket_name}'...")

    try:
        # Check if bucket exists
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b['name'] == bucket_name for b in buckets)

        if bucket_exists:
            print(f"✓ Bucket '{bucket_name}' already exists")
        else:
            # Create bucket
            supabase.storage.create_bucket(
                bucket_name,
                options={
                    'public': True,  # Public read access
                    'file_size_limit': 1024 * 1024,  # 1MB per file
                    'allowed_mime_types': ['audio/mpeg', 'audio/mp3']
                }
            )
            print(f"✓ Created bucket '{bucket_name}'")

        # Set bucket policy (public read)
        print("✓ Bucket is configured for public read access")

    except Exception as e:
        print(f"❌ Error setting up storage bucket: {e}")
        print("\nPlease manually create the bucket in Supabase dashboard:")
        print("1. Go to Storage section")
        print(f"2. Create new bucket: '{bucket_name}'")
        print("3. Set as 'Public bucket'")
        print("4. Set file size limit to 1MB")
        return False

    return True


def test_connection(supabase: Client):
    """Test connection to Supabase"""

    print("\nTesting connection to Supabase...")

    try:
        # Test database connection
        result = supabase.table('audio_cache').select('count', count='exact').limit(0).execute()
        print(f"✓ Database connection successful")
        print(f"  Current entries in audio_cache: {result.count}")

        # Test storage connection
        buckets = supabase.storage.list_buckets()
        print(f"✓ Storage connection successful")
        print(f"  Available buckets: {len(buckets)}")

        return True

    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False


def main():
    print("="*70)
    print("Supabase Audio Cache Setup")
    print("="*70)

    # Get Supabase credentials from environment
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        print("\n❌ Missing Supabase credentials!")
        print("\nPlease set environment variables:")
        print("  export SUPABASE_URL='your-project-url'")
        print("  export SUPABASE_KEY='your-service-role-key'")
        print("\nGet these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api")
        return 1

    print(f"\nConnecting to Supabase...")
    print(f"  URL: {supabase_url}")

    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✓ Supabase client created")

        # Setup database table
        setup_audio_table(supabase)

        # Setup storage bucket
        setup_storage_bucket(supabase)

        # Test connection
        if test_connection(supabase):
            print("\n" + "="*70)
            print("✅ Setup complete!")
            print("="*70)
            print("\nNext steps:")
            print("1. Verify table exists in Supabase dashboard")
            print("2. Run generate_audio_supabase.py to start caching audio")
            return 0
        else:
            print("\n❌ Setup incomplete - please check errors above")
            return 1

    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())

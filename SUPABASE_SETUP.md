# Supabase Setup Guide for Audio Caching

This guide walks you through setting up Supabase for audio file storage and caching.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization (free tier)

## Step 2: Create New Project

1. Click "New Project"
2. Fill in:
   - **Name**: TaigiApp Audio Cache (or your choice)
   - **Database Password**: (generate strong password, save it!)
   - **Region**: Choose closest to your users (e.g., Southeast Asia, US East)
3. Click "Create new project"
4. Wait ~2 minutes for setup to complete

## Step 3: Get API Credentials

1. In your project dashboard, click "Settings" (gear icon) in left sidebar
2. Click "API" under Project Settings
3. Copy these values:

```bash
# Project URL
https://xxxxxxxxxxxxx.supabase.co

# anon public key (for frontend - public)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# service_role key (for backend - SECRET!)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Add to Environment Variables

### Local Development (.env file)

```bash
# Add to your .env file
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your_service_role_key_here
```

### Render Deployment

1. Go to https://render.com/dashboard
2. Select your `taigi-backend` service
3. Go to "Environment" tab
4. Add environment variables:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_KEY` = your service role key
5. Click "Save Changes"

## Step 5: Create Database Table

1. In Supabase dashboard, click "SQL Editor" in left sidebar
2. Click "New query"
3. Copy and paste this SQL:

```sql
-- Create audio_cache table
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

-- Allow public read access (anyone can fetch audio)
CREATE POLICY "Allow public read access" ON audio_cache
    FOR SELECT USING (true);

-- Allow service role full access (for audio generation script)
CREATE POLICY "Allow service role all access" ON audio_cache
    FOR ALL USING (auth.role() = 'service_role');
```

4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Verify: "Success. No rows returned"

## Step 6: Create Storage Bucket

1. Click "Storage" in left sidebar
2. Click "New bucket"
3. Fill in:
   - **Name**: `taiwanese-audio`
   - **Public bucket**: ✓ Checked (enable public access)
   - **File size limit**: 1 MB
   - **Allowed MIME types**: `audio/mpeg, audio/mp3`
4. Click "Create bucket"

## Step 7: Install Python Package

```bash
# Activate virtual environment
source venv/bin/activate

# Install supabase client
pip install supabase
```

## Step 8: Update requirements.txt

```bash
# Add to requirements.txt
echo "supabase>=2.0.0" >> requirements.txt
```

## Step 9: Test Connection

```bash
# Set environment variables (if not in .env)
export SUPABASE_URL='https://xxxxxxxxxxxxx.supabase.co'
export SUPABASE_KEY='your_service_role_key'

# Run setup script
python3 backend/scripts/setup_supabase.py
```

Expected output:
```
✓ Supabase client created
✓ Table 'audio_cache' verified!
✓ Bucket 'taiwanese-audio' already exists
✓ Database connection successful
✓ Storage connection successful
✅ Setup complete!
```

## Step 10: Generate Audio (Start with Tier 1)

```bash
# Generate only Tier 1 (21 entries, ~1-2 MB, ~30 seconds)
python3 backend/scripts/generate_audio_supabase.py --tier 1

# Or generate all tiers (3000 entries, ~50 minutes)
python3 backend/scripts/generate_audio_supabase.py
```

## Verify in Supabase Dashboard

### Check Database
1. Go to "Table Editor"
2. Select "audio_cache" table
3. You should see entries with tailo_text, storage_path, etc.

### Check Storage
1. Go to "Storage"
2. Click "taiwanese-audio" bucket
3. You should see .mp3 files

## Usage in Your App

The audio will be accessible via CDN URL:
```
https://xxxxxxxxxxxxx.supabase.co/storage/v1/object/public/taiwanese-audio/FILENAME.mp3
```

## Free Tier Limits

✓ **Database**: 500 MB (plenty for metadata)
✓ **Storage**: 1 GB (enough for ~3000 audio files)
✓ **Bandwidth**: 5 GB/month (good for moderate usage)
✓ **No credit card required**
✓ **No expiration** (unlike Render's 90-day database)

## Troubleshooting

### "Missing Supabase credentials"
- Make sure `.env` file has SUPABASE_URL and SUPABASE_KEY
- Or export them in your shell before running scripts

### "Permission denied" or RLS errors
- Check that RLS policies were created correctly in SQL
- Verify you're using the **service_role** key, not anon key

### "Bucket not found"
- Make sure bucket is named exactly `taiwanese-audio`
- Check that it's set as "Public bucket"

### Storage upload fails
- Verify file size limit is set to at least 1 MB
- Check allowed MIME types include `audio/mpeg`

## Next Steps

1. ✅ Complete Supabase setup
2. ✅ Generate Tier 1 audio (21 entries)
3. Update Flask backend to fetch from Supabase
4. Test audio playback in app
5. Generate Tier 2 & 3 as needed

## Cost Estimate (if scaling beyond free tier)

Supabase Pro tier ($25/month):
- 8 GB database
- 100 GB storage
- 200 GB bandwidth

For this project, **free tier should be sufficient** indefinitely.

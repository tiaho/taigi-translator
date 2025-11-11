from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from tauphahji_cmd import tàuphahjī
from anthropic import Anthropic
from dotenv import load_dotenv
import os
import re
import json
from functools import lru_cache

# Load environment variables
load_dotenv()

# Determine if running in production
IS_PRODUCTION = os.getenv('FLASK_ENV') == 'production'

# Configure Flask to serve React build in production
if IS_PRODUCTION:
    # In production, serve the React build from dist folder
    static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dist')
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
else:
    app = Flask(__name__)

CORS(app)

# Simple in-memory cache for audio
audio_cache = {}

# Common phrases to pre-cache
COMMON_PHRASES = [
    'Lí hó',           # Hello
    'To-siā',          # Thank you
    'Tsài-kiàn',       # Goodbye
    'Sī',              # Yes
    'M̄-sī',           # No
    'Tshiánn',         # Please
    'Pháinn-sè',       # Excuse me
    'Lí hó bô?',       # How are you?
    'Guá ài lí',       # I love you
    'Gâu-tsá',         # Good morning
    'Tsá-tǹg'          # Breakfast
]

def pre_cache_audio():
    """Pre-cache audio for common phrases on startup"""
    import urllib.request
    import urllib.parse

    print("\n🎵 Pre-caching audio for common phrases...")
    cached_count = 0

    for phrase in COMMON_PHRASES:
        try:
            audio_url = f"https://hapsing.ithuan.tw/bangtsam?taibun={urllib.parse.quote(phrase)}"
            print(f"  Caching: {phrase}...", end=' ')
            response = urllib.request.urlopen(audio_url, timeout=20)
            audio_data = response.read()
            audio_cache[phrase] = audio_data
            cached_count += 1
            print(f"✓ ({len(audio_data)} bytes)")
        except Exception as e:
            print(f"✗ Failed: {e}")

    print(f"✅ Pre-cached {cached_count}/{len(COMMON_PHRASES)} phrases\n")

# Initialize Anthropic client
anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
if anthropic_api_key:
    anthropic_client = Anthropic(api_key=anthropic_api_key)
else:
    anthropic_client = None
    print("WARNING: ANTHROPIC_API_KEY not set. English translation will not work.")

def translate_english_to_taiwanese_with_mandarin(english_text):
    """
    Use Claude API to translate English to both Mandarin and Taiwanese in one call
    """
    if not anthropic_client:
        raise Exception("Claude API key not configured. Please set ANTHROPIC_API_KEY in .env file")

    try:
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Translate the following English text to both Mandarin Chinese and Taiwanese Hokkien (台語).

Input text: "{english_text}"

Provide the output in exactly this format:
MANDARIN: [traditional Chinese characters for Mandarin]
PINYIN: [Hanyu Pinyin with tone marks]
TAIWANESE: [traditional Chinese characters for Taiwanese]

Example format:
MANDARIN: 你好
PINYIN: nǐ hǎo
TAIWANESE: 你好

Important: Use traditional Chinese characters (繁體中文/漢字) for both translations."""
            }]
        )

        response_text = message.content[0].text.strip()
        print(f"Translation response: {response_text}")

        # Parse the response
        lines = response_text.split('\n')
        mandarin_text = ""
        pinyin = ""
        taiwanese_text = ""

        for line in lines:
            if line.startswith('MANDARIN:'):
                mandarin_text = line.replace('MANDARIN:', '').strip()
            elif line.startswith('PINYIN:'):
                pinyin = line.replace('PINYIN:', '').strip()
            elif line.startswith('TAIWANESE:'):
                taiwanese_text = line.replace('TAIWANESE:', '').strip()

        print(f"Translated '{english_text}' to Mandarin '{mandarin_text}' ({pinyin}) and Taiwanese '{taiwanese_text}'")
        return mandarin_text, pinyin, taiwanese_text

    except Exception as e:
        print(f"Translation error: {e}")
        raise

def translate_mandarin_to_taiwanese(mandarin_text):
    """
    Use Claude API to translate Mandarin to Taiwanese (Han characters)
    """
    if not anthropic_client:
        raise Exception("Claude API key not configured. Please set ANTHROPIC_API_KEY in .env file")

    try:
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Translate the following Mandarin Chinese text to Taiwanese Hokkien (台語) using traditional Chinese characters (漢字).

Input text: "{mandarin_text}"

Provide ONLY the Taiwanese translation in Han characters (traditional Chinese), with no explanations or additional text. Just the translation."""
            }]
        )

        taiwanese_text = message.content[0].text.strip()
        print(f"Translated Mandarin '{mandarin_text}' to Taiwanese '{taiwanese_text}'")
        return taiwanese_text

    except Exception as e:
        print(f"Translation error: {e}")
        raise

def translate_taiwanese_to_english(taiwanese_text):
    """
    Use Claude API to translate Taiwanese (Han characters) to English
    """
    if not anthropic_client:
        raise Exception("Claude API key not configured. Please set ANTHROPIC_API_KEY in .env file")

    try:
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Translate the following Taiwanese Hokkien (台語) text to English.

The input is in traditional Chinese characters (漢字). Provide a natural English translation.

Input text: "{taiwanese_text}"

Provide ONLY the English translation, with no explanations or additional text. Just the translation."""
            }]
        )

        english_text = message.content[0].text.strip()
        print(f"Translated '{taiwanese_text}' to '{english_text}'")
        return english_text

    except Exception as e:
        print(f"Translation error: {e}")
        raise

def convert_kip_to_tailo(kip_text):
    """
    Convert KIP romanization to Tai-lo
    This is a simplified conversion - KIP and Tai-lo are very similar
    """
    # KIP and Tai-lo are nearly identical, with minor differences
    # For this simple version, we'll return KIP as-is since they're very similar
    # A more complete conversion would handle specific differences
    return kip_text

def translate_mandarin_to_taiwanese_with_pinyin(mandarin_text):
    """
    Use Claude API to translate Mandarin to Taiwanese and get Pinyin in one call
    """
    if not anthropic_client:
        raise Exception("Claude API key not configured. Please set ANTHROPIC_API_KEY in .env file")

    try:
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Given this Mandarin Chinese text, provide both the Hanyu Pinyin and the Taiwanese Hokkien (台語) translation.

Input text: "{mandarin_text}"

Provide the output in exactly this format:
PINYIN: [Hanyu Pinyin with tone marks]
TAIWANESE: [traditional Chinese characters for Taiwanese]

Example:
PINYIN: nǐ hǎo
TAIWANESE: 你好"""
            }]
        )

        response_text = message.content[0].text.strip()
        print(f"Mandarin to Taiwanese response: {response_text}")

        # Parse the response
        lines = response_text.split('\n')
        pinyin = ""
        taiwanese_text = ""

        for line in lines:
            if line.startswith('PINYIN:'):
                pinyin = line.replace('PINYIN:', '').strip()
            elif line.startswith('TAIWANESE:'):
                taiwanese_text = line.replace('TAIWANESE:', '').strip()

        print(f"Got Pinyin '{pinyin}' and Taiwanese '{taiwanese_text}' for Mandarin '{mandarin_text}'")
        return pinyin, taiwanese_text

    except Exception as e:
        print(f"Translation error: {e}")
        raise

@app.route('/api/romanize', methods=['POST'])
def romanize():
    """
    Takes text and returns romanization/translation
    - If English: translates to Mandarin, then to Taiwanese, then romanizes
    - If Mandarin: translates to Taiwanese, then romanizes
    - If Taiwanese: translates to English, and romanizes the Taiwanese
    """
    try:
        print("Received romanize request")
        data = request.json
        print(f"Request data: {data}")
        text = data.get('text', '')
        source_language = data.get('sourceLanguage', 'taiwanese')

        if not text:
            print("No text provided")
            return jsonify({'error': 'No text provided'}), 400

        print(f"Processing text: {text}, source language: {source_language}")

        if source_language == 'english':
            # English to Taiwanese (with Mandarin): translate in ONE optimized call
            print("Translating English to Mandarin and Taiwanese...")
            mandarin_text, pinyin, taiwanese_text = translate_english_to_taiwanese_with_mandarin(text)
            print(f"Got Mandarin '{mandarin_text}' ({pinyin}) and Taiwanese '{taiwanese_text}'")

            # Use TauPhahJi to get romanization
            result = tàuphahjī(taiwanese_text)
            print(f"TauPhahJi result: {result}")

            # Extract the romanization (KIP format)
            kip_romanization = result.get('KIP', '')
            han_characters = result.get('漢字', '')

            # Convert KIP to Tai-lo
            tailo_romanization = convert_kip_to_tailo(kip_romanization)

            response_data = {
                'success': True,
                'translation': taiwanese_text,
                'mandarin': mandarin_text,
                'pinyin': pinyin,
                'romanization': tailo_romanization,
                'hanCharacters': han_characters,
                'kip': kip_romanization
            }
        elif source_language == 'mandarin':
            # Mandarin to Taiwanese: get Pinyin and translation in ONE optimized call
            print("Translating Mandarin to Taiwanese with Pinyin...")
            pinyin, taiwanese_text = translate_mandarin_to_taiwanese_with_pinyin(text)
            print(f"Got Pinyin '{pinyin}' and Taiwanese '{taiwanese_text}'")

            # Use TauPhahJi to get romanization
            result = tàuphahjī(taiwanese_text)
            print(f"TauPhahJi result: {result}")

            # Extract the romanization (KIP format)
            kip_romanization = result.get('KIP', '')
            han_characters = result.get('漢字', '')

            # Convert KIP to Tai-lo
            tailo_romanization = convert_kip_to_tailo(kip_romanization)

            response_data = {
                'success': True,
                'translation': taiwanese_text,
                'pinyin': pinyin,
                'romanization': tailo_romanization,
                'hanCharacters': han_characters,
                'kip': kip_romanization
            }
        else:
            # Taiwanese to English: translate and romanize
            print("Translating Taiwanese to English...")
            english_text = translate_taiwanese_to_english(text)
            print(f"Translation result: {english_text}")

            # Also romanize the Taiwanese text
            result = tàuphahjī(text)
            print(f"TauPhahJi result: {result}")

            # Extract the romanization (KIP format)
            kip_romanization = result.get('KIP', '')
            han_characters = result.get('漢字', '')

            # Convert KIP to Tai-lo
            tailo_romanization = convert_kip_to_tailo(kip_romanization)

            response_data = {
                'success': True,
                'translation': english_text,
                'romanization': tailo_romanization,
                'hanCharacters': han_characters,
                'kip': kip_romanization
            }

        print(f"Returning response: {response_data}")
        return jsonify(response_data)

    except Exception as e:
        print(f"Error in romanize: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    """
    Simple translation endpoint
    Note: TauPhahJi doesn't do English->Taiwanese translation
    This endpoint is for getting romanization of Taiwanese text
    """
    try:
        data = request.json
        text = data.get('text', '')
        source_language = data.get('sourceLanguage', 'taiwanese')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        if source_language == 'taiwanese':
            # If input is Taiwanese, get romanization
            result = tàuphahjī(text)

            kip_romanization = result.get('KIP', '')
            han_characters = result.get('漢字', '')
            tailo_romanization = convert_kip_to_tailo(kip_romanization)

            return jsonify({
                'success': True,
                'translation': text,
                'romanization': tailo_romanization,
                'hanCharacters': han_characters,
                'pronunciationGuide': ''  # Could add phonetic guide here
            })
        else:
            # For English input, we can't translate without another service
            return jsonify({
                'error': 'English to Taiwanese translation requires external API. Please input Taiwanese text directly.'
            }), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/audio', methods=['GET'])
def get_audio():
    """
    Proxy audio requests to Hapsing API to avoid CORS issues
    Uses caching to speed up repeated requests
    """
    try:
        taibun = request.args.get('taibun', '')

        if not taibun:
            return jsonify({'error': 'No taibun parameter provided'}), 400

        # Check cache first
        if taibun in audio_cache:
            print(f"Returning cached audio for: {taibun}")
            from flask import Response
            return Response(audio_cache[taibun], mimetype='audio/mpeg')

        print(f"Fetching audio for: {taibun}")

        # Fetch audio from Hapsing API
        import urllib.request
        audio_url = f"https://hapsing.ithuan.tw/bangtsam?taibun={urllib.parse.quote(taibun)}"
        print(f"Audio URL: {audio_url}")

        response = urllib.request.urlopen(audio_url, timeout=20)
        audio_data = response.read()

        print(f"Audio data size: {len(audio_data)} bytes")

        # Cache the audio data
        audio_cache[taibun] = audio_data
        print(f"Cached audio. Cache size: {len(audio_cache)} entries")

        # Return audio data with proper content type
        from flask import Response
        return Response(audio_data, mimetype='audio/mpeg')

    except Exception as e:
        print(f"Error fetching audio: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Flask backend is running'})

# Serve React app in production
if IS_PRODUCTION:
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    print("Starting Flask server on http://127.0.0.1:5001")

    # Pre-cache common phrases for instant audio playback
    pre_cache_audio()

    app.run(debug=True, host='127.0.0.1', port=5001)

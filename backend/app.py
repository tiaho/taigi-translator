from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from flask_cors import CORS
from tauphahji_cmd import tàuphahjī
from anthropic import Anthropic
from dotenv import load_dotenv
from pypinyin import pinyin, Style
import os
import json

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

# Character variant mapping (Mandarin → Taiwanese variants)
CHAR_VARIANTS = {
    '腳': '跤',  # foot/leg
    '脚': '跤',  # simplified variant
}

def normalize_taiwanese_text(text):
    """Normalize Mandarin characters to Taiwanese variants for dictionary lookup"""
    result = text
    for mandarin_char, taiwanese_char in CHAR_VARIANTS.items():
        result = result.replace(mandarin_char, taiwanese_char)
    return result

# Load MOE Taiwanese Dictionary on startup
moe_dict = {}
moe_data = []  # Keep full data for definition searches
try:
    dict_path = os.path.join(os.path.dirname(__file__), 'moedict-twblg.json')
    if os.path.exists(dict_path):
        with open(dict_path, 'r', encoding='utf-8') as f:
            moe_data = json.load(f)

            # Create lookup dictionary by title and synonyms
            title_count = 0
            synonym_count = 0

            for entry in moe_data:
                title = entry.get('title', '')
                if title and 'heteronyms' in entry and len(entry['heteronyms']) > 0:
                    # Get first pronunciation
                    heteronym = entry['heteronyms'][0]
                    tailo = heteronym.get('trs', '')

                    if tailo:
                        # Index by title
                        moe_dict[title] = tailo
                        title_count += 1

                        # Also index by synonyms
                        synonyms = heteronym.get('synonyms', '')
                        if synonyms:
                            for synonym in synonyms.split(','):
                                synonym = synonym.strip()
                                if synonym and synonym not in moe_dict:
                                    moe_dict[synonym] = tailo
                                    synonym_count += 1

        print(f"✅ Loaded MOE Taiwanese Dictionary: {title_count} titles + {synonym_count} synonyms = {len(moe_dict)} total entries")
    else:
        print("⚠️  MOE dictionary file not found, using Tau-Phah-Ji only")
except Exception as e:
    print(f"⚠️  Error loading MOE dictionary: {e}, using Tau-Phah-Ji only")
    moe_dict = {}
    moe_data = []

def search_in_definitions(search_text):
    """Search for a word in MOE dictionary definitions and return the entry's romanization"""
    for entry in moe_data:
        if 'heteronyms' in entry and len(entry['heteronyms']) > 0:
            heteronym = entry['heteronyms'][0]
            tailo = heteronym.get('trs', '')
            definitions = heteronym.get('definitions', [])

            # Search in definition text
            for defn in definitions:
                def_text = defn.get('def', '')
                # Check if search_text appears at the start of definition (common pattern: "很。...")
                if def_text.startswith(search_text + '。') or def_text.startswith(search_text + ',') or def_text == search_text:
                    title = entry.get('title', '')
                    print(f"✅ Found in definitions: {search_text} defined as {title} → {tailo}")
                    return tailo, title

    return None, None

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
    Use Claude API to translate English to Taiwan Mandarin with Taiwan-specific vocabulary,
    and generate Taiwan-style Pinyin, then treat Mandarin characters as Taiwanese
    """
    if not anthropic_client:
        raise Exception("Claude API key not configured. Please set ANTHROPIC_API_KEY in .env file")

    try:
        # Step 1: English → Taiwan Mandarin + Pinyin (using Claude with Taiwan-specific instructions)
        message = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Translate to Taiwan Mandarin (台灣華語/國語), using vocabulary commonly used in Taiwan, NOT Mainland China.

Examples of Taiwan vocabulary preferences:
- bicycle: 腳踏車 (NOT 自行車)
- bus: 公車 (NOT 公共汽車)
- taxi: 計程車 (NOT 出租車)
- metro/subway: 捷運 (NOT 地鐵)
- parking lot: 停車場 (NOT 停车场)
- software: 軟體 (NOT 软件)
- computer: 電腦 (NOT 计算机)

Input: "{english_text}"

Provide the output in exactly this format:
MANDARIN: [Taiwan Mandarin in traditional characters]
PINYIN: [Hanyu Pinyin with tone marks]

Example:
MANDARIN: 腳踏車
PINYIN: jiǎo tà chē"""
            }]
        )

        response_text = message.content[0].text.strip()
        print(f"Claude response: {response_text}")

        # Parse the response
        lines = response_text.split('\n')
        mandarin_text = ""
        pinyin_text = ""

        for line in lines:
            if line.startswith('MANDARIN:'):
                mandarin_text = line.replace('MANDARIN:', '').strip()
            elif line.startswith('PINYIN:'):
                pinyin_text = line.replace('PINYIN:', '').strip()

        # Fallback to pypinyin if Claude didn't provide Pinyin
        if not pinyin_text and mandarin_text:
            pinyin_list = pinyin(mandarin_text, style=Style.TONE)
            pinyin_text = ' '.join([p[0] for p in pinyin_list])

        print(f"Claude (Taiwan Mandarin): '{english_text}' → '{mandarin_text}' ({pinyin_text})")

        # Step 2: Use the same Mandarin characters as "Taiwanese"
        # (since they share many common characters)
        taiwanese_text = mandarin_text

        return mandarin_text, pinyin_text, taiwanese_text

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
            model="claude-3-5-haiku-20241022",
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
            model="claude-3-5-haiku-20241022",
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

def get_taiwanese_romanization(taiwanese_text):
    """
    Get Taiwanese Tâi-lô romanization using MOE dictionary first, then Tau-Phah-Ji as fallback
    """
    # Try MOE dictionary first (exact match)
    if taiwanese_text in moe_dict:
        print(f"✅ Found in MOE dict: {taiwanese_text} → {moe_dict[taiwanese_text]}")
        return moe_dict[taiwanese_text], taiwanese_text

    # Try with character normalization (e.g., 腳 → 跤)
    normalized_text = normalize_taiwanese_text(taiwanese_text)
    if normalized_text != taiwanese_text and normalized_text in moe_dict:
        print(f"✅ Found in MOE dict (normalized): {taiwanese_text} → {normalized_text} → {moe_dict[normalized_text]}")
        return moe_dict[normalized_text], normalized_text

    # Search in definitions (e.g., find 很 defined as 真/誠/足)
    tailo, title = search_in_definitions(taiwanese_text)
    if tailo and title:
        return tailo, title

    # Fallback to Tau-Phah-Ji for full phrase (handles word segmentation and tone sandhi)
    # Use normalized text so TauPhahJi gets Taiwanese variants (跤 not 腳)
    print(f"ℹ️  Not in MOE dict, using Tau-Phah-Ji: {taiwanese_text} (normalized: {normalized_text})")
    try:
        result = tàuphahjī(normalized_text)
        kip_romanization = result.get('KIP', '')
        han_characters = result.get('漢字', normalized_text)
        return kip_romanization, han_characters
    except Exception as e:
        print(f"⚠️  Tau-Phah-Ji failed: {e}")
        return '', normalized_text

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
    Generate Pinyin for Mandarin and use same characters as Taiwanese
    (no Claude API needed)
    """
    try:
        # Generate Pinyin for the Mandarin text
        pinyin_list = pinyin(mandarin_text, style=Style.TONE)
        pinyin_text = ' '.join([p[0] for p in pinyin_list])
        print(f"Pinyin: {pinyin_text}")

        # Use the same Mandarin characters as "Taiwanese"
        taiwanese_text = mandarin_text

        print(f"Got Pinyin '{pinyin_text}' for Mandarin '{mandarin_text}'")
        return pinyin_text, taiwanese_text

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

            # Use MOE dictionary + TauPhahJi to get romanization
            tailo_romanization, han_characters = get_taiwanese_romanization(taiwanese_text)
            print(f"Romanization result: {tailo_romanization}, Han: {han_characters}")

            # For backwards compatibility
            kip_romanization = tailo_romanization

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

            # Use MOE dictionary + TauPhahJi to get romanization
            tailo_romanization, han_characters = get_taiwanese_romanization(taiwanese_text)
            print(f"Romanization result: {tailo_romanization}, Han: {han_characters}")

            # For backwards compatibility
            kip_romanization = tailo_romanization

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

            # Romanize the Taiwanese text using MOE dictionary + Tau-Phah-Ji
            tailo_romanization, han_characters = get_taiwanese_romanization(text)
            print(f"Romanization result: {tailo_romanization}, Han: {han_characters}")

            # For backwards compatibility
            kip_romanization = tailo_romanization

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

@app.route('/api/romanize/stream', methods=['POST'])
def romanize_stream():
    """
    Streaming version of romanize endpoint using Server-Sent Events
    """
    def generate():
        try:
            data = request.json
            text = data.get('text', '')
            source_language = data.get('sourceLanguage', 'taiwanese')

            if not text:
                yield f"data: {json.dumps({'error': 'No text provided'})}\n\n"
                return

            # Send initial status
            yield f"data: {json.dumps({'status': 'translating', 'stage': 'started'})}\n\n"

            if source_language == 'english':
                # English to Taiwanese (using Claude for Taiwan Mandarin + Pinyin + Tau-Phah-Ji)
                yield f"data: {json.dumps({'status': 'translating', 'stage': 'mandarin'})}\n\n"

                # Use Claude with Taiwan-specific vocabulary to get both Mandarin and Pinyin
                with anthropic_client.messages.stream(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=500,
                    messages=[{
                        "role": "user",
                        "content": f"""You must provide translations in BOTH Taiwan Mandarin (國語) AND Taiwanese (台語).

Input English text: "{text}"

CRITICAL: You MUST output EXACTLY THREE lines in this format (no explanations, no notes):

MANDARIN: [Taiwan Mandarin translation - use 腳踏車 for bicycle, 很 for very, 吃 for eat]
TAIWANESE: [Taiwanese translation - use 跤踏車 for bicycle, 真/誠/足 for very, 食 for eat]
PINYIN: [Hanyu Pinyin for the MANDARIN translation]

Key vocabulary differences:
Taiwan Mandarin vs Taiwanese:
- bicycle: 腳踏車 vs 跤踏車
- very/really: 很/真的 vs 真/誠/足
- eat: 吃 vs 食
- fun/play: 好玩 vs 好耍/好sńg
- possessive/descriptive particle: 的 vs 的 (both use 的, never 搝 or other variants)

Example for "riding bikes is fun":
MANDARIN: 騎腳踏車很好玩
TAIWANESE: 騎跤踏車真好耍
PINYIN: qí jiǎo tà chē hěn hǎo wán

Example for "riding bikes is a great workout":
MANDARIN: 騎腳踏車是很棒的運動
TAIWANESE: 騎跤踏車是真好的運動
PINYIN: qí jiǎo tà chē shì hěn bàng de yùn dòng

Note: Taiwanese word order is 是 + 真/誠/足 + adjective (e.g., 是真好 not 真是好)

Now translate: "{text}"
Output ONLY the three lines (MANDARIN, TAIWANESE, PINYIN)."""
                    }]
                ) as stream:
                    response_text = ""
                    for text_chunk in stream.text_stream:
                        response_text += text_chunk
                        yield f"data: {json.dumps({'status': 'streaming', 'partial': response_text})}\n\n"

                response_text = response_text.strip()

                # Parse the response
                lines = response_text.split('\n')
                mandarin_text = ""
                taiwanese_text = ""
                pinyin_text = ""

                for line in lines:
                    if line.startswith('MANDARIN:'):
                        mandarin_text = line.replace('MANDARIN:', '').strip()
                    elif line.startswith('TAIWANESE:'):
                        taiwanese_text = line.replace('TAIWANESE:', '').strip()
                    elif line.startswith('PINYIN:'):
                        pinyin_text = line.replace('PINYIN:', '').strip()

                # Debug logging
                print(f"📝 Claude response: {response_text[:200]}")
                print(f"📝 Parsed Mandarin: {mandarin_text}")
                print(f"📝 Parsed Taiwanese: {taiwanese_text}")

                # Fallback to pypinyin if Claude didn't provide Pinyin
                if not pinyin_text and mandarin_text:
                    pinyin_list = pinyin(mandarin_text, style=Style.TONE)
                    pinyin_text = ' '.join([p[0] for p in pinyin_list])

                # Get romanization from MOE dictionary + Tau-Phah-Ji
                tailo_romanization, han_characters = get_taiwanese_romanization(taiwanese_text)
                kip_romanization = tailo_romanization

                # Send final result
                final_data = {
                    'status': 'complete',
                    'success': True,
                    'translation': taiwanese_text,
                    'mandarin': mandarin_text,  # Taiwan Mandarin (國語)
                    'pinyin': pinyin_text,
                    'romanization': tailo_romanization,
                    'hanCharacters': han_characters,
                    'kip': kip_romanization
                }
                yield f"data: {json.dumps(final_data)}\n\n"

            elif source_language == 'mandarin':
                # Mandarin to Taiwanese (using pypinyin + Tau-Phah-Ji)
                yield f"data: {json.dumps({'status': 'translating', 'stage': 'taiwanese'})}\n\n"

                # Generate Pinyin
                pinyin_list = pinyin(text, style=Style.TONE)
                pinyin_text = ' '.join([p[0] for p in pinyin_list])

                # Use same characters as Taiwanese
                taiwanese_text = text

                partial_text = f'PINYIN: {pinyin_text}\nTAIWANESE: {taiwanese_text}'
                yield f"data: {json.dumps({'status': 'streaming', 'partial': partial_text})}\n\n"

                # Get romanization from MOE dictionary + Tau-Phah-Ji
                tailo_romanization, han_characters = get_taiwanese_romanization(taiwanese_text)
                kip_romanization = tailo_romanization

                final_data = {
                    'status': 'complete',
                    'success': True,
                    'translation': taiwanese_text,
                    'pinyin': pinyin_text,
                    'romanization': tailo_romanization,
                    'hanCharacters': han_characters,
                    'kip': kip_romanization
                }
                yield f"data: {json.dumps(final_data)}\n\n"

            else:
                # Taiwanese to English with streaming
                yield f"data: {json.dumps({'status': 'translating', 'stage': 'english'})}\n\n"

                english_text = ""

                with anthropic_client.messages.stream(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1000,
                    messages=[{
                        "role": "user",
                        "content": f"""Translate the following Taiwanese Hokkien (台語) text to English.

The input is in traditional Chinese characters (漢字). Provide a natural English translation.

Input text: "{text}"

Provide ONLY the English translation, with no explanations or additional text. Just the translation."""
                    }]
                ) as stream:
                    for text_chunk in stream.text_stream:
                        english_text += text_chunk
                        yield f"data: {json.dumps({'status': 'streaming', 'partial': english_text})}\n\n"

                # Get romanization
                result = tàuphahjī(text)
                kip_romanization = result.get('KIP', '')
                han_characters = result.get('漢字', '')
                tailo_romanization = convert_kip_to_tailo(kip_romanization)

                final_data = {
                    'status': 'complete',
                    'success': True,
                    'translation': english_text.strip(),
                    'romanization': tailo_romanization,
                    'hanCharacters': han_characters,
                    'kip': kip_romanization
                }
                yield f"data: {json.dumps(final_data)}\n\n"

        except Exception as e:
            print(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e), 'status': 'error'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

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

@app.route('/api/generate-vocab', methods=['POST'])
def generate_vocab():
    """
    Generate a vocabulary list for a given topic using Claude API
    """
    try:
        data = request.json
        topic = data.get('topic', '')

        if not topic:
            return jsonify({'error': 'No topic provided'}), 400

        if not anthropic_client:
            return jsonify({'error': 'Claude API not configured'}), 500

        print(f"Generating vocabulary for topic: {topic}")

        message = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Generate a vocabulary list for the topic "{topic}" with 8-12 relevant words.

For each word, provide:
- English word
- Mandarin Chinese (traditional characters)
- Taiwanese Hokkien (traditional characters)
- Tâi-lô romanization

Format each word exactly like this:
WORD:
EN: [English]
ZH: [Mandarin traditional characters]
TW: [Taiwanese traditional characters]
TAILO: [Tâi-lô romanization]

Example:
WORD:
EN: Rain
ZH: 雨
TW: 雨
TAILO: Hōo

Generate 8-12 words related to "{topic}". Start now:"""
            }]
        )

        response_text = message.content[0].text.strip()
        print(f"Claude response: {response_text}")

        # Parse the response
        words = []
        current_word = {}

        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('EN:'):
                current_word['en'] = line.replace('EN:', '').strip()
            elif line.startswith('ZH:'):
                current_word['mandarin'] = line.replace('ZH:', '').strip()
            elif line.startswith('TW:'):
                current_word['han'] = line.replace('TW:', '').strip()
            elif line.startswith('TAILO:'):
                current_word['tailo'] = line.replace('TAILO:', '').strip()
                # Word is complete, add it to the list
                if all(key in current_word for key in ['en', 'mandarin', 'han', 'tailo']):
                    words.append(current_word.copy())
                    current_word = {}

        print(f"Generated {len(words)} words for topic: {topic}")

        return jsonify({
            'success': True,
            'topic': topic,
            'words': words
        })

    except Exception as e:
        print(f"Error generating vocabulary: {str(e)}")
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

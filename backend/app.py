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
    '嗎': '無',  # question particle (Mandarin ma → Taiwanese bô)
}

# Phrase variant mapping (Mandarin phrases → Taiwanese phrases)
# These are common Mandarin words that should be replaced with Taiwanese equivalents
PHRASE_VARIANTS = {
    '可以': '會使',  # can/may (Mandarin kěyǐ → Taiwanese ē-sái)
    '看看': '看覓',  # take a look (Mandarin kàn kàn → Taiwanese khuànn-māi)
    '如果': '若是',  # if (Mandarin rúguǒ → Taiwanese nā-sī)
}

def convert_numbers_to_chinese(text):
    """Convert Arabic numerals to Traditional Chinese characters"""
    import re

    # Mapping for digits
    digit_map = {
        '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
        '5': '五', '6': '六', '7': '七', '8': '八', '9': '九'
    }

    def num_to_chinese(num_str):
        """Convert a number string to Traditional Chinese"""
        num = int(num_str)

        if num == 0:
            return '零'

        # Handle numbers 1-99
        if num < 10:
            return digit_map[str(num)]
        elif num < 20:
            return '十' + (digit_map[str(num % 10)] if num % 10 != 0 else '')
        elif num < 100:
            tens = num // 10
            ones = num % 10
            return digit_map[str(tens)] + '十' + (digit_map[str(ones)] if ones != 0 else '')
        elif num < 1000:
            hundreds = num // 100
            remainder = num % 100
            result = digit_map[str(hundreds)] + '百'
            if remainder > 0:
                if remainder < 10:
                    result += '零' + digit_map[str(remainder)]
                else:
                    result += num_to_chinese(str(remainder))
            return result
        else:
            # For larger numbers, just convert digit by digit
            return ''.join(digit_map.get(d, d) for d in num_str)

    # Find all numbers in the text and replace them
    def replace_num(match):
        return num_to_chinese(match.group(0))

    return re.sub(r'\d+', replace_num, text)

def normalize_taiwanese_text(text):
    """Normalize Mandarin characters and phrases to Taiwanese variants for dictionary lookup"""
    result = text

    # Convert Arabic numerals to Chinese characters first
    result = convert_numbers_to_chinese(result)

    # Then replace multi-character phrases
    for mandarin_phrase, taiwanese_phrase in PHRASE_VARIANTS.items():
        result = result.replace(mandarin_phrase, taiwanese_phrase)
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

        # Add manual entries for common words not in dictionary
        manual_entries = {
            '最近': 'tsuè-kīn',  # lately, recently (appears in examples but not as title)
            '公車': 'kong-tshia',  # bus (appears in examples but not as title)
            '看': 'khuànn',  # to see/look (override first heteronym which is khàn = supervise)
        }
        for word, romanization in manual_entries.items():
            moe_dict[word] = romanization  # Always override with manual entry

        if manual_entries:
            print(f"📝 Added {len(manual_entries)} manual dictionary entries")

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
                # Check if search_text appears at the start of definition (common patterns: "很。...", "生病、得病。")
                if (def_text.startswith(search_text + '。') or
                    def_text.startswith(search_text + ',') or
                    def_text.startswith(search_text + '、') or  # Chinese enumeration comma
                    def_text == search_text):
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

def disambiguate_heteronyms_with_context(sentence, word, heteronyms):
    """
    Use Claude API to choose the correct heteronym pronunciation based on sentence context

    Args:
        sentence: The full Taiwanese sentence
        word: The ambiguous word
        heteronyms: List of heteronym objects with 'trs' and 'definitions' fields

    Returns:
        Chosen romanization string, or None if disambiguation fails
    """
    if not anthropic_client or len(heteronyms) <= 1:
        return None

    try:
        # Build prompt with all heteronym options
        prompt = f"""Given the Taiwanese sentence: "{sentence}"

The word "{word}" has multiple possible pronunciations. Choose the correct one based on context.

Options:
"""
        for i, het in enumerate(heteronyms, 1):
            trs = het.get('trs', '')
            definitions = het.get('definitions', [])
            def_text = definitions[0].get('def', '') if definitions else ''
            prompt += f"{i}. {trs} - {def_text}\n"

        prompt += "\nRespond with ONLY the number (1, 2, etc.) of the correct pronunciation:"

        # Call Claude with minimal tokens
        response = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse response - should be just a number
        choice_text = response.content[0].text.strip()
        choice_num = int(choice_text) - 1

        if 0 <= choice_num < len(heteronyms):
            chosen_trs = heteronyms[choice_num].get('trs', '')
            print(f"  🤖 Claude disambiguated '{word}': chose option {choice_num + 1} → {chosen_trs}")
            return chosen_trs.split('/')[0]  # Take first option

    except Exception as e:
        print(f"  ⚠️  Heteronym disambiguation failed for '{word}': {e}")

    return None

def get_taiwanese_romanization(taiwanese_text, sentence_context=None):
    """
    Get Taiwanese Tâi-lô romanization using MOE dictionary first, then Tau-Phah-Ji as fallback
    Takes only the first option when multiple romanizations are available (e.g., "guā-tsē/guā-tsuē" → "guā-tsē")
    """
    # Try MOE dictionary first (exact match)
    if taiwanese_text in moe_dict:
        # Check if word has multiple heteronyms in full MOE data
        heteronyms = None
        for entry in moe_data:
            if entry.get('title') == taiwanese_text:
                heteronyms = entry.get('heteronyms', [])
                break

        # If multiple heteronyms and we have sentence context, disambiguate with Claude
        if heteronyms and len(heteronyms) > 1 and sentence_context:
            disambiguated_tailo = disambiguate_heteronyms_with_context(
                sentence_context, taiwanese_text, heteronyms
            )
            if disambiguated_tailo:
                return disambiguated_tailo, taiwanese_text

        # Default: use first option from moe_dict
        tailo = moe_dict[taiwanese_text].split('/')[0]  # Take first option only
        print(f"✅ Found in MOE dict: {taiwanese_text} → {tailo}")
        return tailo, taiwanese_text

    # Try with character normalization (e.g., 腳 → 跤)
    normalized_text = normalize_taiwanese_text(taiwanese_text)
    if normalized_text != taiwanese_text and normalized_text in moe_dict:
        tailo = moe_dict[normalized_text].split('/')[0]  # Take first option only
        print(f"✅ Found in MOE dict (normalized): {taiwanese_text} → {normalized_text} → {tailo}")
        return tailo, normalized_text

    # Search in definitions (e.g., find 很 defined as 真/誠/足)
    tailo, title = search_in_definitions(taiwanese_text)
    if tailo and title:
        tailo = tailo.split('/')[0]  # Take first option only
        return tailo, title

    # Fallback to Tau-Phah-Ji for full phrase (handles word segmentation and tone sandhi)
    # Use normalized text so TauPhahJi gets Taiwanese variants (跤 not 腳)
    print(f"ℹ️  Not in MOE dict, using Tau-Phah-Ji: {taiwanese_text} (normalized: {normalized_text})")
    try:
        result = tàuphahjī(normalized_text)
        kip_romanization = result.get('KIP', '').split('/')[0]  # Take first option only
        han_characters = result.get('漢字', normalized_text)
        return kip_romanization, han_characters
    except Exception as e:
        print(f"⚠️  Tau-Phah-Ji failed: {e}")
        return '', normalized_text

def romanize_sentence_with_word_lookup(sentence):
    """
    Romanize a sentence by trying to look up individual words in MOE dict first,
    then falling back to TauPhahJi for the whole sentence.
    Preserves punctuation from the original sentence.

    Strategy:
    1. Parse sentence into text segments and punctuation
    2. Try whole sentence in MOE dict (without punctuation)
    3. Use greedy longest-match segmentation with MOE dict
    4. Look up each word in MOE dict (exact → normalized → definition search)
    5. Fall back to TauPhahJi for words not in MOE dict
    6. Combine romanizations with original punctuation preserved
    """
    import string
    import re

    chinese_punctuation = '，。！？；：、''""（）【】《》'
    punctuation_chars = string.punctuation + chinese_punctuation

    # Parse sentence into segments of text and punctuation
    # Use regex to split while keeping delimiters
    pattern = f'([{re.escape(punctuation_chars)}]+)'
    segments = re.split(pattern, sentence)

    # Filter out empty segments
    segments = [s for s in segments if s]

    if not segments:
        return ''

    # Extract just the text (no punctuation) for processing
    text_segments = [s for s in segments if not all(c in punctuation_chars for c in s)]
    clean_sentence = ''.join(text_segments).strip()

    if not clean_sentence:
        return ''

    # First try the whole sentence (cleaned)
    tailo, han = get_taiwanese_romanization(clean_sentence, sentence_context=clean_sentence)
    if tailo and han and han in moe_dict:  # Found exact match in MOE dict
        # Add back punctuation
        result_segments = []
        for seg in segments:
            if all(c in punctuation_chars for c in seg):
                result_segments.append(seg)
            else:
                result_segments.append(tailo)
                break
        return ''.join(result_segments)

    # Romanize each text segment separately and interleave with punctuation
    print(f"  🔍 Romanizing segments with punctuation preservation")
    try:
        result = []
        for seg in segments:
            if all(c in punctuation_chars for c in seg):
                # Punctuation - keep as-is
                result.append(seg)
            else:
                # Text segment - romanize it
                print(f"  📝 Processing text segment: {seg}")

                # Use greedy longest-match segmentation for this segment
                words = []
                i = 0
                while i < len(seg):
                    # Try longest match first (up to 5 characters)
                    found = False
                    for length in range(min(5, len(seg) - i), 0, -1):
                        substr = seg[i:i+length]
                        normalized_substr = normalize_taiwanese_text(substr)
                        # Check if substring is in MOE dict or can be found via definition search
                        if substr in moe_dict or normalized_substr in moe_dict:
                            words.append(substr)
                            i += length
                            found = True
                            break
                        # Also check definition search
                        def_tailo, def_title = search_in_definitions(substr)
                        if def_tailo:
                            words.append(substr)
                            i += length
                            found = True
                            break
                    if not found:
                        # Single character not in dict
                        words.append(seg[i])
                        i += 1

                # Romanize each word
                romanizations = []
                for word in words:
                    word_tailo, word_han = get_taiwanese_romanization(word, sentence_context=seg)
                    if word_tailo and word_han and (word_han in moe_dict or word in moe_dict):
                        # Found in MOE dict
                        romanizations.append(word_tailo)
                        print(f"    ✅ {word} → {word_tailo} (MOE dict)")
                    else:
                        # Not in MOE dict, use TauPhahJi for this word
                        try:
                            word_result = tàuphahjī(word)
                            word_kip = word_result.get('KIP', word)
                            romanizations.append(word_kip)
                            print(f"    ⚠️  {word} → {word_kip} (TauPhahJi)")
                        except:
                            romanizations.append(word)
                            print(f"    ⚠️  {word} → (fallback)")

                # Join romanizations with spaces
                segment_tailo = ' '.join(romanizations)
                result.append(segment_tailo)
                print(f"  ✅ Segment romanization: {segment_tailo}")

        final_result = ''.join(result)
        print(f"  ✅ Final with punctuation: {final_result}")
        return final_result

    except Exception as e:
        print(f"  ⚠️  Romanization failed: {e}")
        # Fallback to romanizing the whole sentence without punctuation
        tailo, _ = get_taiwanese_romanization(clean_sentence)
        return tailo

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

@app.route('/api/generate-module', methods=['POST'])
def generate_module():
    """
    Generate a complete learning module for a given theme using Claude API
    Then romanize using MOE Dictionary pipeline (same as rest of app)
    """
    try:
        data = request.json
        theme = data.get('theme', '')

        if not theme:
            return jsonify({'error': 'No theme provided'}), 400

        if not anthropic_client:
            return jsonify({'error': 'Claude API not configured'}), 500

        print(f"Generating learning module for theme: {theme}")

        message = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": f"""Generate a Taiwanese language learning module for the theme "{theme}".

Create a comprehensive lesson with the following sections:

1. TITLE: A short descriptive title (in English)
2. DESCRIPTION: One sentence describing what learners will practice
3. CULTURAL_NOTE: 2-3 sentences about cultural context (why this is important in Taiwanese culture)
4. VOCABULARY: 10-12 essential words for this theme
5. DIALOGUE: A 10-line natural conversation using this vocabulary

IMPORTANT VOCABULARY GUIDELINES:
- Use PRECISE, STANDARD vocabulary (not colloquial alternatives)
- Use Taiwan Mandarin vocabulary (腳踏車 not 自行車, 醫生 not 大夫)
- Taiwan Mandarin uses STANDARD MANDARIN GRAMMAR - do NOT use Taiwanese-only words like 看覓, 真好, 誠好, 足
- Choose the most accurate word for the meaning:
  * For "sick": use 生病 (not 不舒服 which means "uncomfortable")
  * For "painful": use 痛 (not 疼)
  * For "see/look": use 看 (not 看覓 which is Taiwanese)
  * For medical/formal contexts: use standard medical terms
- Avoid overly casual or vague alternatives

Format EXACTLY as follows (NOTE: Only generate English and Taiwan Mandarin):

TITLE: [Short title]

DESCRIPTION: [One sentence]

CULTURAL_NOTE: [2-3 sentences about cultural context]

VOCABULARY:
WORD:
EN: [English word - be precise]
ZH: [Precise Taiwan Mandarin translation with traditional characters]
[Repeat for 10-12 words]

DIALOGUE:
LINE:
EN: [English sentence]
ZH: [Taiwan Mandarin translation - use precise vocabulary]
[Repeat for exactly 10 lines - make it a natural conversation]

Example for "At the Restaurant":
TITLE: At the Restaurant

DESCRIPTION: Learn how to order food and interact at restaurants

CULTURAL_NOTE: In Taiwan, it's common to share dishes family-style rather than ordering individual meals. Tea is usually free and constantly refilled. Saying "食飽未?" (Have you eaten?) is a common greeting showing care.

VOCABULARY:
WORD:
EN: Menu
ZH: 菜單

WORD:
EN: Delicious
ZH: 好吃

DIALOGUE:
LINE:
EN: Excuse me, can I see the menu?
ZH: 不好意思，可以看菜單嗎？

LINE:
EN: I want beef noodles.
ZH: 我要牛肉麵。

Now generate a complete module for "{theme}". Make the dialogue realistic and natural:"""
            }]
        )

        response_text = message.content[0].text.strip()
        print(f"Claude module response received, parsing...")

        # Parse the response
        module = {
            'theme': theme,
            'title': '',
            'description': '',
            'culturalNote': '',
            'vocabulary': [],
            'dialogue': []
        }

        lines = response_text.split('\n')
        current_section = None
        current_word = {}
        current_line = {}

        for line in lines:
            line_stripped = line.strip()

            if line_stripped.startswith('TITLE:'):
                module['title'] = line_stripped.replace('TITLE:', '').strip()
            elif line_stripped.startswith('DESCRIPTION:'):
                module['description'] = line_stripped.replace('DESCRIPTION:', '').strip()
            elif line_stripped.startswith('CULTURAL_NOTE:'):
                module['culturalNote'] = line_stripped.replace('CULTURAL_NOTE:', '').strip()
            elif line_stripped == 'VOCABULARY:':
                current_section = 'vocabulary'
            elif line_stripped == 'DIALOGUE:':
                current_section = 'dialogue'
            elif line_stripped == 'WORD:':
                current_word = {}
            elif line_stripped == 'LINE:':
                current_line = {}
            elif line_stripped.startswith('EN:'):
                value = line_stripped.replace('EN:', '').strip()
                if current_section == 'vocabulary':
                    current_word['en'] = value
                elif current_section == 'dialogue':
                    current_line['en'] = value
            elif line_stripped.startswith('ZH:'):
                value = line_stripped.replace('ZH:', '').strip()
                if current_section == 'vocabulary':
                    current_word['mandarin'] = value
                    # Word is complete (Claude only generates EN and ZH)
                    if all(key in current_word for key in ['en', 'mandarin']):
                        module['vocabulary'].append(current_word.copy())
                        current_word = {}
                elif current_section == 'dialogue':
                    current_line['mandarin'] = value
                    # Line is complete (Claude only generates EN and ZH)
                    if all(key in current_line for key in ['en', 'mandarin']):
                        module['dialogue'].append(current_line.copy())
                        current_line = {}

        # Ensure we have the minimum content
        if not module['title'] or len(module['dialogue']) < 5:
            return jsonify({'error': 'Failed to generate complete module'}), 500

        print(f"✅ Generated module: {module['title']} with {len(module['vocabulary'])} words and {len(module['dialogue'])} dialogue lines")

        # Process vocabulary: use Mandarin characters as Taiwanese, then romanize with word lookup
        # (Same logic as translate_english_to_taiwanese_with_mandarin line 209)
        vocab_total = len(module['vocabulary'])
        print(f"📚 Processing vocabulary: using Mandarin characters as Taiwanese, then romanizing with word lookup...")
        for idx, word in enumerate(module['vocabulary'], 1):
            mandarin_text = word['mandarin']

            # Use same Mandarin characters as "Taiwanese", with normalization (嗎 → 無, 腳 → 跤, etc.)
            taiwanese_text = normalize_taiwanese_text(mandarin_text)
            word['han'] = taiwanese_text

            print(f"  [{idx}/{vocab_total}] {word['en']}: {mandarin_text} → {taiwanese_text}")

            # Romanize using intelligent word lookup (tries whole word, segments if needed, looks up in MOE dict)
            tailo = romanize_sentence_with_word_lookup(taiwanese_text)
            word['tailo'] = tailo
            print(f"    Romanization: {tailo}")

        # Process dialogue: use Mandarin characters as Taiwanese, then romanize with intelligent word lookup
        # (Same logic as translate_english_to_taiwanese_with_mandarin line 209)
        dialogue_total = len(module['dialogue'])
        print(f"💬 Processing dialogue: using Mandarin characters as Taiwanese, then romanizing with word lookup...")
        for idx, line in enumerate(module['dialogue'], 1):
            mandarin_text = line['mandarin']

            # Use same Mandarin characters as "Taiwanese", with normalization (嗎 → 無, 腳 → 跤, etc.)
            taiwanese_text = normalize_taiwanese_text(mandarin_text)
            line['taiwanese'] = taiwanese_text

            print(f"  [{idx}/{dialogue_total}] {mandarin_text} → {taiwanese_text}")

            # Romanize using intelligent word lookup (tries whole sentence, then common splits, then TauPhahJi)
            tailo = romanize_sentence_with_word_lookup(taiwanese_text)
            line['tailo'] = tailo
            print(f"    Romanization: {tailo}")

        return jsonify({
            'success': True,
            'module': module
        })

    except Exception as e:
        print(f"Error generating module: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-module-stream', methods=['POST'])
def generate_module_stream():
    """
    Generate a learning module with real-time progress updates via Server-Sent Events
    """
    def generate():
        try:
            data = request.json
            theme = data.get('theme', '')

            if not theme:
                yield f"data: {json.dumps({'error': 'No theme provided'})}\n\n"
                return

            if not anthropic_client:
                yield f"data: {json.dumps({'error': 'Claude API not configured'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'status', 'message': 'Generating module content...'})}\n\n"

            # Generate module with Claude (same prompt as generate_module)
            message = anthropic_client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=4000,
                messages=[{
                    "role": "user",
                    "content": f"""Generate a Taiwanese language learning module for the theme "{theme}".

Create a comprehensive lesson with the following sections:

1. TITLE: A short descriptive title (in English)
2. DESCRIPTION: A brief 1-2 sentence description
3. CULTURAL_NOTE: 2-3 sentences about cultural context
4. VOCABULARY: 10-12 essential words for this theme
5. DIALOGUE: A 10-line natural conversation using this vocabulary

IMPORTANT VOCABULARY GUIDELINES:
- Use PRECISE, STANDARD vocabulary (not colloquial alternatives)
- Use Taiwan Mandarin vocabulary (腳踏車 not 自行車, 醫生 not 大夫)
- Taiwan Mandarin uses STANDARD MANDARIN GRAMMAR - do NOT use Taiwanese-only words like 看覓, 真好, 誠好, 足
- Choose the most accurate word for the meaning:
  * For "sick": use 生病 (not 不舒服 which means "uncomfortable")
  * For "painful": use 痛 (not 疼)
  * For "see/look": use 看 (not 看覓 which is Taiwanese)
  * For medical/formal contexts: use standard medical terms
- Avoid overly casual or vague alternatives

Format EXACTLY as follows (NOTE: Only generate English and Taiwan Mandarin):

TITLE: [Short title]

DESCRIPTION: [1-2 sentence description]

CULTURAL_NOTE: [2-3 sentences about cultural context]

VOCABULARY:
WORD:
EN: [English word - be precise]
ZH: [Precise Taiwan Mandarin translation with traditional characters]
[Repeat for 10-12 words]

DIALOGUE:
LINE:
EN: [English sentence]
ZH: [Taiwan Mandarin translation - use precise vocabulary]
[Repeat for exactly 10 lines - make it a natural conversation]

Example for "At the Restaurant":
VOCABULARY:
WORD:
EN: Menu
ZH: 菜單
WORD:
EN: Order
ZH: 點菜

DIALOGUE:
LINE:
EN: Welcome! Please have a seat.
ZH: 歡迎光臨！請坐。
LINE:
EN: Here's the menu.
ZH: 這是菜單。

Now generate a complete module for "{theme}". Make the dialogue realistic and natural."""
                }]
            )

            response_text = message.content[0].text.strip()

            # Parse module (same logic as generate_module)
            module = {
                'title': '',
                'description': '',
                'culturalNote': '',
                'vocabulary': [],
                'dialogue': []
            }

            lines = response_text.split('\n')
            current_section = None
            current_word = {}
            current_line = {}

            for line in lines:
                line_stripped = line.strip()

                if line_stripped.startswith('TITLE:'):
                    module['title'] = line_stripped.replace('TITLE:', '').strip()
                elif line_stripped.startswith('DESCRIPTION:'):
                    module['description'] = line_stripped.replace('DESCRIPTION:', '').strip()
                elif line_stripped.startswith('CULTURAL_NOTE:'):
                    module['culturalNote'] = line_stripped.replace('CULTURAL_NOTE:', '').strip()
                elif line_stripped == 'VOCABULARY:':
                    current_section = 'vocabulary'
                elif line_stripped == 'DIALOGUE:':
                    current_section = 'dialogue'
                elif line_stripped == 'WORD:':
                    current_word = {}
                elif line_stripped == 'LINE:':
                    current_line = {}
                elif line_stripped.startswith('EN:'):
                    value = line_stripped.replace('EN:', '').strip()
                    if current_section == 'vocabulary':
                        current_word['en'] = value
                    elif current_section == 'dialogue':
                        current_line['en'] = value
                elif line_stripped.startswith('ZH:'):
                    value = line_stripped.replace('ZH:', '').strip()
                    if current_section == 'vocabulary':
                        current_word['mandarin'] = value
                        if current_word.get('en') and current_word.get('mandarin'):
                            module['vocabulary'].append(current_word.copy())
                    elif current_section == 'dialogue':
                        current_line['mandarin'] = value
                        if current_line.get('en') and current_line.get('mandarin'):
                            module['dialogue'].append(current_line.copy())

            if not module['title'] or len(module['dialogue']) < 5:
                yield f"data: {json.dumps({'error': 'Failed to generate complete module'})}\n\n"
                return

            vocab_total = len(module['vocabulary'])
            dialogue_total = len(module['dialogue'])

            # Send initial totals
            yield f"data: {json.dumps({'type': 'totals', 'vocab_total': vocab_total, 'dialogue_total': dialogue_total})}\n\n"

            # Process vocabulary with progress updates
            for idx, word in enumerate(module['vocabulary'], 1):
                mandarin_text = word['mandarin']
                taiwanese_text = normalize_taiwanese_text(mandarin_text)
                word['han'] = taiwanese_text
                tailo = romanize_sentence_with_word_lookup(taiwanese_text)
                word['tailo'] = tailo

                # Send progress update
                yield f"data: {json.dumps({'type': 'progress', 'vocab_current': idx, 'vocab_total': vocab_total, 'dialogue_current': 0, 'dialogue_total': dialogue_total})}\n\n"

            # Process dialogue with progress updates
            for idx, line in enumerate(module['dialogue'], 1):
                mandarin_text = line['mandarin']
                taiwanese_text = normalize_taiwanese_text(mandarin_text)
                line['taiwanese'] = taiwanese_text
                tailo = romanize_sentence_with_word_lookup(taiwanese_text)
                line['tailo'] = tailo

                # Send progress update
                yield f"data: {json.dumps({'type': 'progress', 'vocab_current': vocab_total, 'vocab_total': vocab_total, 'dialogue_current': idx, 'dialogue_total': dialogue_total})}\n\n"

            # Send complete module
            yield f"data: {json.dumps({'type': 'complete', 'module': module})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

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

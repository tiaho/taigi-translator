import React, { useState } from 'react';
import { ArrowLeftRight, Volume2, BookOpen, Loader2, Languages } from 'lucide-react';

export default function TaiwaneseTranslator() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [mandarinText, setMandarinText] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [romanization, setRomanization] = useState('');
  const [hanCharacters, setHanCharacters] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(false);
  const [showPhrases, setShowPhrases] = useState(false);
  const [pronunciationGuide, setPronunciationGuide] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audioRef = React.useRef(null);
  const debounceTimerRef = React.useRef(null);

  // Cache key generator
  const getCacheKey = (text, lang) => `translation_${lang}_${text}`;

  // Load from cache
  const loadFromCache = (text, lang) => {
    try {
      const cacheKey = getCacheKey(text, lang);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }
    return null;
  };

  // Save to cache
  const saveToCache = (text, lang, result) => {
    try {
      const cacheKey = getCacheKey(text, lang);
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      console.error('Cache write error:', e);
    }
  };

  const commonPhrases = [
    { en: 'Hello', taiwanese: 'Lí hó', han: '你好', tailo: 'Lí hó', pronunciation: 'LEE hoh' },
    { en: 'Thank you', taiwanese: 'To-siā', han: '多謝', tailo: 'To-siā', pronunciation: 'daw-SYAH' },
    { en: 'Goodbye', taiwanese: 'Tsài-kiàn', han: '再見', tailo: 'Tsài-kiàn', pronunciation: 'CHAI-gee-en' },
    { en: 'Yes', taiwanese: 'Sī', han: '是', tailo: 'Sī', pronunciation: 'see' },
    { en: 'No', taiwanese: 'M̄-sī', han: '毋是', tailo: 'M̄-sī', pronunciation: 'mm-see' },
    { en: 'Please', taiwanese: 'Tshiánn', han: '請', tailo: 'Tshiánn', pronunciation: 'CHEE-ah' },
    { en: 'Excuse me', taiwanese: 'Pháinn-sè', han: '歹勢', tailo: 'Pháinn-sè', pronunciation: 'PAI-seh' },
    { en: 'How are you?', taiwanese: 'Lí hó bô?', han: '你好無？', tailo: 'Lí hó bô?', pronunciation: 'LEE hoh boh' },
    { en: 'I love you', taiwanese: 'Guá ài lí', han: '我愛你', tailo: 'Guá ài lí', pronunciation: 'GOH-ah eye LEE' },
    { en: 'Good morning', taiwanese: 'Gâu-tsá', han: '早', tailo: 'Gâu-tsá', pronunciation: 'GOW-zah' },
    { en: 'Breakfast', taiwanese: 'Tsá-tǹg', han: '茶頓', tailo: 'Tsá-tǹg', pronunciation: 'ZAH-dng' }
  ];

  const playPhraseAudio = async (phrase) => {
    setAudioError('');
    setIsSpeaking(true);

    try {
      console.log('Playing phrase audio:', phrase.tailo);
      // Use our backend proxy to avoid CORS issues
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const audioUrl = `${apiUrl}/api/audio?taibun=${encodeURIComponent(phrase.tailo)}`;
      console.log('Phrase audio URL:', audioUrl);

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(audioUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Phrase audio blob size:', blob.size);

      if (blob.size === 0) {
        throw new Error('Received empty audio file');
      }

      const blobUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.load();

        await new Promise((resolve, reject) => {
          audioRef.current.onloadeddata = resolve;
          audioRef.current.onerror = reject;
        });

        await audioRef.current.play();
        console.log('Phrase audio playing successfully');
      }
    } catch (error) {
      console.error('Phrase audio error:', error);
      if (error.name === 'AbortError') {
        setAudioError('Audio request timed out');
      } else {
        setAudioError(`Failed to load audio: ${error.message}`);
      }
      setIsSpeaking(false);
    }
  };

  const swapLanguages = () => {
    // Cycle through: english -> mandarin -> taiwanese -> english
    if (sourceLanguage === 'english') {
      setSourceLanguage('mandarin');
    } else if (sourceLanguage === 'mandarin') {
      setSourceLanguage('taiwanese');
    } else {
      setSourceLanguage('english');
    }

    // Clear all fields when switching
    setInputText('');
    setTranslatedText('');
    setMandarinText('');
    setPinyin('');
    setRomanization('');
    setHanCharacters('');
  };

  const translateText = async () => {
    if (!inputText.trim()) return;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);
    setTranslatedText('');
    setMandarinText('');
    setPinyin('');
    setRomanization('');
    setHanCharacters('');
    setPronunciationGuide('');

    try {
      // Check cache first
      const cached = loadFromCache(inputText.trim(), sourceLanguage);
      if (cached) {
        console.log('✨ Using cached translation');
        // Restore from cache
        if (cached.mandarin) setMandarinText(cached.mandarin);
        if (cached.pinyin) setPinyin(cached.pinyin);
        if (cached.translation) setTranslatedText(cached.translation);
        if (cached.romanization) setRomanization(cached.romanization);
        if (cached.hanCharacters) setHanCharacters(cached.hanCharacters);
        setIsLoading(false);
        return;
      }

      // Use streaming API for real-time translation
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/romanize/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          sourceLanguage: sourceLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              // Update UI with streaming partial results
              if (data.status === 'streaming' && data.partial) {
                // Parse partial results and show them
                const partial = data.partial;
                const lines = partial.split('\n');

                for (const line of lines) {
                  if (line.startsWith('MANDARIN:')) {
                    setMandarinText(line.replace('MANDARIN:', '').trim());
                  } else if (line.startsWith('PINYIN:')) {
                    setPinyin(line.replace('PINYIN:', '').trim());
                  } else if (line.startsWith('TAIWANESE:')) {
                    setTranslatedText(line.replace('TAIWANESE:', '').trim());
                  } else if (sourceLanguage === 'taiwanese') {
                    // For Taiwanese to English, show partial English
                    setTranslatedText(partial.trim());
                  }
                }
              }

              // Handle complete result
              if (data.status === 'complete') {
                if (sourceLanguage === 'taiwanese') {
                  setTranslatedText(data.translation || '');
                  setRomanization(data.romanization || '');
                  setHanCharacters(data.hanCharacters || inputText);
                  setMandarinText('');
                  setPinyin('');
                } else if (sourceLanguage === 'mandarin') {
                  setPinyin(data.pinyin || '');
                  setTranslatedText(data.translation || '');
                  setRomanization(data.romanization || '');
                  setHanCharacters(data.hanCharacters || data.translation || '');
                  setMandarinText('');
                } else {
                  setMandarinText(data.mandarin || '');
                  setPinyin(data.pinyin || '');
                  setTranslatedText(data.translation || '');
                  setRomanization(data.romanization || '');
                  setHanCharacters(data.hanCharacters || data.translation || '');
                }

                // Save to cache
                saveToCache(inputText.trim(), sourceLanguage, data);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedText(`Error: ${error.message}. Make sure the backend server is running (python3 backend/app.py)`);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced translate function to prevent double-clicks
  const debouncedTranslate = () => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      translateText();
    }, 300); // 300ms debounce delay
  };

  const speakText = async (text, isTaiwanese = false) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (isTaiwanese) {
        // Use Chinese (Taiwan) voice specifically - not China
        const voices = window.speechSynthesis.getVoices();
        const taiwanVoice = voices.find(voice =>
          voice.lang === 'zh-TW' || voice.lang.includes('zh-TW')
        );
        const chineseTraditionalVoice = voices.find(voice =>
          voice.lang.includes('zh-Hant')
        );
        const anyChineseVoice = voices.find(voice =>
          voice.lang.includes('zh') && !voice.lang.includes('zh-CN')
        );

        if (taiwanVoice) {
          utterance.voice = taiwanVoice;
        } else if (chineseTraditionalVoice) {
          utterance.voice = chineseTraditionalVoice;
        } else if (anyChineseVoice) {
          utterance.voice = anyChineseVoice;
        }

        utterance.lang = 'zh-TW';  // Force Taiwan Mandarin
        utterance.rate = 0.7;
        utterance.pitch = 1.1;
      } else {
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
      }
      
      utterance.volume = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const speakTaiwaneseWithAudio = async (text, romanization) => {
    setIsSpeaking(true);
    
    try {
      // Try to use suisiann.ithuan.tw for authentic Taiwanese audio
      // The URL format is: https://suisiann.ithuan.tw/[word]
      // We'll try to construct an audio URL from the romanization
      
      if (romanization) {
        // Clean up romanization for URL (remove tone marks and special characters)
        const cleanRom = romanization.replace(/[̄́̀̂̃⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').replace(/[ⁿ]/g, 'nn');
        
        // Try to fetch from suisiann API
        try {
          // Try using the Han characters if available, otherwise romanization
          const searchTerm = hanCharacters || cleanRom;
          const apiUrl = `https://suisiann.ithuan.tw/${encodeURIComponent(searchTerm)}`;

          console.log('Attempting to fetch Taiwanese audio from:', apiUrl);
          
          // Note: Direct audio fetching might be blocked by CORS
          // So we'll provide a fallback to browser TTS
          
          // For now, use the best available browser voice
          await speakWithTaiwaneseVoice(text);
          
        } catch (error) {
          console.log('Suisiann fetch failed, using browser TTS:', error);
          await speakWithTaiwaneseVoice(text);
        }
      } else {
        await speakWithTaiwaneseVoice(text);
      }
      
    } catch (error) {
      console.error('Audio synthesis error:', error);
      await speakWithTaiwaneseVoice(text);
    } finally {
      setIsSpeaking(false);
    }
  };

  const playTaiwaneseAudio = async () => {
    setAudioError('');
    setIsSpeaking(true);

    try {
      // Use Tai-lo romanization for the hapsing API
      const tailoText = romanization;

      if (!tailoText) {
        setAudioError('No romanization available for audio');
        setIsSpeaking(false);
        return;
      }

      console.log('Playing audio for romanization:', tailoText);

      // Use our backend proxy to avoid CORS issues
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const audioUrl = `${apiUrl}/api/audio?taibun=${encodeURIComponent(tailoText)}`;
      console.log('Audio URL:', audioUrl);

      // Fetch the audio file with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch(audioUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }

      console.log('Audio response received, content-type:', response.headers.get('content-type'));

      // Get the audio as a blob
      const blob = await response.blob();
      console.log('Audio blob size:', blob.size);

      if (blob.size === 0) {
        throw new Error('Received empty audio file');
      }

      // Create a URL for the blob
      const blobUrl = URL.createObjectURL(blob);

      // Set the audio source and play
      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.load();

        // Wait for the audio to be ready
        await new Promise((resolve, reject) => {
          audioRef.current.onloadeddata = resolve;
          audioRef.current.onerror = reject;
        });

        await audioRef.current.play();
        console.log('Audio playing successfully');
      }

    } catch (error) {
      console.error('Audio error details:', error);
      if (error.name === 'AbortError') {
        setAudioError('Audio request timed out. Please try again.');
      } else {
        setAudioError(`Failed to load audio: ${error.message}`);
      }
      setIsSpeaking(false);
    }
  };

  const speakWithTaiwaneseVoice = async (text) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('TTS not supported'));
        return;
      }

      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find the best Taiwanese voice
      const voices = window.speechSynthesis.getVoices();
      
      // Priority order: Taiwan Chinese > Hong Kong Chinese > Any Chinese
      const taiwanVoice = voices.find(voice => 
        voice.lang === 'zh-TW' || voice.lang === 'zh-Hant-TW'
      );
      const hkVoice = voices.find(voice => 
        voice.lang === 'zh-HK' || voice.lang === 'yue-HK'
      );
      const anyChineseVoice = voices.find(voice => 
        voice.lang.startsWith('zh') && !voice.lang.includes('CN')
      );
      
      if (taiwanVoice) {
        utterance.voice = taiwanVoice;
        console.log('Using Taiwan voice:', taiwanVoice.name);
      } else if (hkVoice) {
        utterance.voice = hkVoice;
        console.log('Using HK voice:', hkVoice.name);
      } else if (anyChineseVoice) {
        utterance.voice = anyChineseVoice;
        console.log('Using Chinese voice:', anyChineseVoice.name);
      }
      
      utterance.lang = 'zh-TW';
      utterance.rate = 0.75;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => {
        console.error('Speech error:', error);
        reject(error);
      };
      
      window.speechSynthesis.speak(utterance);
    });
  };

  const insertPhrase = (phrase) => {
    setMandarinText(''); // Clear Mandarin intermediate step for phrases
    setPinyin(''); // Clear Pinyin for phrases
    if (sourceLanguage === 'english') {
      setInputText(phrase.en);
      setTranslatedText(phrase.taiwanese);
      setRomanization(phrase.tailo);
      setHanCharacters(phrase.han);
      setPronunciationGuide(phrase.pronunciation);
    } else {
      setInputText(phrase.taiwanese);
      setTranslatedText(phrase.en);
      setRomanization(phrase.tailo);
      setHanCharacters(phrase.han);
      setPronunciationGuide(phrase.pronunciation);
    }
    setShowPhrases(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Languages className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">Taiwanese Translator</h1>
          </div>
          <p className="text-gray-600">台語翻譯 • Tâi-gí Hoan-e̍k</p>
        </div>

        {/* Main Translation Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Language Selector */}
          <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">From:</label>
              <select
                value={sourceLanguage}
                onChange={(e) => {
                  setSourceLanguage(e.target.value);
                  setInputText('');
                  setTranslatedText('');
                  setMandarinText('');
                  setPinyin('');
                  setRomanization('');
                  setHanCharacters('');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="english">English</option>
                <option value="mandarin">Mandarin (中文)</option>
                <option value="taiwanese">Taiwanese (台語)</option>
              </select>
            </div>

            <button
              onClick={swapLanguages}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Switch language"
            >
              <ArrowLeftRight className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">To:</label>
              <span className="font-medium text-gray-700 px-3 py-2">
                {sourceLanguage === 'taiwanese' ? 'English' : 'Taiwanese (台語)'}
              </span>
            </div>
          </div>

          {/* Translation Layout - changes based on direction */}
          <div className={`grid ${sourceLanguage === 'english' ? 'md:grid-cols-3' : 'md:grid-cols-2'} divide-x`}>
            {/* Input Column */}
            <div className={`p-6 ${sourceLanguage === 'mandarin' ? 'bg-amber-50' : ''}`}>
              <h3 className={`text-sm font-medium mb-2 ${sourceLanguage === 'mandarin' ? 'text-amber-700' : 'text-gray-700'}`}>
                {sourceLanguage === 'english' ? 'English Input' : sourceLanguage === 'mandarin' ? 'Mandarin Input (中文)' : 'Taiwanese Input'}
              </h3>
              <div className="mb-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Enter ${sourceLanguage === 'english' ? 'English' : sourceLanguage === 'mandarin' ? 'Mandarin' : 'Taiwanese'} text...`}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      debouncedTranslate();
                    }
                  }}
                />
              </div>

              <button
                onClick={debouncedTranslate}
                disabled={isLoading || !inputText.trim()}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  'Translate'
                )}
              </button>

              {/* Show Mandarin Pinyin */}
              {sourceLanguage === 'mandarin' && pinyin && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-1">Pinyin:</p>
                  <p className="text-xs text-amber-700 italic">{pinyin}</p>
                </div>
              )}

              {/* Show Taiwanese Characters and Romanization */}
              {sourceLanguage === 'taiwanese' && (hanCharacters || romanization) && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-xs text-indigo-700 font-medium mb-1">Taiwanese:</p>
                  {hanCharacters && (
                    <p className="text-base text-indigo-900 font-serif mb-1">{hanCharacters}</p>
                  )}
                  {romanization && (
                    <p className="text-xs text-indigo-700 italic">Tâi-lô: {romanization}</p>
                  )}
                </div>
              )}

              {/* Mandarin Audio for Mandarin Input */}
              {sourceLanguage === 'mandarin' && inputText && (
                <div className="mt-2">
                  <button
                    onClick={() => speakText(inputText, true)}
                    disabled={isSpeaking}
                    className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                      isSpeaking
                        ? 'bg-amber-300 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700'
                    } text-white`}
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                    <span className="font-medium">Play Mandarin Audio</span>
                  </button>
                </div>
              )}

              {/* Taiwanese Audio for Taiwanese Input */}
              {sourceLanguage === 'taiwanese' && romanization && (
                <div className="mt-2 space-y-2">
                  {/* Hidden audio element for playback */}
                  <audio
                    ref={audioRef}
                    onEnded={() => setIsSpeaking(false)}
                    onError={(e) => {
                      console.error('Audio playback error:', e);
                      setAudioError('Audio playback failed');
                      setIsSpeaking(false);
                    }}
                    className="hidden"
                  />

                  <button
                    onClick={playTaiwaneseAudio}
                    disabled={isSpeaking}
                    className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                      isSpeaking
                        ? 'bg-green-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                    <span className="font-medium">
                      {isSpeaking ? '⏳ Loading audio...' : 'Play Taiwanese Audio'}
                    </span>
                  </button>

                  {isSpeaking && !audioError && (
                    <p className="text-xs text-gray-600 text-center">First time may take 10-20 seconds. Cached after first play.</p>
                  )}

                  {audioError && (
                    <p className="text-xs text-red-600 text-center">{audioError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Mandarin Intermediate Step */}
            {sourceLanguage === 'english' && (
              <div className="p-6 bg-amber-50">
                <h3 className="text-sm font-medium text-amber-700 mb-2">Mandarin (中文)</h3>
                <div className="h-32 mb-4 p-3 bg-white border border-amber-300 rounded-lg overflow-y-auto">
                  {isLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : mandarinText ? (
                    <div className="space-y-1">
                      <p className="text-base text-gray-800 font-serif">{mandarinText}</p>
                      {pinyin && (
                        <p className="text-xs text-amber-700 italic">
                          Pinyin: {pinyin}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Mandarin will appear here...</p>
                  )}
                </div>

                {mandarinText && (
                  <button
                    onClick={() => speakText(mandarinText, true)}
                    disabled={isSpeaking}
                    className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                      isSpeaking
                        ? 'bg-amber-300 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700'
                    } text-white`}
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                    <span className="font-medium">Play Mandarin Audio</span>
                  </button>
                )}
              </div>
            )}

            {/* Output Column */}
            <div className={`p-6 ${sourceLanguage === 'taiwanese' ? 'bg-gray-50' : 'bg-indigo-50'}`}>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">
                {sourceLanguage === 'taiwanese' ? 'English Output' : 'Taiwanese (台語)'}
              </h3>
              <div className="h-32 mb-4 p-3 bg-white border border-indigo-300 rounded-lg overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ) : translatedText ? (
                  <div className="space-y-1">
                    {hanCharacters && (sourceLanguage === 'english' || sourceLanguage === 'mandarin') && (
                      <p className="text-lg text-indigo-600 font-serif">{hanCharacters}</p>
                    )}

                    {sourceLanguage === 'taiwanese' && (
                      <div className="space-y-1">
                        <p className="text-base font-medium text-gray-800">{translatedText}</p>
                        {hanCharacters && (
                          <p className="text-xs text-gray-600 italic">Original: {hanCharacters}</p>
                        )}
                      </div>
                    )}

                    {romanization && (sourceLanguage === 'english' || sourceLanguage === 'mandarin') && (
                      <p className="text-xs text-gray-600 italic">
                        Tâi-lô: {romanization}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-sm">Translation will appear here...</p>
                )}
              </div>

              {translatedText && (sourceLanguage === 'english' || sourceLanguage === 'mandarin') && (
                <div className="space-y-2">
                  {/* Hidden audio element for playback */}
                  <audio
                    ref={audioRef}
                    onEnded={() => setIsSpeaking(false)}
                    onError={(e) => {
                      console.error('Audio playback error:', e);
                      setAudioError('Audio playback failed');
                      setIsSpeaking(false);
                    }}
                    className="hidden"
                  />

                  {/* Taiwanese Audio Playback */}
                  {romanization && (
                    <button
                      onClick={playTaiwaneseAudio}
                      disabled={isSpeaking}
                      className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                        isSpeaking
                          ? 'bg-green-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      <span className="font-medium">
                        {isSpeaking ? '⏳ Loading audio...' : 'Play Taiwanese Audio'}
                      </span>
                    </button>
                  )}
                  {isSpeaking && !audioError && (
                    <p className="text-xs text-gray-600 text-center">First time may take 10-20 seconds. Cached after first play.</p>
                  )}
                  
                  {audioError && (
                    <p className="text-xs text-red-600 text-center">{audioError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Common Phrases Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={() => setShowPhrases(!showPhrases)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-800">Common Phrases</span>
            </div>
            <span className="text-gray-400">{showPhrases ? '−' : '+'}</span>
          </button>
          
          {showPhrases && (
            <div className="p-4 border-t grid gap-2">
              {commonPhrases.map((phrase, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <button
                      onClick={() => insertPhrase(phrase)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-800">{phrase.en}</p>
                      <p className="text-lg text-gray-600">{phrase.han}</p>
                      <p className="text-sm text-gray-500">Tâi-lô: {phrase.tailo}</p>
                      <p className="text-xs text-purple-600 mt-1">🔊 {phrase.pronunciation}</p>
                    </button>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => playPhraseAudio(phrase)}
                        disabled={isSpeaking}
                        className={`p-2 rounded-lg transition-colors ${
                          isSpeaking
                            ? 'bg-green-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white`}
                        title="Play authentic Taiwanese audio"
                      >
                        <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 pb-8">
          <p>Press Ctrl+Enter to translate • Powered by Claude</p>
        </div>
      </div>
    </div>
  );
}
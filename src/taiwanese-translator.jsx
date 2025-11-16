import React, { useState } from 'react';
import { ArrowLeftRight, Volume2, BookOpen, Loader2, Languages, Library } from 'lucide-react';

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
  const [showVocab, setShowVocab] = useState(false);
  const [selectedVocabCategory, setSelectedVocabCategory] = useState('Numbers');
  const [customTopic, setCustomTopic] = useState('');
  const [isGeneratingVocab, setIsGeneratingVocab] = useState(false);
  const [customVocabLists, setCustomVocabLists] = useState(() => {
    // Load custom vocab lists from localStorage on mount
    try {
      const saved = localStorage.getItem('customVocabLists');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading custom vocab lists:', e);
      return {};
    }
  });
  const [flashcards, setFlashcards] = useState(() => {
    // Load flashcards from localStorage on mount
    try {
      const saved = localStorage.getItem('flashcards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading flashcards:', e);
      return [];
    }
  });
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [flashcardViewMode, setFlashcardViewMode] = useState('study'); // 'study' or 'list'
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(null); // stores card ID to delete
  const [undoAction, setUndoAction] = useState(null); // stores last action for undo: {type, data}
  const [showLearningModules, setShowLearningModules] = useState(false);
  const [learningModules, setLearningModules] = useState(() => {
    // Load learning modules from localStorage on mount
    try {
      const saved = localStorage.getItem('learningModules');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading learning modules:', e);
      return [];
    }
  });
  const [customTheme, setCustomTheme] = useState('');
  const [isGeneratingModule, setIsGeneratingModule] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);
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

  const vocabularyLists = {
    'Numbers': [
      { en: 'One', mandarin: '一', han: '一', tailo: 'It' },
      { en: 'Two', mandarin: '二', han: '二', tailo: 'Jī' },
      { en: 'Three', mandarin: '三', han: '三', tailo: 'Sann' },
      { en: 'Four', mandarin: '四', han: '四', tailo: 'Sì' },
      { en: 'Five', mandarin: '五', han: '五', tailo: 'Gōo' },
      { en: 'Six', mandarin: '六', han: '六', tailo: 'La̍k' },
      { en: 'Seven', mandarin: '七', han: '七', tailo: 'Tshit' },
      { en: 'Eight', mandarin: '八', han: '八', tailo: 'Peh' },
      { en: 'Nine', mandarin: '九', han: '九', tailo: 'Káu' },
      { en: 'Ten', mandarin: '十', han: '十', tailo: 'Tsa̍p' },
    ],
    'Colors': [
      { en: 'Red', mandarin: '紅色', han: '紅色', tailo: 'Âng-sik' },
      { en: 'Blue', mandarin: '藍色', han: '藍色', tailo: 'Nâ-sik' },
      { en: 'Green', mandarin: '綠色', han: '青色', tailo: 'Tshenn-sik' },
      { en: 'Yellow', mandarin: '黃色', han: '黃色', tailo: 'N̂g-sik' },
      { en: 'White', mandarin: '白色', han: '白色', tailo: 'Pe̍h-sik' },
      { en: 'Black', mandarin: '黑色', han: '烏色', tailo: 'Oo-sik' },
    ],
    'Food': [
      { en: 'Rice', mandarin: '飯', han: '飯', tailo: 'Pn̄g' },
      { en: 'Noodles', mandarin: '麵', han: '麵', tailo: 'Mī' },
      { en: 'Water', mandarin: '水', han: '水', tailo: 'Tsuí' },
      { en: 'Tea', mandarin: '茶', han: '茶', tailo: 'Tê' },
      { en: 'Coffee', mandarin: '咖啡', han: '咖啡', tailo: 'Ka-pi' },
      { en: 'Fruit', mandarin: '水果', han: '果子', tailo: 'Kué-tsí' },
      { en: 'Meat', mandarin: '肉', han: '肉', tailo: 'Bah' },
      { en: 'Fish', mandarin: '魚', han: '魚', tailo: 'Hî' },
    ],
    'Family': [
      { en: 'Father', mandarin: '父親', han: '阿爸', tailo: 'A-pa' },
      { en: 'Mother', mandarin: '母親', han: '阿母', tailo: 'A-bú' },
      { en: 'Older brother', mandarin: '哥哥', han: '阿兄', tailo: 'A-hiann' },
      { en: 'Older sister', mandarin: '姐姐', han: '阿姊', tailo: 'A-tsí' },
      { en: 'Younger brother', mandarin: '弟弟', han: '小弟', tailo: 'Sió-tī' },
      { en: 'Younger sister', mandarin: '妹妹', han: '小妹', tailo: 'Sió-muē' },
      { en: 'Grandpa', mandarin: '爺爺', han: '阿公', tailo: 'A-kong' },
      { en: 'Grandma', mandarin: '奶奶', han: '阿媽', tailo: 'A-má' },
    ],
    'Time': [
      { en: 'Today', mandarin: '今天', han: '今仔日', tailo: 'Kin-á-ji̍t' },
      { en: 'Yesterday', mandarin: '昨天', han: '昨日', tailo: 'Tsa-ji̍t' },
      { en: 'Tomorrow', mandarin: '明天', han: '明仔日', tailo: 'Bîn-á-ji̍t' },
      { en: 'Morning', mandarin: '早上', han: '早起', tailo: 'Tsá-khí' },
      { en: 'Afternoon', mandarin: '下午', han: '下晡', tailo: 'Ē-poo' },
      { en: 'Evening', mandarin: '晚上', han: '暗時', tailo: 'Àm-sî' },
      { en: 'Night', mandarin: '夜晚', han: '暗頓', tailo: 'Àm-tǹg' },
    ],
    'Common Verbs': [
      { en: 'Eat', mandarin: '吃', han: '食', tailo: 'Tsia̍h' },
      { en: 'Drink', mandarin: '喝', han: '啉', tailo: 'Lim' },
      { en: 'Go', mandarin: '去', han: '去', tailo: 'Khì' },
      { en: 'Come', mandarin: '來', han: '來', tailo: 'Lâi' },
      { en: 'See/Look', mandarin: '看', han: '看', tailo: 'Khuànn' },
      { en: 'Listen', mandarin: '聽', han: '聽', tailo: 'Thiann' },
      { en: 'Speak', mandarin: '說', han: '講', tailo: 'Kóng' },
      { en: 'Sleep', mandarin: '睡', han: '睏', tailo: 'Khùn' },
    ],
  };

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

        // Use addEventListener to preserve React's onEnded handler
        await new Promise((resolve, reject) => {
          const onLoaded = () => {
            audioRef.current.removeEventListener('loadeddata', onLoaded);
            resolve();
          };
          const onError = () => {
            audioRef.current.removeEventListener('error', onError);
            reject();
          };
          audioRef.current.addEventListener('loadeddata', onLoaded);
          audioRef.current.addEventListener('error', onError);
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

        // Use addEventListener to preserve React's onEnded handler
        await new Promise((resolve, reject) => {
          const onLoaded = () => {
            audioRef.current.removeEventListener('loadeddata', onLoaded);
            resolve();
          };
          const onError = () => {
            audioRef.current.removeEventListener('error', onError);
            reject();
          };
          audioRef.current.addEventListener('loadeddata', onLoaded);
          audioRef.current.addEventListener('error', onError);
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

  const insertVocabWord = (word) => {
    setMandarinText('');
    setPinyin('');
    if (sourceLanguage === 'english') {
      setInputText(word.en);
      setTranslatedText('');
      setRomanization('');
      setHanCharacters('');
    } else if (sourceLanguage === 'mandarin') {
      setInputText(word.mandarin);
      setTranslatedText('');
      setRomanization('');
      setHanCharacters('');
    } else {
      setInputText(word.han);
      setTranslatedText('');
      setRomanization('');
      setHanCharacters('');
    }
    setShowVocab(false);
  };

  const deleteCustomVocabList = (topicName) => {
    const updatedLists = { ...customVocabLists };
    delete updatedLists[topicName];

    setCustomVocabLists(updatedLists);

    // Save to localStorage
    try {
      localStorage.setItem('customVocabLists', JSON.stringify(updatedLists));
      console.log('✅ Deleted vocab list from localStorage');
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }

    // Switch to default category if deleted current one
    if (selectedVocabCategory === topicName) {
      setSelectedVocabCategory('Numbers');
    }
  };

  const addToFlashcards = (front, back, tailo, mandarin = '') => {
    const newCard = {
      id: Date.now(),
      front, // English or Mandarin
      back, // Taiwanese
      tailo,
      mandarin,
      createdAt: new Date().toISOString(),
      // SRS fields
      lastReviewedAt: null,
      nextReviewAt: new Date().toISOString(), // Due immediately
      interval: 0, // Days
      reviewCount: 0,
      status: 'learning' // learning, known, mastered
    };

    const updatedFlashcards = [...flashcards, newCard];
    setFlashcards(updatedFlashcards);

    // Save to localStorage
    try {
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
      console.log('✅ Saved flashcard to localStorage');
    } catch (e) {
      console.error('Error saving flashcard:', e);
    }
  };

  const createFlashcardsFromVocabList = (category) => {
    const words = vocabularyLists[category] || customVocabLists[category] || [];
    const newCards = [];

    words.forEach(word => {
      // Check if card already exists
      const exists = flashcards.some(card =>
        card.front === word.en && card.back === word.han
      );

      if (!exists) {
        // Create new card object
        const newCard = {
          id: Date.now() + newCards.length, // Ensure unique IDs
          front: word.en,
          back: word.han,
          tailo: word.tailo,
          mandarin: word.mandarin || '',
          createdAt: new Date().toISOString(),
          // SRS fields
          lastReviewedAt: null,
          nextReviewAt: new Date().toISOString(),
          interval: 0,
          reviewCount: 0,
          status: 'learning'
        };
        newCards.push(newCard);
      }
    });

    if (newCards.length > 0) {
      // Add all cards at once
      const updatedFlashcards = [...flashcards, ...newCards];
      setFlashcards(updatedFlashcards);

      // Save to localStorage
      try {
        localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
        console.log(`✅ Added ${newCards.length} flashcards from "${category}"`);
      } catch (e) {
        console.error('Error saving flashcards:', e);
      }

      alert(`Added ${newCards.length} new flashcards from "${category}"!`);
    } else {
      alert(`All cards from "${category}" already exist in your flashcards!`);
    }
  };

  const deleteFlashcard = (id) => {
    const deletedCard = flashcards.find(card => card.id === id);
    const updatedFlashcards = flashcards.filter(card => card.id !== id);
    setFlashcards(updatedFlashcards);

    // Store for undo
    setUndoAction({
      type: 'deleteCard',
      data: { card: deletedCard, index: flashcards.findIndex(card => card.id === id) }
    });

    try {
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
      console.log('✅ Deleted flashcard from localStorage');
    } catch (e) {
      console.error('Error saving flashcards:', e);
    }

    // Adjust current index if needed
    if (currentCardIndex >= updatedFlashcards.length && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const undoLastAction = () => {
    if (!undoAction) return;

    if (undoAction.type === 'deleteCard') {
      // Restore single deleted card
      const { card, index } = undoAction.data;
      const updatedFlashcards = [...flashcards];
      updatedFlashcards.splice(index, 0, card);
      setFlashcards(updatedFlashcards);

      try {
        localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
        console.log('✅ Restored flashcard');
      } catch (e) {
        console.error('Error saving flashcards:', e);
      }
    } else if (undoAction.type === 'deleteAll') {
      // Restore all deleted cards
      setFlashcards(undoAction.data.cards);
      setCurrentCardIndex(undoAction.data.currentIndex);

      try {
        localStorage.setItem('flashcards', JSON.stringify(undoAction.data.cards));
        console.log('✅ Restored all flashcards');
      } catch (e) {
        console.error('Error saving flashcards:', e);
      }
    }

    setUndoAction(null);
  };

  const shuffleFlashcards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  };

  const nextCard = () => {
    setIsCardFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setIsCardFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  // SRS: Review a card with difficulty rating
  const reviewCard = (difficulty) => {
    const card = flashcards[currentCardIndex];
    if (!card) return;

    const now = new Date();
    let newInterval = card.interval || 0;
    let newStatus = card.status;

    // SRS Algorithm (simplified SM-2)
    if (difficulty === 'hard') {
      newInterval = Math.max(1, Math.floor(newInterval * 0.5)); // Reduce interval
      newStatus = 'learning';
    } else if (difficulty === 'good') {
      if (newInterval === 0) {
        newInterval = 1; // First review: 1 day
      } else if (newInterval === 1) {
        newInterval = 3; // Second review: 3 days
      } else {
        newInterval = Math.floor(newInterval * 2); // Double the interval
      }

      if (newInterval >= 7) newStatus = 'known';
      if (newInterval >= 21) newStatus = 'mastered';
    } else if (difficulty === 'easy') {
      if (newInterval === 0) {
        newInterval = 4; // Skip ahead
      } else {
        newInterval = Math.floor(newInterval * 2.5);
      }

      if (newInterval >= 7) newStatus = 'known';
      if (newInterval >= 21) newStatus = 'mastered';
    }

    // Calculate next review date
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + newInterval);

    // Update card
    const updatedCard = {
      ...card,
      lastReviewedAt: now.toISOString(),
      nextReviewAt: nextReview.toISOString(),
      interval: newInterval,
      reviewCount: (card.reviewCount || 0) + 1,
      status: newStatus
    };

    const updatedFlashcards = [...flashcards];
    updatedFlashcards[currentCardIndex] = updatedCard;
    setFlashcards(updatedFlashcards);

    // Save to localStorage
    try {
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
      console.log(`✅ Reviewed card: ${difficulty} (next review in ${newInterval} days)`);
    } catch (e) {
      console.error('Error saving review:', e);
    }

    // Move to next card
    nextCard();
  };

  // Get cards due for review
  const getDueCards = () => {
    const now = new Date();
    return flashcards.filter(card => {
      if (!card.nextReviewAt) return true; // New cards
      return new Date(card.nextReviewAt) <= now;
    });
  };

  // Play audio for flashcard Taiwanese side
  const playFlashcardAudio = async (tailo) => {
    if (!tailo) return;

    setAudioError('');
    setIsSpeaking(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const audioUrl = `${apiUrl}/api/audio?taibun=${encodeURIComponent(tailo)}`;

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
      if (blob.size === 0) {
        throw new Error('Received empty audio file');
      }

      const blobUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.load();

        // Use addEventListener to preserve React's onEnded handler
        await new Promise((resolve, reject) => {
          const onLoaded = () => {
            audioRef.current.removeEventListener('loadeddata', onLoaded);
            resolve();
          };
          const onError = () => {
            audioRef.current.removeEventListener('error', onError);
            reject();
          };
          audioRef.current.addEventListener('loadeddata', onLoaded);
          audioRef.current.addEventListener('error', onError);
        });

        await audioRef.current.play();
        console.log('Flashcard audio playing successfully');
      }
    } catch (error) {
      console.error('Flashcard audio error:', error);
      if (error.name === 'AbortError') {
        setAudioError('Audio request timed out');
      } else {
        setAudioError(`Failed to load audio: ${error.message}`);
      }
      setIsSpeaking(false);
    }
  };

  const generateCustomVocab = async () => {
    if (!customTopic.trim()) return;

    setIsGeneratingVocab(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/generate-vocab`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: customTopic.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate vocabulary: ${response.status}`);
      }

      const result = await response.json();
      console.log('Generated vocab:', result);

      if (result.success && result.words && result.words.length > 0) {
        // Add to custom vocab lists with capitalized topic name
        const topicName = customTopic.trim().charAt(0).toUpperCase() + customTopic.trim().slice(1);
        const updatedLists = {
          ...customVocabLists,
          [topicName]: result.words
        };

        setCustomVocabLists(updatedLists);

        // Save to localStorage
        try {
          localStorage.setItem('customVocabLists', JSON.stringify(updatedLists));
          console.log('✅ Saved custom vocab list to localStorage');
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }

        // Switch to the new category
        setSelectedVocabCategory(topicName);

        // Clear input
        setCustomTopic('');
      } else {
        alert('Failed to generate vocabulary. Please try again.');
      }
    } catch (error) {
      console.error('Error generating vocabulary:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsGeneratingVocab(false);
    }
  };

  const generateModule = async (theme) => {
    if (!theme.trim()) return;

    setIsGeneratingModule(true);
    setGenerationStatus('🎨 Generating module content...');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';

      // Start generating
      setGenerationStatus('🤖 Generating vocabulary and dialogue...');
      const response = await fetch(`${apiUrl}/api/generate-module`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: theme.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate module: ${response.status}`);
      }

      setGenerationStatus('📚 Processing translations...');
      const result = await response.json();
      console.log('Generated module:', result);

      if (result.success && result.module) {
        setGenerationStatus('✅ Module ready!');

        // Add to learning modules list
        const newModule = {
          ...result.module,
          id: Date.now(),
          createdAt: new Date().toISOString()
        };

        const updatedModules = [...learningModules, newModule];
        setLearningModules(updatedModules);

        // Save to localStorage
        try {
          localStorage.setItem('learningModules', JSON.stringify(updatedModules));
          console.log('✅ Saved learning module to localStorage');
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }

        // Select the new module
        setSelectedModule(newModule);

        // Clear input
        setCustomTheme('');

        // Clear status after a moment
        setTimeout(() => setGenerationStatus(''), 2000);
      } else {
        alert('Failed to generate learning module. Please try again.');
      }
    } catch (error) {
      console.error('Error generating module:', error);
      setGenerationStatus('');
      alert(`Error: ${error.message}`);
    } finally {
      setIsGeneratingModule(false);
    }
  };

  const deleteModule = (moduleId) => {
    const updatedModules = learningModules.filter(m => m.id !== moduleId);
    setLearningModules(updatedModules);

    try {
      localStorage.setItem('learningModules', JSON.stringify(updatedModules));
      console.log('✅ Deleted module from localStorage');
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }

    // Deselect if this was the selected module
    if (selectedModule && selectedModule.id === moduleId) {
      setSelectedModule(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Shared audio element for all audio playback */}
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

                  {/* Add to Flashcards Button */}
                  <button
                    onClick={() => {
                      addToFlashcards(
                        sourceLanguage === 'mandarin' ? inputText : inputText,
                        hanCharacters,
                        romanization,
                        sourceLanguage === 'english' ? mandarinText : ''
                      );
                      alert('Added to flashcards!');
                    }}
                    className="w-full p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <span>➕</span>
                    <span>Add to Flashcards</span>
                  </button>
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

        {/* Vocabulary Lists Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={() => setShowVocab(!showVocab)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-800">Vocabulary Lists</span>
            </div>
            <span className="text-gray-400">{showVocab ? '−' : '+'}</span>
          </button>

          {showVocab && (
            <div className="p-4 border-t">
              {/* Custom Topic Generator */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h3 className="text-sm font-semibold text-purple-800 mb-2">✨ Generate Custom Vocabulary</h3>
                <p className="text-xs text-purple-600 mb-3">Enter any topic (e.g., "weather", "shopping", "emotions")</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isGeneratingVocab) {
                        generateCustomVocab();
                      }
                    }}
                    placeholder="Enter a topic..."
                    className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isGeneratingVocab}
                  />
                  <button
                    onClick={generateCustomVocab}
                    disabled={isGeneratingVocab || !customTopic.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isGeneratingVocab ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </button>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys({...vocabularyLists, ...customVocabLists}).map((category) => {
                  const isCustom = category in customVocabLists;
                  return (
                    <div key={category} className="relative">
                      <button
                        onClick={() => setSelectedVocabCategory(category)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          selectedVocabCategory === category
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } ${isCustom ? 'pr-8' : ''}`}
                      >
                        {category}
                      </button>
                      {isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${category}" vocab list?`)) {
                              deleteCustomVocabList(category);
                            }
                          }}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
                            selectedVocabCategory === category
                              ? 'text-white hover:bg-red-500'
                              : 'text-gray-500 hover:bg-red-100 hover:text-red-600'
                          }`}
                          title="Delete this vocab list"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Create Flashcards from Vocab Button */}
              <div className="mb-4">
                <button
                  onClick={() => createFlashcardsFromVocabList(selectedVocabCategory)}
                  className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📚</span>
                  <span>Create Flashcards from "{selectedVocabCategory}"</span>
                </button>
              </div>

              {/* Vocabulary Words */}
              <div className="grid md:grid-cols-2 gap-3">
                {(vocabularyLists[selectedVocabCategory] || customVocabLists[selectedVocabCategory] || []).map((word, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => insertVocabWord(word)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{word.en}</p>
                        <div className="flex gap-3 mt-1">
                          <div>
                            <p className="text-xs text-gray-500">Mandarin</p>
                            <p className="text-base text-amber-700">{word.mandarin}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Taiwanese</p>
                            <p className="text-base text-indigo-700">{word.han}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Tâi-lô: {word.tailo}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playPhraseAudio({ tailo: word.tailo });
                        }}
                        disabled={isSpeaking}
                        className={`p-2 rounded-lg transition-colors ${
                          isSpeaking
                            ? 'bg-green-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white`}
                        title="Play Taiwanese audio"
                      >
                        <Volume2 className={`w-3 h-3 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Flashcards Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={() => setShowFlashcards(!showFlashcards)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎴</span>
              <span className="font-medium text-gray-800">
                Flashcards {flashcards.length > 0 && `(${flashcards.length})`}
              </span>
              {flashcards.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {getDueCards().length} due
                </span>
              )}
            </div>
            <span className="text-gray-400">{showFlashcards ? '−' : '+'}</span>
          </button>

          {showFlashcards && (
            <div className="p-4 border-t">
              {flashcards.length === 0 ? (
                <div>
                  {/* Undo button for empty state */}
                  {undoAction && (
                    <div className="mb-4">
                      <button
                        onClick={undoLastAction}
                        className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors animate-pulse"
                      >
                        ↶ Undo Delete {undoAction.type === 'deleteAll' ? `(${undoAction.data.cards.length} cards)` : 'Card'}
                      </button>
                    </div>
                  )}
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">No flashcards yet!</p>
                    <p className="text-sm">Add cards from translations or create from vocabulary lists.</p>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Flashcard Controls */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setFlashcardViewMode(flashcardViewMode === 'study' ? 'list' : 'study')}
                      className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors"
                    >
                      {flashcardViewMode === 'study' ? '📋 View All' : '🎴 Study Mode'}
                    </button>
                    {undoAction && (
                      <button
                        onClick={undoLastAction}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors animate-pulse"
                      >
                        ↶ Undo {undoAction.type === 'deleteAll' ? `(${undoAction.data.cards.length} cards)` : ''}
                      </button>
                    )}
                    <button
                      onClick={shuffleFlashcards}
                      className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
                    >
                      🔀 Shuffle
                    </button>
                    <button
                      onClick={() => {
                        if (confirmDeleteAll) {
                          // Store for undo
                          setUndoAction({
                            type: 'deleteAll',
                            data: { cards: flashcards, currentIndex: currentCardIndex }
                          });

                          setFlashcards([]);
                          localStorage.setItem('flashcards', JSON.stringify([]));
                          setCurrentCardIndex(0);
                          setConfirmDeleteAll(false);
                        } else {
                          setConfirmDeleteAll(true);
                          // Auto-cancel after 3 seconds
                          setTimeout(() => setConfirmDeleteAll(false), 3000);
                        }
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                        confirmDeleteAll
                          ? 'bg-red-700 hover:bg-red-800 text-white animate-pulse'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {confirmDeleteAll ? `⚠️ Confirm Delete ${flashcards.length} Cards?` : '🗑️ Clear All'}
                    </button>
                  </div>

                  {/* Study Mode View */}
                  {flashcardViewMode === 'study' && (
                    <>
                      {/* Card Counter and Status */}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Card {currentCardIndex + 1} of {flashcards.length}
                      </span>
                      {flashcards[currentCardIndex]?.status && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          flashcards[currentCardIndex].status === 'mastered'
                            ? 'bg-green-100 text-green-700'
                            : flashcards[currentCardIndex].status === 'known'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {flashcards[currentCardIndex].status === 'mastered' ? '⭐ Mastered'
                            : flashcards[currentCardIndex].status === 'known' ? '✓ Known'
                            : '📚 Learning'}
                        </span>
                      )}
                    </div>
                    {flashcards[currentCardIndex]?.nextReviewAt && (
                      <p className="text-xs text-gray-500">
                        Next review: {new Date(flashcards[currentCardIndex].nextReviewAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Flashcard Display */}
                  <div className="relative mb-4" style={{ perspective: '1000px' }}>
                    <div
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="relative w-full h-64 cursor-pointer"
                      style={{
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.6s',
                        transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Front of Card */}
                      <div
                        className="absolute w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg shadow-lg p-6 flex flex-col items-center justify-center"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden'
                        }}
                      >
                        <p className="text-xs text-purple-600 mb-2">Front</p>
                        <p className="text-2xl font-bold text-gray-800 text-center mb-2">
                          {flashcards[currentCardIndex]?.front}
                        </p>
                        {flashcards[currentCardIndex]?.mandarin && (
                          <p className="text-lg text-amber-700 font-serif">
                            {flashcards[currentCardIndex].mandarin}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-4">Click to flip</p>
                      </div>

                      {/* Back of Card */}
                      <div
                        className="absolute w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 rounded-lg shadow-lg p-6 flex flex-col items-center justify-center"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <p className="text-xs text-indigo-600 mb-2">Back</p>
                        <p className="text-3xl font-bold text-indigo-900 text-center mb-2 font-serif">
                          {flashcards[currentCardIndex]?.back}
                        </p>
                        <p className="text-sm text-gray-600 italic">
                          {flashcards[currentCardIndex]?.tailo}
                        </p>
                        <p className="text-xs text-gray-500 mt-4">Click to flip</p>
                      </div>
                    </div>
                  </div>

                  {/* Audio Playback Button */}
                  {flashcards[currentCardIndex]?.tailo && (
                    <div className="mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playFlashcardAudio(flashcards[currentCardIndex].tailo);
                        }}
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
                      {audioError && (
                        <p className="text-xs text-red-600 text-center mt-1">{audioError}</p>
                      )}
                    </div>
                  )}

                  {/* SRS Review Buttons - Show after flipping */}
                  {isCardFlipped && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-600 mb-2 text-center">How well did you know this?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewCard('hard')}
                          className="flex-1 py-2 px-3 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors"
                        >
                          😓 Hard
                          <span className="block text-xs opacity-75">Review soon</span>
                        </button>
                        <button
                          onClick={() => reviewCard('good')}
                          className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors"
                        >
                          😊 Good
                          <span className="block text-xs opacity-75">Standard</span>
                        </button>
                        <button
                          onClick={() => reviewCard('easy')}
                          className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors"
                        >
                          😄 Easy
                          <span className="block text-xs opacity-75">Review later</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={prevCard}
                      className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={nextCard}
                      className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Delete Current Card */}
                  <button
                    onClick={() => {
                      const cardId = flashcards[currentCardIndex].id;
                      if (confirmDeleteCard === cardId) {
                        deleteFlashcard(cardId);
                        setConfirmDeleteCard(null);
                      } else {
                        setConfirmDeleteCard(cardId);
                        // Auto-cancel after 3 seconds
                        setTimeout(() => setConfirmDeleteCard(null), 3000);
                      }
                    }}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                      confirmDeleteCard === flashcards[currentCardIndex].id
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                  >
                    {confirmDeleteCard === flashcards[currentCardIndex].id ? '⚠️ Confirm Delete?' : 'Delete Current Card'}
                  </button>
                    </>
                  )}

                  {/* List View - All Flashcards */}
                  {flashcardViewMode === 'list' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {flashcards.map((card, index) => (
                        <div
                          key={card.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => {
                            setCurrentCardIndex(index);
                            setFlashcardViewMode('study');
                            setIsCardFlipped(false);
                          }}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-gray-500">Card {index + 1}</span>
                            <div className="flex items-center gap-2">
                              {/* Status Badge */}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                card.status === 'mastered'
                                  ? 'bg-green-100 text-green-700'
                                  : card.status === 'known'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {card.status === 'mastered' ? '⭐' : card.status === 'known' ? '✓' : '📚'}
                              </span>
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirmDeleteCard === card.id) {
                                    deleteFlashcard(card.id);
                                    setConfirmDeleteCard(null);
                                  } else {
                                    setConfirmDeleteCard(card.id);
                                    // Auto-cancel after 3 seconds
                                    setTimeout(() => setConfirmDeleteCard(null), 3000);
                                  }
                                }}
                                className={`text-xs p-1 rounded transition-colors ${
                                  confirmDeleteCard === card.id
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'text-red-500 hover:text-red-700'
                                }`}
                                title={confirmDeleteCard === card.id ? 'Confirm delete?' : 'Delete'}
                              >
                                {confirmDeleteCard === card.id ? '⚠️' : '✕'}
                              </button>
                            </div>
                          </div>

                          {/* Front (English/Mandarin) */}
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Front:</p>
                            <p className="text-base font-semibold text-gray-800">{card.front}</p>
                            {card.mandarin && (
                              <p className="text-sm text-amber-700 font-serif mt-1">{card.mandarin}</p>
                            )}
                          </div>

                          {/* Back (Taiwanese) */}
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Back:</p>
                            <p className="text-lg font-bold text-indigo-900 font-serif">{card.back}</p>
                            <p className="text-xs text-gray-600 italic mt-1">{card.tailo}</p>
                          </div>

                          {/* Audio Button */}
                          {card.tailo && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playFlashcardAudio(card.tailo);
                              }}
                              disabled={isSpeaking}
                              className={`w-full py-1 px-2 rounded text-xs flex items-center justify-center gap-1 ${
                                isSpeaking
                                  ? 'bg-green-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700'
                              } text-white transition-colors`}
                            >
                              <Volume2 className={`w-3 h-3 ${isSpeaking ? 'animate-pulse' : ''}`} />
                              <span>Play Audio</span>
                            </button>
                          )}

                          {/* Next Review Date */}
                          {card.nextReviewAt && (
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              Next: {new Date(card.nextReviewAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Learning Modules Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={() => setShowLearningModules(!showLearningModules)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-800">Contextual Learning Modules</span>
              <span className="text-xs text-gray-500">({learningModules.length} modules)</span>
            </div>
            <span className="text-gray-400">{showLearningModules ? '−' : '+'}</span>
          </button>

          {showLearningModules && (
            <div className="p-4 border-t">
              {/* Theme Generator */}
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <h3 className="text-sm font-semibold text-indigo-800 mb-2">✨ Generate Learning Module</h3>
                <p className="text-xs text-indigo-600 mb-3">Choose a theme or create your own custom module</p>

                {/* Suggested Themes */}
                <div className="mb-3">
                  <p className="text-xs text-indigo-700 font-medium mb-2">Quick themes:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Restaurant', 'Market', 'Family Gathering', 'Greetings', 'Transportation', 'Weather', 'Shopping', 'Health'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => generateModule(theme)}
                        disabled={isGeneratingModule}
                        className="px-3 py-1 text-xs rounded-full bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Theme Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        generateModule(customTheme);
                      }
                    }}
                    placeholder="Or enter custom theme..."
                    disabled={isGeneratingModule}
                    className="flex-1 px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    onClick={() => generateModule(customTheme)}
                    disabled={isGeneratingModule || !customTheme.trim()}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isGeneratingModule ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </button>
                </div>

                {/* Status Bar */}
                {generationStatus && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                      {generationStatus.includes('...') && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {generationStatus}
                    </p>
                  </div>
                )}
              </div>

              {/* Display Learning Modules */}
              {learningModules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No modules yet. Generate one above to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {learningModules.map((module) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Module Header */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-indigo-900 mb-1">{module.title}</h3>
                            <p className="text-sm text-indigo-700 mb-2">{module.description}</p>
                            {module.culturalNote && (
                              <div className="bg-amber-50 border-l-4 border-amber-400 p-2 rounded">
                                <p className="text-xs text-amber-800">
                                  <span className="font-semibold">Cultural Note:</span> {module.culturalNote}
                                </p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteModule(module.id)}
                            className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                            title="Delete module"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Module Content */}
                      <div className="p-4">
                        {/* Vocabulary Section */}
                        {module.vocabulary && module.vocabulary.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">📚 Vocabulary ({module.vocabulary.length} words)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {module.vocabulary.map((word, idx) => (
                                <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-600">{word.en}</p>
                                      <p className="text-base font-serif font-bold text-indigo-900">{word.han}</p>
                                      <p className="text-xs text-gray-500 italic">{word.tailo}</p>
                                    </div>
                                    <button
                                      onClick={() => playPhraseAudio({ tailo: word.tailo })}
                                      disabled={isSpeaking}
                                      className={`p-1 rounded transition-colors ${
                                        isSpeaking ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600'
                                      } text-white`}
                                      title="Play audio"
                                    >
                                      <Volume2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dialogue Section */}
                        {module.dialogue && module.dialogue.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">💬 Dialogue ({module.dialogue.length} lines)</h4>
                            <div className="space-y-2">
                              {module.dialogue.map((line, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-500 mb-1">#{idx + 1}</p>
                                      <p className="text-sm text-gray-700 mb-1">{line.en}</p>
                                      <p className="text-lg font-serif font-bold text-indigo-900 mb-1">{line.taiwanese}</p>
                                      <p className="text-xs text-gray-500 italic">{line.tailo}</p>
                                    </div>
                                    <button
                                      onClick={() => playPhraseAudio({ tailo: line.tailo })}
                                      disabled={isSpeaking}
                                      className={`p-2 rounded-lg transition-colors ${
                                        isSpeaking ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'
                                      } text-white flex-shrink-0`}
                                      title="Play audio"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
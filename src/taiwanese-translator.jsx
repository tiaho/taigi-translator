import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Volume2, BookOpen, Loader2, Languages, Library, Home, CreditCard, GraduationCap, BookMarked, MessageSquare, ChevronDown, MoreHorizontal, Trophy, CheckCircle, XCircle, RotateCcw, BarChart3, TrendingUp, Flame, Calendar, Award, Target, Timer, Clock, Play, Pause, Square } from 'lucide-react';
import LessonViewer from './components/LessonViewer';
import SentenceBuilder from './components/SentenceBuilder';

export default function TaiwaneseTranslator() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [mandarinText, setMandarinText] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [romanization, setRomanization] = useState('');
  const [hanCharacters, setHanCharacters] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(false);
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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [flashcardViewMode, setFlashcardViewMode] = useState('study'); // 'study' or 'list'
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(null); // stores card ID to delete
  const [undoAction, setUndoAction] = useState(null); // stores last action for undo: {type, data}
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
  const [activeSection, setActiveSection] = useState('translator'); // 'translator', 'lessons', 'flashcards', 'quiz', 'modules', 'vocabulary', 'phrases', 'tonesandhi', 'sentencebuilder'
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null); // null = show units page, lesson ID = show lesson

  // Quiz state
  const [quizMode, setQuizMode] = useState(null); // null = mode selection, 'translation', 'listening'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState(() => {
    try {
      const saved = localStorage.getItem('statistics');
      return saved ? JSON.parse(saved) : {
        quizzes: {
          totalQuizzes: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          byMode: {
            translation: { total: 0, correct: 0, quizzes: 0 },
            listening: { total: 0, correct: 0, quizzes: 0 }
          },
          history: [] // { date, mode, score, total, percentage }
        },
        flashcards: {
          totalReviews: 0,
          reviewHistory: [], // { date, cardId, rating }
          byRating: {
            again: 0,
            hard: 0,
            good: 0,
            easy: 0
          }
        },
        studySessions: {
          lastStudyDate: null,
          currentStreak: 0,
          longestStreak: 0,
          totalSessions: 0,
          sessionHistory: [] // { date, duration, cardsReviewed, quizzesTaken }
        },
        overall: {
          firstUsedDate: new Date().toISOString(),
          totalTimeStudied: 0 // in minutes
        }
      };
    } catch (e) {
      console.error('Error loading statistics:', e);
      return {
        quizzes: { totalQuizzes: 0, totalQuestions: 0, totalCorrect: 0, byMode: { translation: { total: 0, correct: 0, quizzes: 0 }, listening: { total: 0, correct: 0, quizzes: 0 } }, history: [] },
        flashcards: { totalReviews: 0, reviewHistory: [], byRating: { again: 0, hard: 0, good: 0, easy: 0 } },
        studySessions: { lastStudyDate: null, currentStreak: 0, longestStreak: 0, totalSessions: 0, sessionHistory: [] },
        overall: { firstUsedDate: new Date().toISOString(), totalTimeStudied: 0 }
      };
    }
  });

  // Daily Challenge state
  const [dailyChallenge, setDailyChallenge] = useState(() => {
    try {
      const saved = localStorage.getItem('dailyChallenge');
      if (saved) {
        const challenge = JSON.parse(saved);
        const today = new Date().toISOString().split('T')[0];
        // Reset challenge if it's a new day
        if (challenge.date !== today) {
          return generateDailyChallenge();
        }
        return challenge;
      }
      return generateDailyChallenge();
    } catch (e) {
      console.error('Error loading daily challenge:', e);
      return generateDailyChallenge();
    }
  });

  // Tone Sandhi Trainer state
  const [toneSandhiLevel, setToneSandhiLevel] = useState('beginner'); // 'beginner', 'intermediate', 'advanced'
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false); // Toggle between compound and individual characters
  const [playingAudioType, setPlayingAudioType] = useState(null); // 'compound' or character index
  const [toneSandhiProgress, setToneSandhiProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('toneSandhiProgress');
      return saved ? JSON.parse(saved) : {
        beginner: [],
        intermediate: [],
        advanced: []
      };
    } catch (e) {
      console.error('Error loading tone sandhi progress:', e);
      return {
        beginner: [],
        intermediate: [],
        advanced: []
      };
    }
  });

  // Study Session Timer state
  const [studyTimer, setStudyTimer] = useState({
    isActive: false,
    isPaused: false,
    duration: 0, // in seconds
    timeRemaining: 0, // in seconds
    startTime: null,
    activityType: null, // 'flashcards', 'quiz', 'lessons', 'free'
    cardsReviewed: 0,
    quizzesTaken: 0
  });
  const [customTimerInput, setCustomTimerInput] = useState('');
  const timerIntervalRef = useRef(null);

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

  // Statistics helper functions
  const saveStatistics = (stats) => {
    try {
      localStorage.setItem('statistics', JSON.stringify(stats));
    } catch (e) {
      console.error('Error saving statistics:', e);
    }
  };

  const recordQuizCompletion = (mode, score, total) => {
    const newStats = { ...statistics };
    const percentage = Math.round((score / total) * 100);
    const today = new Date().toISOString().split('T')[0];

    // Update quiz statistics
    newStats.quizzes.totalQuizzes += 1;
    newStats.quizzes.totalQuestions += total;
    newStats.quizzes.totalCorrect += score;
    newStats.quizzes.byMode[mode].quizzes += 1;
    newStats.quizzes.byMode[mode].total += total;
    newStats.quizzes.byMode[mode].correct += score;
    newStats.quizzes.history.unshift({
      date: new Date().toISOString(),
      mode,
      score,
      total,
      percentage
    });

    // Keep only last 50 quiz results
    if (newStats.quizzes.history.length > 50) {
      newStats.quizzes.history = newStats.quizzes.history.slice(0, 50);
    }

    // Update study streak
    updateStudyStreak(newStats, today);

    setStatistics(newStats);
    saveStatistics(newStats);
  };

  const recordFlashcardReview = (cardId, rating) => {
    const newStats = { ...statistics };
    const today = new Date().toISOString().split('T')[0];

    // Update flashcard statistics
    newStats.flashcards.totalReviews += 1;
    newStats.flashcards.byRating[rating] += 1;
    newStats.flashcards.reviewHistory.unshift({
      date: new Date().toISOString(),
      cardId,
      rating
    });

    // Keep only last 100 reviews
    if (newStats.flashcards.reviewHistory.length > 100) {
      newStats.flashcards.reviewHistory = newStats.flashcards.reviewHistory.slice(0, 100);
    }

    // Update study streak
    updateStudyStreak(newStats, today);

    setStatistics(newStats);
    saveStatistics(newStats);
  };

  const updateStudyStreak = (stats, today) => {
    const lastStudy = stats.studySessions.lastStudyDate;

    if (lastStudy === today) {
      // Already studied today, no change to streak
      return;
    }

    if (!lastStudy) {
      // First study session ever
      stats.studySessions.currentStreak = 1;
      stats.studySessions.longestStreak = 1;
      stats.studySessions.lastStudyDate = today;
      stats.studySessions.totalSessions = 1;
      return;
    }

    const lastDate = new Date(lastStudy);
    const todayDate = new Date(today);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day - increment streak
      stats.studySessions.currentStreak += 1;
      if (stats.studySessions.currentStreak > stats.studySessions.longestStreak) {
        stats.studySessions.longestStreak = stats.studySessions.currentStreak;
      }
    } else if (diffDays > 1) {
      // Streak broken - reset to 1
      stats.studySessions.currentStreak = 1;
    }

    stats.studySessions.lastStudyDate = today;
    stats.studySessions.totalSessions += 1;

    // Update daily challenge for study streak
    if (stats.studySessions.currentStreak >= 1) {
      updateChallengeProgress('streak', 1);
    }
  };

  // Daily Challenge helper functions
  function generateDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const challengeTypes = [
      {
        id: 'review_cards',
        type: 'review',
        title: 'Flashcard Review Master',
        description: 'Review 10 flashcards',
        icon: '🃏',
        goal: 10,
        reward: 'Study streak +1',
        color: 'from-blue-500 to-indigo-500'
      },
      {
        id: 'quiz_master',
        type: 'quiz',
        title: 'Quiz Champion',
        description: 'Complete 2 quizzes with 80%+ score',
        icon: '🏆',
        goal: 2,
        reward: 'Quiz master badge',
        color: 'from-green-500 to-emerald-500'
      },
      {
        id: 'learn_new_words',
        type: 'flashcard',
        title: 'Vocabulary Builder',
        description: 'Create 5 new flashcards',
        icon: '📚',
        goal: 5,
        reward: 'Word collector badge',
        color: 'from-purple-500 to-pink-500'
      },
      {
        id: 'perfect_score',
        type: 'quiz',
        title: 'Perfect Performance',
        description: 'Score 100% on any quiz',
        icon: '⭐',
        goal: 1,
        reward: 'Perfect score badge',
        color: 'from-yellow-500 to-orange-500'
      },
      {
        id: 'study_streak',
        type: 'streak',
        title: 'Consistency is Key',
        description: 'Maintain your study streak',
        icon: '🔥',
        goal: 1,
        reward: 'Streak bonus',
        color: 'from-red-500 to-orange-500'
      }
    ];

    // Select a random challenge for today
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const challengeIndex = dayOfYear % challengeTypes.length;
    const todaysChallenge = challengeTypes[challengeIndex];

    return {
      ...todaysChallenge,
      date: today,
      progress: 0,
      completed: false,
      completedAt: null
    };
  }

  const saveDailyChallenge = (challenge) => {
    try {
      localStorage.setItem('dailyChallenge', JSON.stringify(challenge));
    } catch (e) {
      console.error('Error saving daily challenge:', e);
    }
  };

  const updateChallengeProgress = (type, amount = 1) => {
    const challenge = { ...dailyChallenge };

    // Check if challenge type matches the action
    if (challenge.type !== type || challenge.completed) return;

    // Update progress
    challenge.progress = Math.min(challenge.progress + amount, challenge.goal);

    // Check if completed
    if (challenge.progress >= challenge.goal) {
      challenge.completed = true;
      challenge.completedAt = new Date().toISOString();
    }

    setDailyChallenge(challenge);
    saveDailyChallenge(challenge);
  };

  const checkQuizChallenge = (score, total) => {
    const challenge = { ...dailyChallenge };

    if (challenge.type !== 'quiz' || challenge.completed) return;

    // For "quiz_master" challenge: need 80%+ score
    if (challenge.id === 'quiz_master') {
      const percentage = (score / total) * 100;
      if (percentage >= 80) {
        updateChallengeProgress('quiz', 1);
      }
    }
    // For "perfect_score" challenge: need 100%
    else if (challenge.id === 'perfect_score') {
      const percentage = (score / total) * 100;
      if (percentage === 100) {
        updateChallengeProgress('quiz', 1);
      }
    }
  };

  // Tone Sandhi Trainer helper functions
  const saveToneSandhiProgress = (progress) => {
    try {
      localStorage.setItem('toneSandhiProgress', JSON.stringify(progress));
    } catch (e) {
      console.error('Error saving tone sandhi progress:', e);
    }
  };

  const markExerciseComplete = (level, exerciseId) => {
    const newProgress = { ...toneSandhiProgress };
    if (!newProgress[level].includes(exerciseId)) {
      newProgress[level].push(exerciseId);
      setToneSandhiProgress(newProgress);
      saveToneSandhiProgress(newProgress);
    }
  };

  const playToneSandhiAudio = async (tailo, audioType) => {
    setPlayingAudioType(audioType);
    setAudioError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const audioUrl = `${apiUrl}/api/audio?taibun=${encodeURIComponent(tailo)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(audioUrl, { signal: controller.signal });
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
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Audio error:', error);
      setAudioError('Failed to load audio');
    } finally {
      // Clear playing state after a short delay
      setTimeout(() => setPlayingAudioType(null), 1000);
    }
  };

  const getCurrentExercises = () => {
    return toneSandhiExercises[toneSandhiLevel] || [];
  };

  const getCurrentExercise = () => {
    const exercises = getCurrentExercises();
    return exercises[currentExerciseIndex] || null;
  };

  const nextExercise = () => {
    const exercises = getCurrentExercises();
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setShowBreakdown(false);
    }
  };

  const previousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setShowBreakdown(false);
    }
  };

  const changeToneSandhiLevel = (level) => {
    setToneSandhiLevel(level);
    setCurrentExerciseIndex(0);
    setShowBreakdown(false);
  };

  // Study Session Timer functions
  const startStudySession = (durationMinutes, activityType = 'free') => {
    const durationSeconds = durationMinutes * 60;
    setStudyTimer({
      isActive: true,
      isPaused: false,
      duration: durationSeconds,
      timeRemaining: durationSeconds,
      startTime: new Date(),
      activityType,
      cardsReviewed: 0,
      quizzesTaken: 0
    });
    setCustomTimerInput(''); // Reset custom input after starting
  };

  const startCustomStudySession = () => {
    const duration = parseInt(customTimerInput);
    if (isNaN(duration) || duration <= 0 || duration > 180) {
      alert('Please enter a valid duration between 1 and 180 minutes');
      return;
    }
    startStudySession(duration, 'free');
  };

  const pauseStudySession = () => {
    setStudyTimer(prev => ({ ...prev, isPaused: true }));
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const resumeStudySession = () => {
    setStudyTimer(prev => ({ ...prev, isPaused: false }));
  };

  const stopStudySession = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Record the study session in statistics
    if (studyTimer.startTime) {
      const sessionDuration = Math.ceil((studyTimer.duration - studyTimer.timeRemaining) / 60); // in minutes
      if (sessionDuration > 0) {
        const today = new Date().toISOString().split('T')[0];

        setStatistics(prevStats => {
          const newStats = { ...prevStats };

          // Update study sessions
          newStats.studySessions = newStats.studySessions || {
            lastStudyDate: null,
            currentStreak: 0,
            longestStreak: 0,
            totalSessions: 0,
            sessionHistory: []
          };

          newStats.studySessions.totalSessions += 1;
          newStats.studySessions.lastStudyDate = today;
          newStats.studySessions.sessionHistory.push({
            date: today,
            duration: sessionDuration,
            activityType: studyTimer.activityType,
            cardsReviewed: studyTimer.cardsReviewed,
            quizzesTaken: studyTimer.quizzesTaken
          });

          // Update total time studied
          newStats.overall = newStats.overall || { firstUsedDate: new Date().toISOString(), totalTimeStudied: 0 };
          newStats.overall.totalTimeStudied += sessionDuration;

          // Update streak
          updateStudyStreak(newStats, today);

          saveStatistics(newStats);
          return newStats;
        });
      }
    }

    // Reset timer
    setStudyTimer({
      isActive: false,
      isPaused: false,
      duration: 0,
      timeRemaining: 0,
      startTime: null,
      activityType: null,
      cardsReviewed: 0,
      quizzesTaken: 0
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer countdown effect
  useEffect(() => {
    if (studyTimer.isActive && !studyTimer.isPaused && studyTimer.timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setStudyTimer(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;

          // Timer completed
          if (newTimeRemaining <= 0) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }

            // Play completion sound (optional - could add audio notification)
            // Show completion notification
            alert('Study session complete! Great work!');

            return { ...prev, timeRemaining: 0, isPaused: true };
          }

          return { ...prev, timeRemaining: newTimeRemaining };
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [studyTimer.isActive, studyTimer.isPaused, studyTimer.timeRemaining]);

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
      { en: 'Yesterday', mandarin: '昨天', han: '昨昏', tailo: 'Tsa-hng' },
      { en: 'Tomorrow', mandarin: '明天', han: '明仔載', tailo: 'Bîn-á-tsài' },
      { en: 'Morning', mandarin: '早上', han: '早起', tailo: 'Tsá-khí' },
      { en: 'Afternoon', mandarin: '下午', han: '下晡', tailo: 'Ē-poo' },
      { en: 'Evening', mandarin: '晚上', han: '暗時', tailo: 'Àm-sî' },
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

  // Tone Sandhi Training Exercises
  const toneSandhiExercises = {
    beginner: [
      {
        id: 'ts-001',
        compound: { han: '跤踏車', tailo: 'kha-ta̍h-tshia', english: 'bicycle', mandarin: '腳踏車' },
        characters: [
          { han: '跤', tailo: 'kha', english: 'foot/leg' },
          { han: '踏', tailo: 'ta̍h', english: 'step on' },
          { han: '車', tailo: 'tshia', english: 'vehicle' }
        ],
        rule: 'In compound words, tones of non-final syllables typically change following tone sandhi rules',
        category: 'Transportation'
      },
      {
        id: 'ts-002',
        compound: { han: '公車', tailo: 'kong-tshia', english: 'bus', mandarin: '公車' },
        characters: [
          { han: '公', tailo: 'kong', english: 'public' },
          { han: '車', tailo: 'tshia', english: 'vehicle' }
        ],
        rule: 'Tone 1 (high level) before another syllable often remains unchanged',
        category: 'Transportation'
      },
      {
        id: 'ts-003',
        compound: { han: '昨昏', tailo: 'tsa-hng', english: 'yesterday', mandarin: '昨天' },
        characters: [
          { han: '昨', tailo: 'tsa', english: 'previous' },
          { han: '昏', tailo: 'hng', english: 'dusk/evening' }
        ],
        rule: 'The first syllable undergoes tone change when followed by another syllable',
        category: 'Time'
      },
      {
        id: 'ts-004',
        compound: { han: '明仔載', tailo: 'bîn-á-tsài', english: 'tomorrow', mandarin: '明天' },
        characters: [
          { han: '明', tailo: 'bîn', english: 'bright' },
          { han: '仔', tailo: 'á', english: 'diminutive particle' },
          { han: '載', tailo: 'tsài', english: 'day' }
        ],
        rule: 'Multi-syllable compound showing tone sandhi in first syllable',
        category: 'Time'
      },
      {
        id: 'ts-005',
        compound: { han: '紅色', tailo: 'âng-sik', english: 'red (color)', mandarin: '紅色' },
        characters: [
          { han: '紅', tailo: 'âng', english: 'red' },
          { han: '色', tailo: 'sik', english: 'color' }
        ],
        rule: 'Tone 5 (low rising) changes in compound words',
        category: 'Colors'
      },
      {
        id: 'ts-006',
        compound: { han: '藍色', tailo: 'nâ-sik', english: 'blue (color)', mandarin: '藍色' },
        characters: [
          { han: '藍', tailo: 'nâ', english: 'blue' },
          { han: '色', tailo: 'sik', english: 'color' }
        ],
        rule: 'Tone 5 (low rising) in first position undergoes tone sandhi',
        category: 'Colors'
      }
    ],
    intermediate: [
      {
        id: 'ts-101',
        compound: { han: '計程車', tailo: 'kè-thîng-tshia', english: 'taxi', mandarin: '計程車' },
        characters: [
          { han: '計', tailo: 'kè', english: 'calculate' },
          { han: '程', tailo: 'thîng', english: 'distance' },
          { han: '車', tailo: 'tshia', english: 'vehicle' }
        ],
        rule: 'Three-syllable compound: both first and second syllables undergo tone change',
        category: 'Transportation'
      },
      {
        id: 'ts-102',
        compound: { han: '台灣人', tailo: 'tâi-uân-lâng', english: 'Taiwanese person', mandarin: '台灣人' },
        characters: [
          { han: '台', tailo: 'tâi', english: 'Taiwan' },
          { han: '灣', tailo: 'uân', english: 'bay' },
          { han: '人', tailo: 'lâng', english: 'person' }
        ],
        rule: 'Proper noun compound with tone sandhi in first two syllables',
        category: 'People'
      },
      {
        id: 'ts-103',
        compound: { han: '電腦', tailo: 'tiān-náu', english: 'computer', mandarin: '電腦' },
        characters: [
          { han: '電', tailo: 'tiān', english: 'electricity' },
          { han: '腦', tailo: 'náu', english: 'brain' }
        ],
        rule: 'Tone 7 (mid level) changes when followed by another syllable',
        category: 'Technology'
      },
      {
        id: 'ts-104',
        compound: { han: '電話', tailo: 'tiān-uē', english: 'telephone', mandarin: '電話' },
        characters: [
          { han: '電', tailo: 'tiān', english: 'electricity' },
          { han: '話', tailo: 'uē', english: 'speech' }
        ],
        rule: 'First syllable tone changes in two-syllable compound',
        category: 'Technology'
      },
      {
        id: 'ts-105',
        compound: { han: '學生', tailo: 'ha̍k-sing', english: 'student', mandarin: '學生' },
        characters: [
          { han: '學', tailo: 'ha̍k', english: 'study' },
          { han: '生', tailo: 'sing', english: 'person/life' }
        ],
        rule: 'Tone 8 (high checked) undergoes tone sandhi before another syllable',
        category: 'Education'
      }
    ],
    advanced: [
      {
        id: 'ts-201',
        compound: { han: '食飽未', tailo: 'tsia̍h-pá-buē', english: 'Have you eaten?', mandarin: '吃飽了嗎' },
        characters: [
          { han: '食', tailo: 'tsia̍h', english: 'eat' },
          { han: '飽', tailo: 'pá', english: 'full' },
          { han: '未', tailo: 'buē', english: 'not yet (question particle)' }
        ],
        rule: 'Common greeting phrase with tone changes in first two syllables',
        category: 'Greetings'
      },
      {
        id: 'ts-202',
        compound: { han: '你好無', tailo: 'lí-hó-bô', english: 'How are you?', mandarin: '你好嗎' },
        characters: [
          { han: '你', tailo: 'lí', english: 'you' },
          { han: '好', tailo: 'hó', english: 'good' },
          { han: '無', tailo: 'bô', english: 'not (question particle)' }
        ],
        rule: 'Question phrase showing tone sandhi across three syllables',
        category: 'Greetings'
      },
      {
        id: 'ts-203',
        compound: { han: '對不住', tailo: 'tuì-put-tiū', english: 'sorry/excuse me', mandarin: '對不起' },
        characters: [
          { han: '對', tailo: 'tuì', english: 'correct/towards' },
          { han: '不', tailo: 'put', english: 'not' },
          { han: '住', tailo: 'tiū', english: 'reside' }
        ],
        rule: 'Polite expression with complex tone sandhi pattern',
        category: 'Politeness'
      },
      {
        id: 'ts-204',
        compound: { han: '無要緊', tailo: 'bô-iàu-kín', english: "it's okay/no problem", mandarin: '沒關係' },
        characters: [
          { han: '無', tailo: 'bô', english: 'not have' },
          { han: '要', tailo: 'iàu', english: 'need' },
          { han: '緊', tailo: 'kín', english: 'tight/important' }
        ],
        rule: 'Three-syllable phrase commonly used in conversation',
        category: 'Politeness'
      }
    ]
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
    setActiveSection('translator');
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
    setActiveSection('translator');
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

    // Update daily challenge progress
    updateChallengeProgress('flashcard', 1);
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
    if (difficulty === 'again') {
      newInterval = 1; // Reset to 1 day
      newStatus = 'learning';
    } else if (difficulty === 'hard') {
      newInterval = 3; // 3 days
      newStatus = 'learning';
    } else if (difficulty === 'good') {
      newInterval = 7; // 7 days
      newStatus = 'known';
    } else if (difficulty === 'easy') {
      newInterval = 14; // 14 days
      newStatus = 'mastered';
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

    // Record review statistics
    recordFlashcardReview(card.id, difficulty);

    // Update daily challenge progress
    updateChallengeProgress('review', 1);

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

      // Use fetch with streaming for real-time progress updates (EventSource doesn't support POST)
      const response = await fetch(`${apiUrl}/api/generate-module-stream`, {
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let vocabCurrent = 0;
      let vocabTotal = 0;
      let dialogueCurrent = 0;
      let dialogueTotal = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix

            if (data.type === 'status') {
              setGenerationStatus(`🤖 ${data.message}`);
            } else if (data.type === 'totals') {
              vocabTotal = data.vocab_total;
              dialogueTotal = data.dialogue_total;
              setGenerationStatus(`🤖 Generating vocabulary (0/${vocabTotal}) and dialogue (0/${dialogueTotal})...`);
            } else if (data.type === 'progress') {
              vocabCurrent = data.vocab_current;
              dialogueCurrent = data.dialogue_current;
              setGenerationStatus(`🤖 Generating vocabulary (${vocabCurrent}/${vocabTotal}) and dialogue (${dialogueCurrent}/${dialogueTotal})...`);
            } else if (data.type === 'complete') {
              setGenerationStatus('✅ Module ready!');

              // Add to learning modules list
              const newModule = {
                ...data.module,
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
            } else if (data.type === 'error' || data.error) {
              throw new Error(data.error || 'Unknown error occurred');
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError, line);
          }
        }
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

  // Generate quiz questions from flashcards
  const generateQuizQuestions = (mode, numQuestions = 10) => {
    if (flashcards.length < 4) {
      alert('You need at least 4 flashcards to take a quiz. Add more flashcards first!');
      return;
    }

    // Shuffle flashcards and take numQuestions
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, Math.min(numQuestions, flashcards.length));

    // Generate questions based on mode
    const questions = selectedCards.map((card, idx) => {
      // Get 3 wrong answer cards from other flashcards
      const wrongCards = flashcards
        .filter(c => c.id !== card.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Combine correct and wrong answers with their romanizations
      const correctAnswer = mode === 'translation' ? card.back : card.front;
      const allOptionsWithRomanization = [
        { text: correctAnswer, romanization: card.tailo },
        ...wrongCards.map(c => ({
          text: mode === 'translation' ? c.back : c.front,
          romanization: c.tailo
        }))
      ].sort(() => Math.random() - 0.5); // Shuffle options

      return {
        id: card.id,
        question: mode === 'translation' ? card.front : card.back,
        correctAnswer: correctAnswer,
        options: allOptionsWithRomanization.map(opt => opt.text),
        optionsWithRomanization: allOptionsWithRomanization, // Store romanization for each option
        romanization: card.tailo,
        mode: mode
      };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setQuizScore({ correct: 0, total: questions.length });
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuizComplete(false);
    setQuizMode(mode);
  };

  // Handle answer selection
  const handleAnswerSelect = (answer) => {
    if (showFeedback) return; // Don't allow changing answer after submission
    setSelectedAnswer(answer);
  };

  // Submit answer
  const submitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    if (isCorrect) {
      setQuizScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    }

    setShowFeedback(true);
  };

  // Go to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Record quiz completion statistics
      recordQuizCompletion(quizMode, quizScore.correct, quizScore.total);

      // Check daily challenge progress
      checkQuizChallenge(quizScore.correct, quizScore.total);

      setQuizComplete(true);
    }
  };

  // Restart quiz
  const restartQuiz = () => {
    setQuizMode(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuizComplete(false);
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

      <div className="max-w-4xl mx-auto px-2 md:px-4">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6 pt-4 md:pt-8 px-4">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
            <Languages className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Taiwanese Translator</h1>
          </div>
          <p className="text-sm md:text-base text-gray-600">台語翻譯 • Tâi-gí Hoan-e̍k</p>
        </div>

        {/* Navigation Menu */}
        <div className="flex justify-center mb-4 md:mb-6 px-2 md:px-4">
          <div className="inline-flex bg-white rounded-lg shadow-md p-1.5 md:p-2 gap-1 md:gap-2 relative">
            {/* Main Tabs */}
            <button
              onClick={() => setActiveSection('translator')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all ${
                activeSection === 'translator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Languages className="w-5 h-5 md:w-4 md:h-4" />
              <span className="font-medium text-xs md:text-base hidden sm:inline">Translator</span>
            </button>
            <button
              onClick={() => setActiveSection('lessons')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all ${
                activeSection === 'lessons'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-5 h-5 md:w-4 md:h-4" />
              <span className="font-medium text-xs md:text-base hidden sm:inline">Lessons</span>
            </button>
            <button
              onClick={() => setActiveSection('flashcards')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all relative ${
                activeSection === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-5 h-5 md:w-4 md:h-4" />
              <span className="font-medium text-xs md:text-base hidden sm:inline">Flashcards</span>
              {flashcards.length > 0 && (
                <span className="absolute -top-1 -right-1 sm:static text-xs bg-purple-200 text-purple-800 px-1.5 sm:px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {flashcards.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSection('study')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all ${
                activeSection === 'study'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-5 h-5 md:w-4 md:h-4" />
              <span className="font-medium text-xs md:text-base hidden sm:inline">Study</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('quiz');
                setQuizMode(null);
                setQuizComplete(false);
              }}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all ${
                activeSection === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Trophy className="w-5 h-5 md:w-4 md:h-4" />
              <span className="font-medium text-xs md:text-base hidden sm:inline">Quiz</span>
            </button>
            <button
              onClick={() => setActiveSection('statistics')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all ${
                activeSection === 'statistics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5 md:w-4 md:h-4" />
              <span className="font-medium text-xs md:text-base hidden sm:inline">Stats</span>
            </button>

            {/* More Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2 rounded-md transition-all ${
                  ['modules', 'vocabulary', 'phrases', 'tonesandhi'].includes(activeSection)
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MoreHorizontal className="w-5 h-5 md:w-4 md:h-4" />
                <span className="font-medium text-xs md:text-base hidden sm:inline">More</span>
                <ChevronDown className={`w-4 h-4 transition-transform hidden sm:inline ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showMoreMenu && (
                <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
                  <button
                    onClick={() => {
                      setActiveSection('modules');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors text-left ${
                      activeSection === 'modules' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span className="font-medium">Learning Modules</span>
                    {learningModules.length > 0 && (
                      <span className="ml-auto text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                        {learningModules.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('vocabulary');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors text-left ${
                      activeSection === 'vocabulary' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <BookMarked className="w-5 h-5" />
                    <span className="font-medium">Vocabulary Lists</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('phrases');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors text-left ${
                      activeSection === 'phrases' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">Common Phrases</span>
                  </button>

                  {/* Tone Sandhi Trainer */}
                  <button
                    onClick={() => {
                      setActiveSection('tonesandhi');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors text-left ${
                      activeSection === 'tonesandhi' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-medium">Tone Sandhi Trainer</span>
                  </button>

                  {/* Sentence Builder */}
                  <button
                    onClick={() => {
                      setActiveSection('sentencebuilder');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors text-left ${
                      activeSection === 'sentencebuilder' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <Target className="w-5 h-5" />
                    <span className="font-medium">Sentence Builder</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Translation Card */}
        {activeSection === 'translator' && (
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Language Selector */}
          <div className="bg-gray-50 p-3 md:p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 md:gap-4">
                <label className="text-xs md:text-sm text-gray-600 whitespace-nowrap">From:</label>
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
                  className="flex-1 sm:flex-none px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg font-medium text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="english">English</option>
                  <option value="mandarin">Mandarin (中文)</option>
                  <option value="taiwanese">Taiwanese (台語)</option>
                </select>
              </div>

              <button
                onClick={swapLanguages}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors self-center"
                title="Switch language"
              >
                <ArrowLeftRight className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center gap-2 md:gap-4">
                <label className="text-xs md:text-sm text-gray-600 whitespace-nowrap">To:</label>
                <span className="font-medium text-sm md:text-base text-gray-700 px-2 md:px-3 py-1.5 md:py-2">
                  {sourceLanguage === 'taiwanese' ? 'English' : 'Taiwanese (台語)'}
                </span>
              </div>
            </div>
          </div>

          {/* Translation Layout - changes based on direction */}
          <div className={`grid ${sourceLanguage === 'english' ? 'md:grid-cols-3' : 'md:grid-cols-2'} md:divide-x divide-y md:divide-y-0`}>
            {/* Input Column */}
            <div className={`p-4 md:p-6 ${sourceLanguage === 'mandarin' ? 'bg-amber-50' : ''}`}>
              <h3 className={`text-sm md:text-base font-medium mb-2 ${sourceLanguage === 'mandarin' ? 'text-amber-700' : 'text-gray-700'}`}>
                {sourceLanguage === 'english' ? 'English Input' : sourceLanguage === 'mandarin' ? 'Mandarin Input (中文)' : 'Taiwanese Input'}
              </h3>
              <div className="mb-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Enter ${sourceLanguage === 'english' ? 'English' : sourceLanguage === 'mandarin' ? 'Mandarin' : 'Taiwanese'} text...`}
                  className="w-full h-28 md:h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm md:text-base"
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
                className="w-full bg-indigo-600 text-white py-2.5 md:py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
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
        )}

        {/* Common Phrases Section */}
        {activeSection === 'phrases' && (
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="w-full p-4 flex items-center gap-2 bg-gray-50">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-800">Common Phrases</span>
          </div>

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
        </div>
        )}

        {/* Tone Sandhi Trainer Section */}
        {activeSection === 'tonesandhi' && (
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="w-full p-4 md:p-6 flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Tone Sandhi Trainer</h2>
              <p className="text-xs md:text-sm text-gray-600">Practice tone changes in compound words</p>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {/* Level Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Difficulty Level</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => changeToneSandhiLevel('beginner')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    toneSandhiLevel === 'beginner'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌱 Beginner
                  <div className="text-xs opacity-75 mt-1">
                    {toneSandhiProgress.beginner.length}/{toneSandhiExercises.beginner.length}
                  </div>
                </button>
                <button
                  onClick={() => changeToneSandhiLevel('intermediate')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    toneSandhiLevel === 'intermediate'
                      ? 'bg-yellow-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⚡ Intermediate
                  <div className="text-xs opacity-75 mt-1">
                    {toneSandhiProgress.intermediate.length}/{toneSandhiExercises.intermediate.length}
                  </div>
                </button>
                <button
                  onClick={() => changeToneSandhiLevel('advanced')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    toneSandhiLevel === 'advanced'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔥 Advanced
                  <div className="text-xs opacity-75 mt-1">
                    {toneSandhiProgress.advanced.length}/{toneSandhiExercises.advanced.length}
                  </div>
                </button>
              </div>
            </div>

            {/* Current Exercise */}
            {getCurrentExercise() && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 md:p-6 mb-6 border border-purple-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-purple-700 font-medium">
                    Exercise {currentExerciseIndex + 1} of {getCurrentExercises().length}
                  </div>
                  {toneSandhiProgress[toneSandhiLevel].includes(getCurrentExercise().id) && (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </div>

                {/* Compound Word Display */}
                <div className="bg-white rounded-lg p-4 md:p-6 mb-4 shadow-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Compound Word</div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                      {getCurrentExercise().compound.han}
                    </div>
                    <div className="text-lg md:text-xl text-purple-600 font-medium mb-1">
                      {getCurrentExercise().compound.tailo}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {getCurrentExercise().compound.english}
                    </div>
                    <div className="text-xs text-gray-500">
                      Mandarin: {getCurrentExercise().compound.mandarin}
                    </div>
                    <button
                      onClick={() => playToneSandhiAudio(getCurrentExercise().compound.tailo, 'compound')}
                      className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Volume2 className={`w-4 h-4 ${playingAudioType === 'compound' ? 'animate-pulse' : ''}`} />
                      Play Compound Word
                    </button>
                  </div>
                </div>

                {/* Toggle Breakdown Button */}
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full mb-4 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {showBreakdown ? '🔼 Hide' : '🔽 Show'} Individual Characters
                </button>

                {/* Individual Characters Breakdown */}
                {showBreakdown && (
                  <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm mb-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 text-center">
                      Individual Character Tones
                    </div>
                    <div className="grid gap-3">
                      {getCurrentExercise().characters.map((char, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <div className="text-2xl font-bold text-gray-800 mb-1">{char.han}</div>
                            <div className="text-sm text-purple-600 font-medium mb-1">{char.tailo}</div>
                            <div className="text-xs text-gray-600">{char.english}</div>
                          </div>
                          <button
                            onClick={() => playToneSandhiAudio(char.tailo, idx)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Volume2 className={`w-3 h-3 ${playingAudioType === idx ? 'animate-pulse' : ''}`} />
                            Play
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tone Sandhi Rule Explanation */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold text-lg">💡</span>
                    <div>
                      <div className="text-xs font-semibold text-yellow-800 mb-1">Tone Sandhi Rule:</div>
                      <p className="text-sm text-gray-700">{getCurrentExercise().rule}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Category: {getCurrentExercise().category}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mark as Complete Button */}
                {!toneSandhiProgress[toneSandhiLevel].includes(getCurrentExercise().id) && (
                  <button
                    onClick={() => markExerciseComplete(toneSandhiLevel, getCurrentExercise().id)}
                    className="w-full mt-4 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Complete
                  </button>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-2">
              <button
                onClick={previousExercise}
                disabled={currentExerciseIndex === 0}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                ← Previous
              </button>
              <button
                onClick={nextExercise}
                disabled={currentExerciseIndex === getCurrentExercises().length - 1}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Next →
              </button>
            </div>

            {/* Progress Summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 mb-2">📊 Your Progress</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Beginner</div>
                  <div className="text-lg font-bold text-green-600">
                    {toneSandhiProgress.beginner.length}/{toneSandhiExercises.beginner.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Intermediate</div>
                  <div className="text-lg font-bold text-yellow-600">
                    {toneSandhiProgress.intermediate.length}/{toneSandhiExercises.intermediate.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Advanced</div>
                  <div className="text-lg font-bold text-red-600">
                    {toneSandhiProgress.advanced.length}/{toneSandhiExercises.advanced.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Vocabulary Lists Section */}
        {activeSection === 'vocabulary' && (
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="w-full p-4 flex items-center gap-2 bg-gray-50">
            <Library className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-800">Vocabulary Lists</span>
          </div>

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
        </div>
        )}

        {/* Sentence Builder Section */}
        {activeSection === 'sentencebuilder' && (
          <div className="mt-6">
            <SentenceBuilder />
          </div>
        )}

        {/* Flashcards Section */}
        {activeSection === 'flashcards' && (
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="w-full p-4 flex items-center gap-2 bg-gray-50">
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => reviewCard('again')}
                          className="py-2 px-3 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
                        >
                          😞 Again
                          <span className="block text-xs opacity-75">1 day</span>
                        </button>
                        <button
                          onClick={() => reviewCard('hard')}
                          className="py-2 px-3 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors"
                        >
                          😓 Hard
                          <span className="block text-xs opacity-75">3 days</span>
                        </button>
                        <button
                          onClick={() => reviewCard('good')}
                          className="py-2 px-3 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors"
                        >
                          😊 Good
                          <span className="block text-xs opacity-75">7 days</span>
                        </button>
                        <button
                          onClick={() => reviewCard('easy')}
                          className="py-2 px-3 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors"
                        >
                          😄 Easy
                          <span className="block text-xs opacity-75">14 days</span>
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
        </div>
        )}

        {/* Learning Modules Section */}
        {activeSection === 'modules' && (
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="w-full p-4 flex items-center gap-2 bg-gray-50">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-800">Contextual Learning Modules</span>
            <span className="text-xs text-gray-500">({learningModules.length} modules)</span>
          </div>

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
        </div>
        )}

        {/* Study Session Timer */}
        {activeSection === 'study' && (
          <div className="mt-4 md:mt-6">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 md:p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-8 h-8 md:w-10 md:h-10" />
                  <h2 className="text-xl md:text-2xl font-bold">Study Session Timer</h2>
                </div>
                <p className="text-sm md:text-base text-green-100">Focus your learning with timed study sessions</p>
              </div>

              <div className="p-4 md:p-6">
                {!studyTimer.isActive ? (
                  /* Timer Setup */
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Study Duration</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <button
                          onClick={() => startStudySession(15)}
                          className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Timer className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-2xl font-bold">15</div>
                          <div className="text-sm">minutes</div>
                        </button>
                        <button
                          onClick={() => startStudySession(30)}
                          className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-4 rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Timer className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-2xl font-bold">30</div>
                          <div className="text-sm">minutes</div>
                        </button>
                        <button
                          onClick={() => startStudySession(45)}
                          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Timer className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-2xl font-bold">45</div>
                          <div className="text-sm">minutes</div>
                        </button>
                        <button
                          onClick={() => startStudySession(60)}
                          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Timer className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-2xl font-bold">60</div>
                          <div className="text-sm">minutes</div>
                        </button>
                        {/* Custom Time Input */}
                        <div className="bg-white border-2 border-gray-300 p-2 rounded-lg flex flex-col justify-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={customTimerInput}
                            onChange={(e) => setCustomTimerInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                startCustomStudySession();
                              }
                            }}
                            placeholder="Custom"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:border-indigo-500 text-lg font-bold"
                          />
                          <button
                            onClick={startCustomStudySession}
                            disabled={!customTimerInput}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            Start
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Study Activity (Optional)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                          onClick={() => {
                            startStudySession(30, 'flashcards');
                            setActiveSection('flashcards');
                          }}
                          className="bg-white border-2 border-purple-200 p-4 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all"
                        >
                          <CreditCard className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                          <div className="text-sm font-medium text-gray-800">Flashcards</div>
                        </button>
                        <button
                          onClick={() => {
                            startStudySession(30, 'quiz');
                            setActiveSection('quiz');
                          }}
                          className="bg-white border-2 border-amber-200 p-4 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all"
                        >
                          <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                          <div className="text-sm font-medium text-gray-800">Quiz</div>
                        </button>
                        <button
                          onClick={() => {
                            startStudySession(30, 'lessons');
                            setActiveSection('lessons');
                          }}
                          className="bg-white border-2 border-blue-200 p-4 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                          <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                          <div className="text-sm font-medium text-gray-800">Lessons</div>
                        </button>
                        <button
                          onClick={() => startStudySession(30, 'free')}
                          className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
                        >
                          <Languages className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                          <div className="text-sm font-medium text-gray-800">Free Study</div>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Select an activity to start a 30-minute session, or choose a duration above for free study
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <Flame className="w-5 h-5" />
                        Your Study Stats
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {statistics.studySessions?.totalSessions || 0}
                          </div>
                          <div className="text-xs text-gray-600">Total Sessions</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {statistics.studySessions?.currentStreak || 0}
                          </div>
                          <div className="text-xs text-gray-600">Day Streak</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {statistics.overall?.totalTimeStudied || 0}
                          </div>
                          <div className="text-xs text-gray-600">Minutes Studied</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {statistics.studySessions?.longestStreak || 0}
                          </div>
                          <div className="text-xs text-gray-600">Longest Streak</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active Timer */
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-green-100 to-teal-100 border-8 border-green-500 mb-6">
                        <div>
                          <div className="text-5xl md:text-7xl font-bold text-green-700">
                            {formatTime(studyTimer.timeRemaining)}
                          </div>
                          <div className="text-sm md:text-base text-green-600 mt-2">
                            {studyTimer.activityType === 'flashcards' && 'Flashcard Study'}
                            {studyTimer.activityType === 'quiz' && 'Quiz Practice'}
                            {studyTimer.activityType === 'lessons' && 'Lesson Study'}
                            {studyTimer.activityType === 'free' && 'Free Study'}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                        <div
                          className="bg-gradient-to-r from-green-500 to-teal-500 h-3 rounded-full transition-all duration-1000"
                          style={{
                            width: `${((studyTimer.duration - studyTimer.timeRemaining) / studyTimer.duration) * 100}%`
                          }}
                        ></div>
                      </div>

                      {/* Timer Controls */}
                      <div className="flex gap-3 justify-center mb-6">
                        {!studyTimer.isPaused ? (
                          <button
                            onClick={pauseStudySession}
                            className="flex items-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <Pause className="w-5 h-5" />
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={resumeStudySession}
                            className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <Play className="w-5 h-5" />
                            Resume
                          </button>
                        )}
                        <button
                          onClick={stopStudySession}
                          className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg font-medium"
                        >
                          <Square className="w-5 h-5" />
                          End Session
                        </button>
                      </div>

                      {/* Session Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-gray-700">
                              {Math.floor((studyTimer.duration - studyTimer.timeRemaining) / 60)}
                            </div>
                            <div className="text-xs text-gray-600">Minutes Studied</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-700">
                              {studyTimer.cardsReviewed}
                            </div>
                            <div className="text-xs text-gray-600">Cards Reviewed</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-700">
                              {studyTimer.quizzesTaken}
                            </div>
                            <div className="text-xs text-gray-600">Quizzes Taken</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quiz Section */}
        {activeSection === 'quiz' && (
          <div className="mt-4 md:mt-6">
            {!quizMode ? (
              /* Quiz Mode Selection */
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 md:p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 md:w-10 md:h-10" />
                    <h2 className="text-xl md:text-2xl font-bold">Quiz Time!</h2>
                  </div>
                  <p className="text-sm md:text-base text-amber-100">Test your knowledge with interactive quizzes</p>
                </div>

                <div className="p-4 md:p-6">
                  {flashcards.length < 4 ? (
                    <div className="text-center py-8 md:py-12">
                      <Trophy className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-base md:text-lg text-gray-600 mb-2">You need at least 4 flashcards to take a quiz</p>
                      <p className="text-sm md:text-base text-gray-500">Add more flashcards by saving translations or studying lessons!</p>
                      <button
                        onClick={() => setActiveSection('translator')}
                        className="mt-4 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base font-medium"
                      >
                        Go to Translator
                      </button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                      {/* Translation Quiz */}
                      <div className="border-2 border-blue-200 rounded-lg p-4 md:p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => generateQuizQuestions('translation', 10)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Languages className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                          </div>
                          <h3 className="text-base md:text-lg font-bold text-gray-800">Translation Quiz</h3>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 mb-4">
                          Translate English or Mandarin phrases into Taiwanese
                        </p>
                        <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
                          <span>📝 Multiple choice</span>
                          <span>{Math.min(10, flashcards.length)} questions</span>
                        </div>
                      </div>

                      {/* Listening Quiz */}
                      <div className="border-2 border-purple-200 rounded-lg p-4 md:p-6 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => generateQuizQuestions('listening', 10)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                          </div>
                          <h3 className="text-base md:text-lg font-bold text-gray-800">Listening Quiz</h3>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 mb-4">
                          Listen to Taiwanese audio and identify the meaning
                        </p>
                        <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
                          <span>🎧 Audio comprehension</span>
                          <span>{Math.min(10, flashcards.length)} questions</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : quizComplete ? (
              /* Quiz Results */
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className={`p-4 md:p-6 text-white ${quizScore.correct / quizScore.total >= 0.8 ? 'bg-gradient-to-r from-green-600 to-emerald-600' : quizScore.correct / quizScore.total >= 0.6 ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-amber-600 to-orange-600'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 md:w-10 md:h-10" />
                    <h2 className="text-xl md:text-2xl font-bold">Quiz Complete!</h2>
                  </div>
                  <p className="text-sm md:text-base opacity-90">Here are your results</p>
                </div>

                <div className="p-6 md:p-8 text-center">
                  <div className="mb-6 md:mb-8">
                    <div className="text-4xl md:text-6xl font-bold text-gray-800 mb-2">
                      {quizScore.correct} / {quizScore.total}
                    </div>
                    <div className="text-lg md:text-xl text-gray-600">
                      {Math.round((quizScore.correct / quizScore.total) * 100)}% Correct
                    </div>
                  </div>

                  <div className="mb-6 md:mb-8">
                    {quizScore.correct / quizScore.total >= 0.8 ? (
                      <div className="text-base md:text-lg text-green-700">
                        <CheckCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 text-green-600" />
                        <p className="font-semibold">Excellent work! 🎉</p>
                        <p className="text-sm md:text-base text-gray-600 mt-1">You're mastering Taiwanese!</p>
                      </div>
                    ) : quizScore.correct / quizScore.total >= 0.6 ? (
                      <div className="text-base md:text-lg text-blue-700">
                        <CheckCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 text-blue-600" />
                        <p className="font-semibold">Good job! 👍</p>
                        <p className="text-sm md:text-base text-gray-600 mt-1">Keep practicing to improve</p>
                      </div>
                    ) : (
                      <div className="text-base md:text-lg text-amber-700">
                        <XCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 text-amber-600" />
                        <p className="font-semibold">Keep trying! 💪</p>
                        <p className="text-sm md:text-base text-gray-600 mt-1">Review your flashcards and try again</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => generateQuizQuestions(quizMode, 10)}
                      className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base font-medium"
                    >
                      <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                      Try Again
                    </button>
                    <button
                      onClick={restartQuiz}
                      className="px-4 md:px-6 py-2 md:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm md:text-base font-medium"
                    >
                      Back to Menu
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Quiz Questions */
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 md:p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                      <h2 className="text-base md:text-lg font-bold">
                        {quizMode === 'translation' ? 'Translation Quiz' : 'Listening Quiz'}
                      </h2>
                    </div>
                    <button
                      onClick={restartQuiz}
                      className="text-xs md:text-sm text-white hover:text-indigo-100 transition-colors"
                    >
                      Exit Quiz
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                    <span>Score: {quizScore.correct} / {currentQuestionIndex + (showFeedback ? 1 : 0)}</span>
                  </div>
                  <div className="mt-2 bg-white bg-opacity-20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {quizQuestions[currentQuestionIndex] && (
                    <>
                      <div className="mb-6 md:mb-8">
                        <p className="text-xs md:text-sm text-gray-500 mb-2">
                          {quizMode === 'translation' ? 'Translate to Taiwanese:' : 'What does this mean?'}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                              {quizQuestions[currentQuestionIndex].question}
                            </h3>
                          </div>
                          {quizMode === 'listening' && quizQuestions[currentQuestionIndex].romanization && (
                            <button
                              onClick={() => playFlashcardAudio(quizQuestions[currentQuestionIndex].romanization)}
                              className="p-2 md:p-2.5 bg-indigo-100 hover:bg-indigo-200 rounded-full transition-colors flex-shrink-0"
                              disabled={isSpeaking}
                            >
                              <Volume2 className={`w-5 h-5 md:w-6 md:h-6 text-indigo-600 ${isSpeaking ? 'animate-pulse' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6 md:mb-8">
                        {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                          const isSelected = selectedAnswer === option;
                          const isCorrect = option === quizQuestions[currentQuestionIndex].correctAnswer;
                          const showAsCorrect = showFeedback && isCorrect;
                          const showAsWrong = showFeedback && isSelected && !isCorrect;
                          const optionWithRomanization = quizQuestions[currentQuestionIndex].optionsWithRomanization?.find(opt => opt.text === option);

                          return (
                            <button
                              key={idx}
                              onClick={() => handleAnswerSelect(option)}
                              disabled={showFeedback}
                              className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all text-sm md:text-base ${
                                showAsCorrect
                                  ? 'border-green-500 bg-green-50 text-green-800'
                                  : showAsWrong
                                  ? 'border-red-500 bg-red-50 text-red-800'
                                  : isSelected
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                  : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
                              } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div>{option}</div>
                                  {optionWithRomanization?.romanization && (
                                    <div className={`text-xs md:text-sm mt-1 font-mono ${
                                      showAsCorrect ? 'text-green-600' : showAsWrong ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      {optionWithRomanization.romanization}
                                    </div>
                                  )}
                                </div>
                                {showAsCorrect && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />}
                                {showAsWrong && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 ml-2" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        {!showFeedback ? (
                          <button
                            onClick={submitAnswer}
                            disabled={!selectedAnswer}
                            className="w-full sm:flex-1 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm md:text-base font-medium"
                          >
                            Submit Answer
                          </button>
                        ) : (
                          <button
                            onClick={nextQuestion}
                            className="w-full sm:flex-1 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base font-medium"
                          >
                            {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question →' : 'See Results'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Dashboard Section */}
        {activeSection === 'statistics' && (
          <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
            {/* Daily Challenge Card */}
            <div className={`bg-white rounded-lg shadow-xl overflow-hidden border-2 ${
              dailyChallenge.completed ? 'border-green-400' : 'border-indigo-200'
            }`}>
              <div className={`bg-gradient-to-r ${dailyChallenge.color} p-4 md:p-6 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="text-3xl md:text-4xl">{dailyChallenge.icon}</div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold">Daily Challenge</h3>
                      <p className="text-xs md:text-sm opacity-90">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {dailyChallenge.completed && (
                    <div className="bg-white bg-opacity-20 rounded-full p-2 md:p-3">
                      <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="mb-4">
                  <h4 className="text-base md:text-lg font-bold text-gray-800 mb-1">{dailyChallenge.title}</h4>
                  <p className="text-sm md:text-base text-gray-600">{dailyChallenge.description}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                    <span className="font-medium text-gray-700">Progress</span>
                    <span className="font-bold text-gray-900">
                      {dailyChallenge.progress} / {dailyChallenge.goal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 md:h-4">
                    <div
                      className={`bg-gradient-to-r ${dailyChallenge.color} h-3 md:h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-1`}
                      style={{ width: `${(dailyChallenge.progress / dailyChallenge.goal) * 100}%` }}
                    >
                      {dailyChallenge.progress > 0 && (
                        <span className="text-white text-xs font-bold">
                          {Math.round((dailyChallenge.progress / dailyChallenge.goal) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reward */}
                <div className={`p-3 md:p-4 rounded-lg ${
                  dailyChallenge.completed
                    ? 'bg-green-50 border-2 border-green-400'
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className={`w-4 h-4 md:w-5 md:h-5 ${
                        dailyChallenge.completed ? 'text-green-600' : 'text-gray-500'
                      }`} />
                      <span className={`text-xs md:text-sm font-medium ${
                        dailyChallenge.completed ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        Reward: {dailyChallenge.reward}
                      </span>
                    </div>
                    {dailyChallenge.completed && (
                      <span className="text-xs md:text-sm font-bold text-green-700">
                        ✓ Claimed!
                      </span>
                    )}
                  </div>
                </div>

                {dailyChallenge.completed && dailyChallenge.completedAt && (
                  <div className="mt-3 text-center">
                    <p className="text-xs md:text-sm text-gray-500">
                      Completed at {new Date(dailyChallenge.completedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Header */}
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 md:p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-8 h-8 md:w-10 md:h-10" />
                  <h2 className="text-xl md:text-2xl font-bold">Learning Statistics</h2>
                </div>
                <p className="text-sm md:text-base text-purple-100">Track your progress and achievements</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-4 md:p-6">
                {/* Study Streak */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-3 md:p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <Flame className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                    <span className="text-xs md:text-sm text-gray-600">Day Streak</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-orange-700">
                    {statistics.studySessions.currentStreak}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Best: {statistics.studySessions.longestStreak} days
                  </div>
                </div>

                {/* Total Flashcards */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                    <span className="text-xs md:text-sm text-gray-600">Flashcards</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-700">
                    {flashcards.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {statistics.flashcards.totalReviews} reviews
                  </div>
                </div>

                {/* Quiz Score */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 md:p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                    <span className="text-xs md:text-sm text-gray-600">Quiz Avg</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-green-700">
                    {statistics.quizzes.totalQuestions > 0
                      ? Math.round((statistics.quizzes.totalCorrect / statistics.quizzes.totalQuestions) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {statistics.quizzes.totalQuizzes} quizzes
                  </div>
                </div>

                {/* Total Study Sessions */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 md:p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                    <span className="text-xs md:text-sm text-gray-600">Sessions</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-purple-700">
                    {statistics.studySessions.totalSessions}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Total study days
                  </div>
                </div>
              </div>
            </div>

            {/* Flashcard Performance */}
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                Flashcard Performance
              </h3>

              {/* Flashcard Status Distribution */}
              <div className="mb-6">
                <p className="text-sm md:text-base text-gray-600 mb-3">Cards by Status</p>
                <div className="space-y-2">
                  {['learning', 'known', 'mastered'].map(status => {
                    const count = flashcards.filter(c => c.status === status).length;
                    const percentage = flashcards.length > 0 ? (count / flashcards.length) * 100 : 0;
                    const colors = {
                      learning: 'bg-orange-500',
                      known: 'bg-blue-500',
                      mastered: 'bg-green-500'
                    };
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-xs md:text-sm mb-1">
                          <span className="capitalize text-gray-700">{status}</span>
                          <span className="font-medium text-gray-900">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${colors[status]} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Rating Distribution */}
              <div>
                <p className="text-sm md:text-base text-gray-600 mb-3">Review Performance</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                  {[
                    { rating: 'again', label: 'Again', color: 'bg-gray-100 text-gray-700', emoji: '😞' },
                    { rating: 'hard', label: 'Hard', color: 'bg-orange-100 text-orange-700', emoji: '😓' },
                    { rating: 'good', label: 'Good', color: 'bg-blue-100 text-blue-700', emoji: '😊' },
                    { rating: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700', emoji: '😄' }
                  ].map(({ rating, label, color, emoji }) => (
                    <div key={rating} className={`${color} p-3 rounded-lg text-center`}>
                      <div className="text-xl md:text-2xl mb-1">{emoji}</div>
                      <div className="font-bold text-lg md:text-xl">
                        {statistics.flashcards.byRating[rating] || 0}
                      </div>
                      <div className="text-xs opacity-75">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quiz Performance */}
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                Quiz Performance
              </h3>

              {statistics.quizzes.totalQuizzes === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 opacity-30" />
                  <p className="text-sm md:text-base">No quizzes taken yet. Take your first quiz to see statistics!</p>
                </div>
              ) : (
                <>
                  {/* Quiz Mode Comparison */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {Object.entries(statistics.quizzes.byMode).map(([mode, data]) => {
                      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                      return (
                        <div key={mode} className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm md:text-base font-medium text-gray-700 capitalize">{mode}</span>
                            {mode === 'translation' ? <Languages className="w-5 h-5 text-indigo-600" /> : <Volume2 className="w-5 h-5 text-purple-600" />}
                          </div>
                          <div className="text-2xl md:text-3xl font-bold text-indigo-700 mb-1">{accuracy}%</div>
                          <div className="text-xs text-gray-600">
                            {data.correct}/{data.total} correct • {data.quizzes} quizzes
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recent Quiz History */}
                  <div>
                    <p className="text-sm md:text-base text-gray-600 mb-3">Recent Quizzes</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {statistics.quizzes.history.slice(0, 10).map((quiz, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2 md:gap-3 flex-1">
                            {quiz.mode === 'translation' ? (
                              <Languages className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 flex-shrink-0" />
                            ) : (
                              <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs md:text-sm font-medium text-gray-700 capitalize truncate">{quiz.mode} Quiz</div>
                              <div className="text-xs text-gray-500">{new Date(quiz.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            <span className="text-xs md:text-sm text-gray-600">{quiz.score}/{quiz.total}</span>
                            <span className={`text-sm md:text-base font-bold ${
                              quiz.percentage >= 80 ? 'text-green-600' : quiz.percentage >= 60 ? 'text-blue-600' : 'text-orange-600'
                            }`}>
                              {quiz.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Achievements & Milestones */}
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                Achievements & Milestones
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {[
                  {
                    achieved: flashcards.length >= 10,
                    title: 'First 10 Cards',
                    description: 'Create 10 flashcards',
                    icon: '🎯',
                    progress: Math.min(flashcards.length, 10),
                    total: 10
                  },
                  {
                    achieved: flashcards.length >= 50,
                    title: 'Card Collector',
                    description: 'Create 50 flashcards',
                    icon: '📚',
                    progress: Math.min(flashcards.length, 50),
                    total: 50
                  },
                  {
                    achieved: statistics.studySessions.currentStreak >= 7,
                    title: 'Week Warrior',
                    description: '7-day study streak',
                    icon: '🔥',
                    progress: Math.min(statistics.studySessions.currentStreak, 7),
                    total: 7
                  },
                  {
                    achieved: statistics.quizzes.totalQuizzes >= 10,
                    title: 'Quiz Master',
                    description: 'Complete 10 quizzes',
                    icon: '🏆',
                    progress: Math.min(statistics.quizzes.totalQuizzes, 10),
                    total: 10
                  },
                  {
                    achieved: statistics.flashcards.totalReviews >= 100,
                    title: 'Dedicated Learner',
                    description: '100 card reviews',
                    icon: '⭐',
                    progress: Math.min(statistics.flashcards.totalReviews, 100),
                    total: 100
                  },
                  {
                    achieved: flashcards.filter(c => c.status === 'mastered').length >= 20,
                    title: 'Master Scholar',
                    description: '20 mastered cards',
                    icon: '👑',
                    progress: Math.min(flashcards.filter(c => c.status === 'mastered').length, 20),
                    total: 20
                  }
                ].map((achievement, idx) => (
                  <div
                    key={idx}
                    className={`p-3 md:p-4 rounded-lg border-2 ${
                      achievement.achieved
                        ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-400'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl md:text-3xl">{achievement.icon}</div>
                      {achievement.achieved && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="font-bold text-sm md:text-base text-gray-800 mb-1">{achievement.title}</div>
                    <div className="text-xs text-gray-600 mb-2">{achievement.description}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {achievement.progress}/{achievement.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lessons Section */}
        {activeSection === 'lessons' && (
          <div className="mt-6">
            {!selectedLesson ? (
              /* Units Page */
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 md:p-6 text-white">
                  <h2 className="text-xl md:text-2xl font-bold mb-2">Taiwanese Learning Curriculum</h2>
                  <p className="text-sm md:text-base text-indigo-100">Choose a unit and lesson to begin your learning journey</p>
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {/* Unit 1 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 md:p-4 border-b border-gray-200">
                      <h3 className="text-base md:text-lg font-bold text-indigo-900">Unit 1: Greetings and Basic Politeness</h3>
                      <p className="text-xs md:text-sm text-indigo-700 mt-1">Learn essential greetings and polite expressions</p>
                      <div className="flex items-center gap-3 md:gap-4 mt-2 text-xs text-indigo-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Beginner
                        </span>
                        <span>4 lessons</span>
                      </div>
                    </div>
                    <div className="p-3 md:p-4 bg-white">
                      <h4 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 md:mb-3">Lessons:</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => setSelectedLesson('unit-01-lesson-01')}
                          className="w-full text-left px-3 md:px-4 py-3 rounded-md bg-gray-50 hover:bg-indigo-50 active:bg-indigo-100 hover:border-indigo-200 border border-gray-200 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                1
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm md:text-base text-gray-900 group-hover:text-indigo-600 truncate sm:whitespace-normal">Basics: Greetings & Introductions</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Essential greetings, introductions, and politeness basics</div>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transform -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                        <button
                          onClick={() => setSelectedLesson('unit-01-lesson-02')}
                          className="w-full text-left px-3 md:px-4 py-3 rounded-md bg-gray-50 hover:bg-indigo-50 active:bg-indigo-100 hover:border-indigo-200 border border-gray-200 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                2
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm md:text-base text-gray-900 group-hover:text-indigo-600 truncate sm:whitespace-normal">Wellbeing & Small Talk</div>
                                <div className="text-xs text-gray-500 hidden sm:block">How are you, checking in, making small talk</div>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transform -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                        <button
                          onClick={() => setSelectedLesson('unit-01-lesson-03')}
                          className="w-full text-left px-3 md:px-4 py-3 rounded-md bg-gray-50 hover:bg-indigo-50 active:bg-indigo-100 hover:border-indigo-200 border border-gray-200 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                3
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm md:text-base text-gray-900 group-hover:text-indigo-600 truncate sm:whitespace-normal">Requests & Offers</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Making requests, offering help, asking permission</div>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transform -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                        <button
                          onClick={() => setSelectedLesson('unit-01-lesson-04')}
                          className="w-full text-left px-3 md:px-4 py-3 rounded-md bg-gray-50 hover:bg-indigo-50 active:bg-indigo-100 hover:border-indigo-200 border border-gray-200 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                4
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm md:text-base text-gray-900 group-hover:text-indigo-600 truncate sm:whitespace-normal">Compliments & Gratitude</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Giving compliments, expressing gratitude, formal/informal</div>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transform -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unit 2 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-3 md:p-4 border-b border-gray-200">
                      <h3 className="text-base md:text-lg font-bold text-green-900">Unit 2: Numbers and Counting</h3>
                      <p className="text-xs md:text-sm text-green-700 mt-1">Master numbers, time, and shopping</p>
                      <div className="flex items-center gap-3 md:gap-4 mt-2 text-xs text-green-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Beginner
                        </span>
                        <span>3-4 lessons</span>
                      </div>
                    </div>
                    <div className="p-3 md:p-4 bg-white">
                      <h4 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 md:mb-3">Lessons:</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => setSelectedLesson('unit-02-lesson-01')}
                          className="w-full text-left px-3 md:px-4 py-3 rounded-md bg-gray-50 hover:bg-green-50 active:bg-green-100 hover:border-green-200 border border-gray-200 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                1
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm md:text-base text-gray-900 group-hover:text-green-600 truncate sm:whitespace-normal">Numbers and Counting</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Numbers 0-10,000, time, prices, and shopping</div>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-green-600 transform -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Placeholder for future units */}
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">More units and lessons coming soon...</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Lesson Viewer */
              <div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="mb-3 md:mb-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 active:text-indigo-800 font-medium py-2 px-1 text-sm md:text-base"
                >
                  <ChevronDown className="w-4 h-4 md:w-5 md:h-5 transform rotate-90" />
                  Back to Units
                </button>
                <LessonViewer lessonId={selectedLesson} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 pb-8">
          <p>Press Ctrl+Enter to translate • Powered by Claude</p>
        </div>
      </div>
    </div>
  );
}
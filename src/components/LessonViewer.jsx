import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ChevronLeft, ChevronRight, BookOpen, Check, X, BookmarkPlus, Mic, StopCircle } from 'lucide-react';

const LessonViewer = ({ lessonId }) => {
  const [lessonData, setLessonData] = useState(null);
  const [currentSection, setCurrentSection] = useState('overview');
  const [audioCache, setAudioCache] = useState({});
  const [playingAudio, setPlayingAudio] = useState(null);
  const [cachingAudio, setCachingAudio] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [matchingAnswers, setMatchingAnswers] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem(`lesson-${lessonId}-checklist`);
    return saved ? JSON.parse(saved) : {};
  });
  const [recording, setRecording] = useState(null);
  const [recordingWord, setRecordingWord] = useState(null);
  const [pronunciationFeedback, setPronunciationFeedback] = useState({});
  const [loadingFeedback, setLoadingFeedback] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState({});
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    // Load lesson data
    import(`../data/lessons/${lessonId}.json`)
      .then(module => setLessonData(module.default))
      .catch(err => console.error('Error loading lesson:', err));
  }, [lessonId]);

  useEffect(() => {
    // Pre-cache all audio for this lesson when it loads
    if (!lessonData) return;

    const cacheAudio = async () => {
      setCachingAudio(true);
      try {
        const response = await fetch(`/api/lessons/${lessonId}/cache-audio`, {
          method: 'POST'
        });
        const result = await response.json();
        console.log(`Audio pre-caching complete: ${result.cached}/${result.total_phrases} phrases cached`);
        if (result.failed > 0) {
          console.warn(`Failed to cache ${result.failed} phrases:`, result.failures);
        }
      } catch (error) {
        console.error('Error pre-caching audio:', error);
      } finally {
        setCachingAudio(false);
      }
    };

    cacheAudio();
  }, [lessonData, lessonId]);

  const toggleAnswer = (exerciseIdx, itemIdx) => {
    const key = `${exerciseIdx}-${itemIdx}`;
    setRevealedAnswers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isAnswerRevealed = (exerciseIdx, itemIdx) => {
    const key = `${exerciseIdx}-${itemIdx}`;
    return revealedAnswers[key] || false;
  };

  // Multiple-choice helpers
  const selectAnswer = (exerciseIdx, itemIdx, optionIdx) => {
    const key = `${exerciseIdx}-${itemIdx}`;
    setSelectedAnswers(prev => ({
      ...prev,
      [key]: optionIdx
    }));
  };

  const getSelectedAnswer = (exerciseIdx, itemIdx) => {
    const key = `${exerciseIdx}-${itemIdx}`;
    return selectedAnswers[key];
  };

  // Matching drag-and-drop helpers
  const handleDragStart = (e, answer) => {
    setDraggedItem(answer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, exerciseIdx, itemIdx) => {
    e.preventDefault();
    if (!draggedItem) return;

    const key = `${exerciseIdx}-${itemIdx}`;
    setMatchingAnswers(prev => ({
      ...prev,
      [key]: draggedItem
    }));
    setDraggedItem(null);
  };

  const getMatchingAnswer = (exerciseIdx, itemIdx) => {
    const key = `${exerciseIdx}-${itemIdx}`;
    return matchingAnswers[key];
  };

  const clearMatchingAnswer = (exerciseIdx, itemIdx) => {
    const key = `${exerciseIdx}-${itemIdx}`;
    setMatchingAnswers(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Create flashcards from exercises
  const toggleChecklistItem = (index) => {
    const newChecked = {
      ...checkedItems,
      [index]: !checkedItems[index]
    };
    setCheckedItems(newChecked);
    localStorage.setItem(`lesson-${lessonId}-checklist`, JSON.stringify(newChecked));
  };

  const startRecording = async (wordIndex) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        // Save recorded audio for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(prev => ({
          ...prev,
          [wordIndex]: audioUrl
        }));

        // Analyze pronunciation (gets fresh analysis each time)
        await analyzePronunciation(wordIndex, audioBlob);
      };

      mediaRecorder.start();
      setRecording(wordIndex);
      setRecordingWord(wordIndex);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(null);
    }
  };

  const analyzePronunciation = async (wordIndex, audioBlob) => {
    const word = lessonData.vocabulary[wordIndex];
    setLoadingFeedback(wordIndex);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('taiwanese', word.taiwanese);
      formData.append('romanization', word.romanization);
      formData.append('english', word.english);
      formData.append('mandarin', word.mandarin);

      const response = await fetch('/api/pronunciation-feedback', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to get feedback');

      const result = await response.json();
      setPronunciationFeedback(prev => ({
        ...prev,
        [wordIndex]: {
          transcription: result.transcription,
          feedback: result.feedback,
          score: result.score
        }
      }));
    } catch (error) {
      console.error('Error analyzing pronunciation:', error);
      setPronunciationFeedback(prev => ({
        ...prev,
        [wordIndex]: {
          feedback: 'Sorry, there was an error analyzing your pronunciation. Please try again.',
          score: null
        }
      }));
    } finally {
      setLoadingFeedback(null);
    }
  };

  const createFlashcardsFromExercises = () => {
    if (!lessonData?.exercises) return;

    // Load existing flashcards
    const existingFlashcards = JSON.parse(localStorage.getItem('flashcards') || '[]');
    const newCards = [];

    lessonData.exercises.forEach(exercise => {
      exercise.items.forEach(item => {
        // Create flashcard based on exercise type
        let front, back, tailo, mandarin;

        if (exercise.type === 'matching') {
          front = item.answer; // English
          back = item.taiwanese;
          tailo = item.romanization;
          mandarin = '';
        } else if (exercise.type === 'translation') {
          front = item.english;
          back = item.answer;
          tailo = item.romanization;
          mandarin = '';
        } else if (exercise.type === 'fill-in-blank') {
          front = item.hint;
          back = item.answer;
          tailo = item.romanization;
          mandarin = '';
        } else if (exercise.type === 'multiple-choice') {
          // Skip multiple choice for now as they're sentence-based
          return;
        }

        // Check if already exists
        const exists = existingFlashcards.some(card =>
          card.front === front && card.back === back
        );

        if (!exists && front && back && tailo) {
          const newCard = {
            id: Date.now() + newCards.length,
            front,
            back,
            tailo,
            mandarin,
            createdAt: new Date().toISOString(),
            lastReviewedAt: null,
            nextReviewAt: new Date().toISOString(),
            interval: 0,
            reviewCount: 0,
            status: 'learning'
          };
          newCards.push(newCard);
        }
      });
    });

    if (newCards.length > 0) {
      const updatedFlashcards = [...existingFlashcards, ...newCards];
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
      alert(`Added ${newCards.length} flashcard${newCards.length > 1 ? 's' : ''} from exercises!`);
    } else {
      alert('All exercise items are already in your flashcards!');
    }
  };

  const playAudio = async (romanization) => {
    try {
      setPlayingAudio(romanization);

      // Check cache first
      if (audioCache[romanization]) {
        const audio = new Audio(audioCache[romanization]);
        audio.onended = () => setPlayingAudio(null);
        audio.play();
        return;
      }

      // Fetch from backend
      const response = await fetch(`/api/audio?taibun=${encodeURIComponent(romanization)}`);
      if (!response.ok) throw new Error('Audio fetch failed');

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // Cache it
      setAudioCache(prev => ({ ...prev, [romanization]: audioUrl }));

      // Play it
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
    }
  };

  if (!lessonData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading lesson...</div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', name: 'Overview', icon: BookOpen },
    { id: 'vocabulary', name: 'Vocabulary' },
    { id: 'grammar', name: 'Grammar' },
    { id: 'dialogues', name: 'Dialogues' },
    { id: 'culture', name: 'Culture' },
    { id: 'exercises', name: 'Exercises' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{lessonData.title}</h2>
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {lessonData.level}
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
            {lessonData.duration}
          </span>
        </div>
        <p className="text-gray-700 text-lg">{lessonData.goal}</p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Learning Objectives</h3>
        <ul className="space-y-2">
          {lessonData.objectives.map((obj, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{obj}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Review Checklist</h3>
        <ul className="space-y-2">
          {lessonData.reviewChecklist.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <button
                onClick={() => toggleChecklistItem(idx)}
                className={`w-5 h-5 border-2 rounded mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors ${
                  checkedItems[idx]
                    ? 'bg-green-600 border-green-600'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {checkedItems[idx] && <Check className="w-4 h-4 text-white" />}
              </button>
              <span className={`text-gray-700 ${checkedItems[idx] ? 'line-through opacity-60' : ''}`}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderVocabulary = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Vocabulary ({lessonData.vocabulary.length} words)</h2>
        <button
          onClick={createFlashcardsFromExercises}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <BookmarkPlus className="w-5 h-5" />
          Create Flashcards
        </button>
      </div>
      <div className="grid gap-4">
        {lessonData.vocabulary.map((word, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-gray-800">{word.taiwanese}</span>
                  {word.audio && (
                    <>
                      <button
                        onClick={() => playAudio(word.romanization)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={playingAudio === word.romanization}
                      >
                        <Volume2 className={`w-5 h-5 ${playingAudio === word.romanization ? 'text-blue-600 animate-pulse' : 'text-gray-600'}`} />
                      </button>
                      <button
                        onClick={() => recording === idx ? stopRecording() : startRecording(idx)}
                        className={`p-1 rounded-full transition-colors ${
                          recording === idx
                            ? 'bg-red-100 hover:bg-red-200'
                            : 'hover:bg-orange-100'
                        }`}
                        title={recording === idx ? "Stop recording" : "Practice pronunciation"}
                      >
                        {recording === idx ? (
                          <StopCircle className="w-5 h-5 text-red-600 animate-pulse" />
                        ) : (
                          <Mic className="w-5 h-5 text-orange-600" />
                        )}
                      </button>
                    </>
                  )}
                </div>
                <div className="text-blue-600 font-mono mb-1">{word.romanization}</div>
                <div className="text-gray-600 mb-1">{word.mandarin} ({word.pinyin})</div>
                <div className="text-gray-800 font-medium">{word.english}</div>
                {word.notes && (
                  <div className="text-sm text-gray-500 mt-2 italic">{word.notes}</div>
                )}

                {/* Recording playback */}
                {recordedAudio[idx] && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="text-sm font-semibold text-purple-900 mb-2">Your Recording:</div>
                    <div className="flex items-center gap-3">
                      <audio controls src={recordedAudio[idx]} className="flex-1 h-8" />
                      <button
                        onClick={() => playAudio(word.romanization)}
                        className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                      >
                        Compare with Target
                      </button>
                    </div>
                  </div>
                )}

                {/* Pronunciation feedback */}
                {loadingFeedback === idx && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <div className="text-sm text-blue-800">Analyzing your pronunciation...</div>
                    </div>
                  </div>
                )}
                {pronunciationFeedback[idx] && loadingFeedback !== idx && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-green-900">🎯 AI Pronunciation Analysis</div>
                      {pronunciationFeedback[idx].score !== null && (
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          pronunciationFeedback[idx].score >= 80 ? 'bg-green-200 text-green-900' :
                          pronunciationFeedback[idx].score >= 60 ? 'bg-yellow-200 text-yellow-900' :
                          'bg-orange-200 text-orange-900'
                        }`}>
                          {pronunciationFeedback[idx].score}/100
                        </div>
                      )}
                    </div>
                    <div className="mb-2 text-xs text-gray-600">
                      Based on audio comparison (pitch, tone, rhythm)
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-line">{pronunciationFeedback[idx].feedback}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGrammar = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Grammar Points</h2>
      {lessonData.grammar.map((point, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">{point.title}</h3>
          <p className="text-gray-700 mb-4">{point.explanation}</p>

          {point.pattern && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="text-sm font-semibold text-blue-800 mb-1">Pattern:</div>
              <div className="font-mono text-blue-900">{point.pattern}</div>
            </div>
          )}

          {point.examples && point.examples.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Examples:</div>
              {point.examples.map((ex, exIdx) => (
                <div key={exIdx} className="bg-gray-50 rounded p-3">
                  <div className="text-lg text-gray-800 mb-1">{ex.taiwanese}</div>
                  <div className="text-blue-600 font-mono text-sm mb-1">{ex.romanization}</div>
                  <div className="text-gray-600 text-sm">{ex.english}</div>
                  {ex.breakdown && (
                    <div className="text-xs text-gray-500 mt-2">→ {ex.breakdown}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {point.notes && (
            <div className="mt-4 text-sm text-gray-600 italic bg-yellow-50 p-3 rounded">
              💡 {point.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderDialogues = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Dialogues</h2>
      {lessonData.dialogues.map((dialogue, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{dialogue.title}</h3>
          <p className="text-gray-600 mb-4 italic">{dialogue.scenario}</p>

          <div className="space-y-4">
            {dialogue.lines.map((line, lineIdx) => (
              <div key={lineIdx} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="text-sm font-semibold text-gray-600 mb-1">{line.speaker}:</div>
                <div className="flex items-start gap-2 mb-1">
                  <div className="text-lg text-gray-800">{line.taiwanese}</div>
                  {line.audio && (
                    <button
                      onClick={() => playAudio(line.romanization)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      disabled={playingAudio === line.romanization}
                    >
                      <Volume2 className={`w-4 h-4 ${playingAudio === line.romanization ? 'text-blue-600 animate-pulse' : 'text-gray-600'}`} />
                    </button>
                  )}
                </div>
                <div className="text-blue-600 font-mono text-sm mb-1">{line.romanization}</div>
                <div className="text-gray-600 text-sm">{line.english}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCulture = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Cultural Notes</h2>
      {lessonData.culturalNotes.map((note, idx) => (
        <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-purple-900 mb-3">{note.title}</h3>
          <p className="text-gray-700 leading-relaxed">{note.content}</p>
        </div>
      ))}
    </div>
  );

  const renderExercises = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Practice Exercises</h2>
      {lessonData.exercises.map((exercise, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 overflow-visible">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{exercise.title}</h3>
          <p className="text-gray-600 mb-4">{exercise.instructions}</p>

          {exercise.type === 'matching' && (
            <div className="flex gap-8 overflow-visible">
              {/* Left side: Taiwanese phrases with drop zones */}
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-gray-700 mb-2">Taiwanese Phrases</h4>
                {exercise.items.map((item, itemIdx) => {
                  const matched = getMatchingAnswer(idx, itemIdx);
                  const isCorrect = matched === item.answer;

                  return (
                    <div
                      key={itemIdx}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx, itemIdx)}
                      className={`p-2 rounded border-2 border-dashed transition-colors ${
                        matched
                          ? isCorrect
                            ? 'bg-green-50 border-green-400'
                            : 'bg-red-50 border-red-400'
                          : 'bg-gray-50 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-medium text-gray-800">{item.taiwanese}</span>
                        <span className="text-blue-600 font-mono text-xs">{item.romanization}</span>
                        {matched ? (
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {isCorrect ? '✓' : '✗'} {matched}
                            </span>
                            <button
                              onClick={() => clearMatchingAnswer(idx, itemIdx)}
                              className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs mt-1">Drop answer here</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right side: English answers (draggable) */}
              <div className="w-80 space-y-2 self-start" style={{ position: 'sticky', top: '140px' }}>
                <h4 className="font-medium text-gray-700 mb-2">Drag to Match</h4>
                <div className="flex flex-wrap gap-2">
                  {exercise.items
                    .map((item) => item.answer)
                    .sort(() => Math.random() - 0.5)
                    .map((answer, answerIdx) => {
                      const isUsed = Object.values(matchingAnswers).includes(answer);
                      return (
                        <div
                          key={answerIdx}
                          draggable={!isUsed}
                          onDragStart={(e) => handleDragStart(e, answer)}
                          className={`px-4 py-2 rounded cursor-move border ${
                            isUsed
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-blue-100 border-blue-300 hover:bg-blue-200 text-blue-900'
                          }`}
                        >
                          {answer}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {exercise.type === 'fill-in-blank' && (
            <div className="space-y-4">
              {exercise.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-gray-50 rounded p-4">
                  <div className="text-gray-800 mb-2">{item.prompt}</div>
                  <div className="text-sm text-gray-500 mb-2">Hint: {item.hint}</div>
                  {isAnswerRevealed(idx, itemIdx) ? (
                    <div className="text-green-700 font-medium">
                      ✓ {item.answer} <span className="text-blue-600 font-mono">({item.romanization})</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleAnswer(idx, itemIdx)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Show answer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {exercise.type === 'multiple-choice' && (
            <div className="space-y-4">
              {exercise.items.map((item, itemIdx) => {
                const selected = getSelectedAnswer(idx, itemIdx);
                const hasAnswered = selected !== undefined;

                return (
                  <div key={itemIdx} className="bg-gray-50 rounded p-4">
                    <div className="text-gray-800 font-medium mb-3">{item.question}</div>
                    <div className="space-y-2">
                      {item.options.map((option, optIdx) => {
                        const isSelected = selected === optIdx;
                        const showCorrect = hasAnswered && option.correct;
                        const showIncorrect = hasAnswered && isSelected && !option.correct;

                        return (
                          <button
                            key={optIdx}
                            onClick={() => !hasAnswered && selectAnswer(idx, itemIdx, optIdx)}
                            disabled={hasAnswered}
                            className={`w-full p-3 rounded border-2 text-left transition-colors ${
                              showCorrect
                                ? 'bg-green-100 border-green-400 cursor-default'
                                : showIncorrect
                                ? 'bg-red-100 border-red-400 cursor-default'
                                : hasAnswered
                                ? 'bg-white border-gray-200 cursor-default'
                                : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {showCorrect && <Check className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              {showIncorrect && <X className="w-5 h-5 text-red-600 flex-shrink-0" />}
                              <span className={showCorrect ? 'text-green-900 font-medium' : showIncorrect ? 'text-red-900' : ''}>
                                {option.text}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {hasAnswered && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-sm text-gray-700 italic">{item.explanation}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {exercise.type === 'translation' && (
            <div className="space-y-4">
              {exercise.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-gray-50 rounded p-4">
                  <div className="text-gray-800 mb-3">English: {item.english}</div>
                  {isAnswerRevealed(idx, itemIdx) ? (
                    <div>
                      <div className="text-lg font-medium text-green-700 mb-1">✓ Taiwanese: {item.answer}</div>
                      <div className="text-blue-600 font-mono text-sm">{item.romanization}</div>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleAnswer(idx, itemIdx)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Show answer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {exercise.type === 'role-play' && (
            <div className="space-y-4">
              {exercise.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded p-4 border border-blue-200">
                  <div className="text-gray-800 font-medium mb-2">{item.scenario}</div>
                  <div className="text-sm text-gray-600 mb-3">
                    Your role: {item.yourRole} | Partner role: {item.partnerRole}
                  </div>
                  <div className="space-y-1">
                    {item.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-start gap-2">
                        <span className="text-blue-600 font-semibold">{stepIdx + 1}.</span>
                        <span className="text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {lessonData.practiceActivities && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Practice Activities</h3>
          <div className="grid gap-4">
            {lessonData.practiceActivities.map((activity, idx) => (
              <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{activity.title}</h4>
                <p className="text-gray-700 mb-2">{activity.description}</p>
                <div className="text-sm text-gray-600 italic mb-3">Goal: {activity.goal}</div>
                {activity.title === "Flashcard Review" && (
                  <button
                    onClick={createFlashcardsFromExercises}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <BookmarkPlus className="w-5 h-5" />
                    Create Flashcards from Exercises
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'overview': return renderOverview();
      case 'vocabulary': return renderVocabulary();
      case 'grammar': return renderGrammar();
      case 'dialogues': return renderDialogues();
      case 'culture': return renderCulture();
      case 'exercises': return renderExercises();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">{lessonData.title}</h1>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  currentSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audio caching notification */}
      {cachingAudio && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Pre-caching audio for instant playback...</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {renderSection()}
      </div>
    </div>
  );
};

export default LessonViewer;

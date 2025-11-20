import React, { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ChevronRight, Lightbulb, Volume2 } from 'lucide-react';

const SentenceBuilder = () => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [completedExercises, setCompletedExercises] = useState([]);

  // Sentence building exercises based on Unit 1 Lesson 1 grammar
  const exercises = [
    {
      id: 1,
      english: "I am Taiwanese",
      targetSentence: ["我", "是", "台灣人"],
      romanization: "Guá sī Tâi-uân-lâng",
      wordBank: ["我", "是", "台灣人", "你", "的"],
      grammarPoint: "是 (sī) structure",
      explanation: "Subject + 是 + Noun/Identity. Use 是 (sī) to state identity or nationality.",
      hint: "Start with the subject (I), then the verb (to be), then the identity."
    },
    {
      id: 2,
      english: "You are American",
      targetSentence: ["你", "是", "美國人"],
      romanization: "Lí sī Bí-kok-lâng",
      wordBank: ["你", "是", "美國人", "台灣人", "我"],
      grammarPoint: "是 (sī) structure",
      explanation: "Subject + 是 + Noun/Identity. The pattern is the same for different subjects.",
      hint: "Same pattern: Subject + 是 + Identity"
    },
    {
      id: 3,
      english: "My name",
      targetSentence: ["我", "的", "名"],
      romanization: "guá ê miâ",
      wordBank: ["我", "的", "名", "你", "是"],
      grammarPoint: "的 (ê) possessive particle",
      explanation: "Possessor + 的 + Possessed. Use 的 (ê) to show possession, like 's in English.",
      hint: "In Taiwanese, possession follows the pattern: possessor + 的 + thing possessed"
    },
    {
      id: 4,
      english: "Your home",
      targetSentence: ["你", "的", "厝"],
      romanization: "lí ê tshù",
      wordBank: ["你", "的", "厝", "我", "名"],
      grammarPoint: "的 (ê) possessive particle",
      explanation: "Possessor + 的 + Possessed. 厝 (tshù) means home or house in Taiwanese.",
      hint: "Use the same possessive pattern as before"
    },
    {
      id: 5,
      english: "Have you eaten?",
      targetSentence: ["食飽", "未", "？"],
      romanization: "Tsia̍h-pá-buē?",
      wordBank: ["食飽", "未", "？", "你", "是"],
      grammarPoint: "未 (buē/bē) question particle",
      explanation: "Statement + 未? Add 未 (buē) at the end to form yes/no questions meaning 'yet?'",
      hint: "This is a traditional greeting. Put the statement first, then add the question particle."
    },
    {
      id: 6,
      english: "I am also Taiwanese",
      targetSentence: ["我", "嘛", "是", "台灣人"],
      romanization: "Guá mā sī Tâi-uân-lâng",
      wordBank: ["我", "嘛", "是", "台灣人", "的", "你"],
      grammarPoint: "嘛 (mā) - 'Also' / 'Too'",
      explanation: "嘛 (mā) means 'also' or 'too'. Place it after the subject or before the verb.",
      hint: "Pattern: Subject + 嘛 + Verb + Object. The word 嘛 goes right after the subject."
    },
    {
      id: 7,
      english: "And you?",
      targetSentence: ["你", "呢", "？"],
      romanization: "Lí--neh?",
      wordBank: ["你", "呢", "？", "我", "是"],
      grammarPoint: "呢 (neh) - 'And you?' / 'What about...?'",
      explanation: "呢 (neh) is used to return a question. It's a very short and casual way to ask 'What about you?'",
      hint: "This is a simple two-word question in Taiwanese!"
    },
    {
      id: 8,
      english: "I've eaten too",
      targetSentence: ["我", "嘛", "食飽", "矣"],
      romanization: "Guá mā tsia̍h-pá--ah",
      wordBank: ["我", "嘛", "食飽", "矣", "未", "你"],
      grammarPoint: "嘛 (mā) - 'Also' / 'Too'",
      explanation: "嘛 (mā) after subject means 'also'. 矣 (--ah) is a completion particle showing the action is done.",
      hint: "Subject + 嘛 + Verb + Completion particle"
    },
    {
      id: 9,
      english: "He/She is a teacher",
      targetSentence: ["伊", "是", "老師"],
      romanization: "I sī lāu-su",
      wordBank: ["伊", "是", "老師", "學生", "我"],
      grammarPoint: "是 (sī) structure",
      explanation: "伊 (I) is 'he/she/they' in Taiwanese. Same 是 structure for all subjects.",
      hint: "Third person pronoun + 是 + occupation"
    },
    {
      id: 10,
      english: "Taiwan's food",
      targetSentence: ["台灣", "的", "食物"],
      romanization: "Tâi-uân ê tsia̍h-mi̍h",
      wordBank: ["台灣", "的", "食物", "我", "你"],
      grammarPoint: "的 (ê) possessive particle",
      explanation: "The possessive 的 works for countries and places too, not just people.",
      hint: "Place + 的 + thing from that place"
    }
  ];

  const currentExercise = exercises[currentExerciseIndex];

  const handleDragStart = (e, word) => {
    e.dataTransfer.setData('word', word);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const word = e.dataTransfer.getData('word');

    // Don't allow duplicates
    if (selectedWords.includes(word)) return;

    // Append the word to the sentence
    setSelectedWords([...selectedWords, word]);
    setIsCorrect(null); // Reset correctness when user changes answer
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveWord = (index) => {
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setIsCorrect(null);
  };

  const checkAnswer = () => {
    const userAnswer = selectedWords.join('');
    const correctAnswer = currentExercise.targetSentence.join('');
    const correct = userAnswer === correctAnswer;
    setIsCorrect(correct);

    if (correct && !completedExercises.includes(currentExercise.id)) {
      setCompletedExercises([...completedExercises, currentExercise.id]);
    }
  };

  const resetExercise = () => {
    setSelectedWords([]);
    setIsCorrect(null);
    setShowHint(false);
  };

  const nextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      resetExercise();
    }
  };

  const previousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      resetExercise();
    }
  };

  const availableWords = currentExercise.wordBank.filter(
    word => !selectedWords.includes(word)
  );

  const playAudio = async (romanization) => {
    try {
      const response = await fetch(`/api/audio?taibun=${encodeURIComponent(romanization)}`);
      if (!response.ok) throw new Error('Audio fetch failed');
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Sentence Builder Practice</h2>
        <p className="text-purple-100 mb-3">Drag words to build correct Taiwanese sentences</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${(completedExercises.length / exercises.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium">{completedExercises.length}/{exercises.length}</span>
        </div>
      </div>

      {/* Exercise Card */}
      <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
        {/* Exercise Number and Grammar Point */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              Exercise {currentExerciseIndex + 1}/{exercises.length}
            </span>
            {completedExercises.includes(currentExercise.id) && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          <span className="text-sm text-gray-600 font-medium">{currentExercise.grammarPoint}</span>
        </div>

        {/* Target English Sentence */}
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-1">Build this sentence in Taiwanese:</div>
          <div className="text-2xl font-bold text-gray-800">{currentExercise.english}</div>
        </div>

        {/* Sentence Construction Area */}
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-2">Your sentence:</div>
          <div
            className="min-h-[80px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-wrap gap-2 items-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {selectedWords.length === 0 ? (
              <div className="text-gray-400 text-center w-full">Drag words here to build the sentence</div>
            ) : (
              selectedWords.map((word, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-indigo-100 border border-indigo-300 rounded-lg font-medium text-gray-800 cursor-pointer hover:bg-indigo-200 transition-colors"
                  onClick={() => handleRemoveWord(index)}
                  title="Click to remove"
                >
                  {word}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Word Bank */}
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-2">Word Bank (drag to build sentence):</div>
          <div className="flex flex-wrap gap-2">
            {availableWords.map((word, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, word)}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg font-medium text-gray-800 cursor-move hover:bg-gray-200 transition-colors"
              >
                {word}
              </div>
            ))}
            {availableWords.length === 0 && (
              <div className="text-gray-400 text-sm">All words used</div>
            )}
          </div>
        </div>

        {/* Check Button and Hint */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={checkAnswer}
            disabled={selectedWords.length === 0}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              selectedWords.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            Check Answer
          </button>
          <button
            onClick={() => setShowHint(!showHint)}
            className="px-4 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 active:bg-indigo-100 transition-colors flex items-center gap-2"
          >
            <Lightbulb className="w-5 h-5" />
            Hint
          </button>
          <button
            onClick={resetExercise}
            className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Hint Box */}
        {showHint && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-yellow-900 mb-1">Hint:</div>
                <div className="text-sm text-yellow-800">{currentExercise.hint}</div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {isCorrect !== null && (
          <div className={`p-4 rounded-lg border-2 mb-6 ${
            isCorrect
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className={`font-semibold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Not quite right'}
                </div>
                {!isCorrect && (
                  <div className="text-sm text-red-800 mb-3">
                    <div className="font-medium mb-1">Correct answer:</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentExercise.targetSentence.map((word, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 border border-green-300 rounded font-medium">
                          {word}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 font-mono">{currentExercise.romanization}</span>
                      <button
                        onClick={() => playAudio(currentExercise.romanization)}
                        className="p-1 hover:bg-green-200 rounded-full transition-colors"
                      >
                        <Volume2 className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  </div>
                )}
                {isCorrect && (
                  <div className="text-sm text-green-800 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-700 font-mono">{currentExercise.romanization}</span>
                      <button
                        onClick={() => playAudio(currentExercise.romanization)}
                        className="p-1 hover:bg-green-200 rounded-full transition-colors"
                      >
                        <Volume2 className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-700 bg-white/50 p-3 rounded border border-gray-300">
                  <div className="font-semibold mb-1">Grammar explanation:</div>
                  {currentExercise.explanation}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={previousExercise}
            disabled={currentExerciseIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentExerciseIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
            }`}
          >
            ← Previous
          </button>
          <button
            onClick={nextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentExerciseIndex === exercises.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            Next Exercise
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Completion Message */}
      {completedExercises.length === exercises.length && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white text-center">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-2xl font-bold mb-2">Congratulations!</div>
          <div className="text-green-100">You've completed all {exercises.length} exercises in Unit 1 Lesson 1!</div>
        </div>
      )}
    </div>
  );
};

export default SentenceBuilder;

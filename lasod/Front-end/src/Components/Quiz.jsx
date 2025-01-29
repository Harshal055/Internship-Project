import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { languageQuestions } from "../Questions/index";

const Quiz = () => {
  const { language } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = () => {
      try {
        if (!language || !languageQuestions[language.toLowerCase()]) {
          navigate("/");
          return;
        }

        const allQuestions = [
          ...languageQuestions[language.toLowerCase()].easy,
          ...languageQuestions[language.toLowerCase()].medium,
          ...languageQuestions[language.toLowerCase()].difficult,
        ];

        setQuestions(allQuestions);
        setLoading(false);
      } catch (error) {
        console.error("Error loading questions:", error);
        navigate("/");
      }
    };

    loadQuestions();
  }, [language, navigate]);

  const handleAnswerClick = (option) => {
    setSelectedAnswer(option);
    setShowResult(true);
    
    if (option === questions[currentQuestionIndex].answer) {
      const pointsToAdd = questions[currentQuestionIndex].points || 10;
      setScore(prevScore => prevScore + pointsToAdd);
      setCorrectAnswers(prev => prev + 1);
    } else {
      setWrongAnswers(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const percentage = (correctAnswers / questions.length) * 100;
      if (percentage >= 60) {
        setShowCompletionModal(true);
      }
      setTimeout(() => {
        navigate('/results', { 
          state: { 
            score, 
            correctAnswers, 
            wrongAnswers, 
            totalQuestions: questions.length 
          } 
        });
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black 
        flex items-center justify-center">
        <div className="text-white text-xl">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between mb-8">
          <div className="text-white text-xl">
            Question {currentQuestionIndex + 1}/{questions.length}
          </div>
          <div className="flex gap-4">
            <span className="text-green-400">Correct: {correctAnswers}</span>
            <span className="text-red-400">Wrong: {wrongAnswers}</span>
            <span className="text-white">Score: {score}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-8">
            {questions[currentQuestionIndex].question}
          </h2>

          <div className="space-y-4">
            {questions[currentQuestionIndex].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(option)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg text-white 
                  transition-all duration-300 
                  ${showResult 
                    ? option === questions[currentQuestionIndex].answer
                      ? 'bg-green-600'
                      : option === selectedAnswer
                        ? 'bg-red-600'
                        : 'bg-gray-700'
                    : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {option}
              </button>
            ))}
          </div>

          {showResult && (
            <div className="mt-8 text-center">
              <p className={`text-xl mb-4 ${
                selectedAnswer === questions[currentQuestionIndex].answer 
                  ? "text-green-400" 
                  : "text-red-400"
              }`}>
                {selectedAnswer === questions[currentQuestionIndex].answer 
                  ? `Correct! +${questions[currentQuestionIndex].points || 10} points` 
                  : "Incorrect!"}
              </p>
              <button
                onClick={handleNextQuestion}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg
                  hover:bg-blue-700 transition-colors duration-300"
              >
                {currentQuestionIndex === questions.length - 1 
                  ? "Finish Quiz" 
                  : "Next Question"}
              </button>
            </div>
          )}
        </div>

        {showCompletionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-lg text-center">
              <h2 className="text-3xl text-green-400 mb-4">
                Congratulations! 🎉
              </h2>
              <p className="text-white text-xl mb-4">
                You've completed the quiz with {((correctAnswers / questions.length) * 100).toFixed(1)}%
              </p>
              <p className="text-white">
                Correct Answers: {correctAnswers} | Wrong Answers: {wrongAnswers}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
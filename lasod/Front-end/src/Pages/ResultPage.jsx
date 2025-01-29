import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, correctAnswers, wrongAnswers, totalQuestions } = location.state || {};

  const data = {
    labels: ['Correct', 'Wrong'],
    datasets: [
      {
        data: [correctAnswers, wrongAnswers],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderColor: ['#16a34a', '#dc2626'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'white'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4">
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Quiz Results</h1>
        
        <div className="w-64 h-64 mx-auto mb-8">
          <Doughnut data={data} options={options} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-green-400 text-2xl font-bold">{correctAnswers}</p>
            <p className="text-white">Correct Answers</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-red-400 text-2xl font-bold">{wrongAnswers}</p>
            <p className="text-white">Wrong Answers</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-blue-400 text-2xl font-bold">{score}</p>
            <p className="text-white">Total Score</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-yellow-400 text-2xl font-bold">
              {((correctAnswers / totalQuestions) * 100).toFixed(1)}%
            </p>
            <p className="text-white">Accuracy</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/LanguagePage')}
          className="w-full bg-blue-600 text-white py-2 rounded-lg
            hover:bg-blue-700 transition-colors duration-300"
        >
          Try Another Quiz
        </button>
      </div>
    </div>
  );
};

export default ResultPage;
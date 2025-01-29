
import { useNavigate } from 'react-router-dom';
import profileImage from '../assets/Profile.jpg';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <img src={profileImage} alt="Profile" className="w-48 h-48 rounded-full mb-4" />
      <button
        onClick={() => navigate('/LanguagePage')}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Start Quiz
      </button>
    </div>
  );
};

export default Home;

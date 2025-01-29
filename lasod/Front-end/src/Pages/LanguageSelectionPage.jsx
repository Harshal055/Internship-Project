import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "./Navbar";

const LanguageSelectionPage = () => {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const navigate = useNavigate();

  const languages = [
    {
      name: "Python",
      description: "From basics to advanced",
      icon: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg",
    },
    {
      name: "JavaScript",
      description: "Ideal for web development",
      icon: "https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png",
    },
    {
      name: "Java",
      description: "Great for OOP",
      icon: "https://images.javatpoint.com/core/images/java-logo1.png",
    },
    {
      name: "C++",
      description: "Powerful and efficient",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/ISO_C%2B%2B_Logo.svg/683px-ISO_C%2B%2B_Logo.svg.png",
    },
    {
      name: "C",
      description: "Low-level system programming",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfKZdbmTKy7h3cd-gxj7dKBQpTUJkt5tpmtQ&s",
    },
    {
      name: "Ruby",
      description: "Great for web development",
      icon: "https://upload.wikimedia.org/wikipedia/commons/7/73/Ruby_logo.svg",
    },
    {
      name: "PHP",
      description: "Used for server-side scripting",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/PHP-logo.svg/2560px-PHP-logo.svg.png",
    },
    {
      name: "Swift",
      description: "Used for iOS and macOS development",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxPoi0fALopQqvBEMq6A4-EETjJ_WjVhycJg&s",
    }
  ];

  const handleSelectLanguage = (language) => {
    setSelectedLanguage(language);
  };

  const handleStartQuiz = (language) => {
    const formattedName = language.name.toLowerCase().replace(/\s+/g, '');
    navigate(`/quiz/${formattedName}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <div className="flex-1 pt-24">
        <div className="min-h-screen flex flex-col justify-center items-center">
          <div className="w-full max-w-4xl p-6 mt-16">
            <h1 className="text-4xl text-white font-bold mb-8 text-center">
              Select a Programming Language
            </h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {languages.map((language, index) => (
                <div
                  key={index}
                  className="flip-card"
                  onClick={() => handleSelectLanguage(language)}
                >
                  <div className="flip-card-inner">
                    <div className="flip-card-front bg-gray-800">
                      <div className="icon-wrapper p-4">
                        <img 
                          src={language.icon} 
                          alt={`${language.name} logo`}
                          className="w-16 h-16 mx-auto"
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        {language.name}
                      </h3>
                    </div>
                    <div className="flip-card-back bg-gray-900">
                      <p className="text-white mb-4">{language.description}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartQuiz(language);
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg
                          hover:bg-blue-700 transition-colors duration-300"
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
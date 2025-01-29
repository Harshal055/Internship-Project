import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navbarStyle = {
    backgroundColor: `rgba(0, 0, 0, ${Math.min(scrollPosition / 500, 0.8)})`,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    transition: "all 0.3s ease-in-out",
  };

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50" style={navbarStyle}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}

          <div className="flex items-center space-x-2">
            <img
              src="/src/assets/logo.png"
              alt="Code Guru Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="text-lg font-bold text-white drop-shadow-lg">
              Code Guru
            </span>
          </div>

          {/* Menu */}
          <ul className="flex space-x-9">
            <li>
              <a
                href="#"
                className="text-white hover:text-gray-300 drop-shadow-lg transition-colors"
              >
                Explore
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-white hover:text-gray-300 drop-shadow-lg transition-colors"
              >
                Problems
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-white hover:text-gray-300 drop-shadow-lg transition-colors"
              >
                Contest
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-white hover:text-gray-300 drop-shadow-lg transition-colors"
              >
                Contact
              </a>
            </li>
          </ul>

          {/* Login Button */}
          <div className="flex items-center">
            <button
              type="button"
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg 
                         hover:bg-blue-700 transition-colors duration-300 
                         shadow-lg hover:shadow-xl"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

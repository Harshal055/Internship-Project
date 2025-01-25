import React, { useState } from "react";

const App = () => {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleToggle = (form) => {
    setIsLogin(form === "login");
    resetForm();
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setEmailError("");
    setPasswordError("");
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setPasswordError("");
  };

  const validateForm = () => {
    let isValid = true;

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      alert(isLogin ? "Login successful!" : "Signup successful!");
      resetForm();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <div className="relative mb-6">
          <div className="flex justify-around">
            <button
              className={`px-6 py-2 text-sm font-bold transition-colors duration-300 ${
                isLogin ? "text-gray-800" : "text-gray-500"
              }`}
              onClick={() => handleToggle("login")}
            >
              Login
            </button>
            <button
              className={`px-6 py-2 text-sm font-bold transition-colors duration-300 ${
                !isLogin ? "text-gray-800" : "text-gray-500"
              }`}
              onClick={() => handleToggle("signup")}
            >
              Signup
            </button>
          </div>
          {/* Slider */}
          <div
            className={`absolute bottom-0 w-1/2 h-1 bg-gray-500 rounded transition-transform duration-300 ${
              isLogin ? "transform translate-x-0" : "transform translate-x-full"
            }`}
          ></div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold text-center text-gray-800">
            {isLogin ? "Login Form" : "Signup Form"}
          </h2>
          {!isLogin && (
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                emailError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
              }`}
            />
            {emailError && (
              <p className="text-sm text-red-500 mt-1">{emailError}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                passwordError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
              }`}
            />
            {passwordError && (
              <p className="text-sm text-red-500 mt-1">{passwordError}</p>
            )}
          </div>
          {isLogin && (
            <a
              href="#"
              className="text-sm text-blue-700 hover:underline block text-right"
            >
              Forgot password?
            </a>
          )}
          <button
            type="submit"
            className="w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-blue-800"
          >
            {isLogin ? "Login" : "Signup"}
          </button>
          <p className="text-center text-sm text-gray-600">
            {isLogin
              ? "Not a member? "
              : "Already have an account? "}
            <a
              href="#"
              onClick={() => handleToggle(isLogin ? "signup" : "login")}
              className="text-blue-700 hover:underline font-medium"
            >
              {isLogin ? "Signup now" : "Login now"}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default App;

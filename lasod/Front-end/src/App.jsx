import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Navbar from "./Pages/Navbar";
import Signup from "./Pages/signup";
import HeroSection from "./Components/HeroSection";
import ChallengesSection from "./Components/ChallengesSection";
import CommunitySection from "./Components/CommunitySection";
import Footer from "./Components/Footer";
import LanguageSelectionPage from "./Pages/LanguageSelectionPage";
import Quiz from "./Components/Quiz";
import ResultPage from "./Pages/ResultPage";
import Overview from "./Components/Overview";

function ConditionalNavbar() {
  const location = useLocation();
  const hideNavbar =
    location.pathname === "/login" || location.pathname.includes("/quiz")|| location.pathname.includes("results");
  return !hideNavbar && <Navbar />;
}

function App() {
  return (
    <Router>
      <ConditionalNavbar />
      <Routes>
        <Route path="/login" element={<Signup />} />
        <Route path="/LanguagePage" element={<LanguageSelectionPage />} />
        <Route path="/quiz/:language" element={<Quiz />} />
        
        <Route path="/results" element={<ResultPage />} />
        <Route
          path="/"
          element={
            <>
              <HeroSection />
              <Overview />
              <ChallengesSection />
              <CommunitySection />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

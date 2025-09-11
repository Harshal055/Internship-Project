// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbbsH1bORJV5Z4SDBjkopSndmOIfMptOw",
  authDomain: "superxproject-973c7.firebaseapp.com",
  projectId: "superxproject-973c7",
  storageBucket: "superxproject-973c7.firebasestorage.app",
  messagingSenderId: "206185906956",
  appId: "1:206185906956:web:811a79871ec24692683f29",
  measurementId: "G-H4884SLDGB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;

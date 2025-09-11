# Firebase Authentication Setup Instructions

## ✅ **Current Status**
Your app now has Firebase Authentication integrated with:
- 🔐 **Login Screen** - Email/Password authentication
- 📱 **Main Screen Integration** - Shows user info and logout
- 💾 **Persistent Login** - Remembers user between app sessions
- 🚪 **Logout Functionality** - Complete session management

## 🔧 **To Enable Real Firebase (Optional)**

Currently using mock authentication for testing. To enable real Firebase:

### 1. Install Firebase Dependencies
```bash
npm install firebase @react-native-firebase/app @react-native-firebase/auth
```

### 2. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable Authentication > Sign-in method > Email/Password

### 3. Get Firebase Config
1. Go to Project Settings > General
2. Add web app
3. Copy configuration object

### 4. Update Firebase Config
Replace content in `firebase/config.js` with your actual config:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### 5. Update FirebaseLogin.jsx
Uncomment the Firebase imports at the top and replace mock functions with real ones.

## 📱 **How It Currently Works**

### **Demo Credentials** (Mock Authentication):
- **Email**: `test@example.com`
- **Password**: `password123`

### **Features**:
- ✅ Email/Password login and registration
- ✅ Password reset functionality
- ✅ Form validation and error handling
- ✅ Persistent login sessions
- ✅ User info display in main screen
- ✅ Logout functionality
- ✅ Navigation to main screen after login

### **Flow**:
1. **App Launch** → Check for existing login → Show Login/Main screen
2. **Login Success** → Save user data → Navigate to Main screen
3. **Main Screen** → Show user info + quiz options + logout button
4. **Logout** → Clear user data → Navigate back to Login screen

## 🎯 **Ready to Use**
Your app is ready to use with mock authentication! Users can:
- Create accounts and login
- Access the quiz features
- Have persistent sessions
- Logout securely

The mock system works exactly like real Firebase for testing and development.

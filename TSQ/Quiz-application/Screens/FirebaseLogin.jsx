import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase imports
import { auth } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  signOut
} from 'firebase/auth';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isTablet = screenWidth > 768;

const FirebaseLogin = ({ navigation, onLoginSuccess }) => {
  // Firebase Authentication State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('userToken');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        console.log('Found existing user:', user.email);
        // User already logged in, update app state
        // This will trigger automatic navigation in App.js
        if (onLoginSuccess) {
          onLoginSuccess(user);
        } else {
          console.warn('No onLoginSuccess callback provided');
        }
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
    }
  };

  // Firebase logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('userToken');
      resetForm();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };



  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Store user data
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        emailVerified: user.emailVerified,
        loginMethod: 'email',
        loginTime: new Date().toISOString()
      };

      await AsyncStorage.setItem('userToken', JSON.stringify(userData));

      // Call the onLoginSuccess callback to update app state
      // This will trigger the navigation automatically in App.js
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      } else {
        console.warn('No onLoginSuccess callback provided');
      }

    } catch (error) {
      console.error('Firebase login error:', error);
      let errorMessage = 'Login failed. Please try again.';

      // Handle Firebase error codes
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || 'Login failed. Please try again.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff"
        translucent={false}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🔐</Text>
            </View>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to continue to Quiz App</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}
{/* Demo Credentials (for testing) */}
           

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>📧 Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🔒 Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              onPress={handleEmailLogin}
              style={[
                styles.actionButton,
                styles.loginButton,
                loading && styles.disabledButton
              ]}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.actionButtonText}>🔐 Sign In</Text>
              )}
            </TouchableOpacity>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  keyboardContainer: {
    flex: 1,
  },
  
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: isSmallScreen ? 20 : isTablet ? 60 : 24,
    paddingVertical: 40,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  
  logoContainer: {
    width: isSmallScreen ? 80 : isTablet ? 120 : 100,
    height: isSmallScreen ? 80 : isTablet ? 120 : 100,
    borderRadius: isSmallScreen ? 40 : isTablet ? 60 : 50,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  
  logoIcon: {
    fontSize: isSmallScreen ? 40 : isTablet ? 60 : 50,
  },
  
  title: {
    fontSize: isSmallScreen ? 28 : isTablet ? 36 : 32,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 400 : '100%',
    alignSelf: 'center',
  },
  
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  
  demoContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 8,
  },
  
  demoText: {
    fontSize: 12,
    color: '#0369a1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  
  inputContainer: {
    marginBottom: 20,
  },
  
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  
  passwordContainer: {
    position: 'relative',
  },
  
  passwordInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 60,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 30,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  passwordToggleText: {
    fontSize: 16,
  },
  
  actionButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  
  loginButton: {
    backgroundColor: '#3b82f6',
  },
  

  
  disabledButton: {
    opacity: 0.7,
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  
  actionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  

});

export default FirebaseLogin;

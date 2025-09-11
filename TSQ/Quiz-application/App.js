import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppContext, CURRENT_ROLE_STORAGE_KEY } from './context/AppContext';
import FirebaseLogin from './Screens/FirebaseLogin';
import MainScreen from './Screens/MainScreen';
import AdminPanel from './Screens/AdminPanel';
import UserPanel from './Screens/UserPanel';
import FolderSubfolders from './Screens/FolderSubfolders';
import AllQuestionsScreen from './Screens/AllQuestionsScreen';
import QuizScreen from './Screens/QuizScreen';
import ResultPage from './Screens/ResultPage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [currentRole, setCurrentRole] = useState('guest');
  const [errorMessage, setErrorMessage] = useState('');
  const [childName, setChildName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Check Firebase authentication
      const savedFirebaseUser = await AsyncStorage.getItem('userToken');
      if (savedFirebaseUser) {
        const userData = JSON.parse(savedFirebaseUser);
        setFirebaseUser(userData);
        setIsLoggedIn(true);
        console.log('Firebase user loaded:', userData.email);
      } else {
        console.log('No Firebase user found - showing login screen');
        setIsLoggedIn(false);
      }

      const storedRole = await AsyncStorage.getItem(CURRENT_ROLE_STORAGE_KEY);
      const storedChildName = await AsyncStorage.getItem('quizAppChildName');
      
      if (storedRole) {
        setCurrentRole(storedRole);
      }
      if (storedChildName) {
        setChildName(storedChildName);
        console.log('Loaded child name from storage:', storedChildName);
      } else {
        console.log('No child name found in storage');
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirebaseLoginSuccess = (userData) => {
    console.log('handleFirebaseLoginSuccess called with:', userData.email);
    setFirebaseUser(userData);
    setIsLoggedIn(true);
    console.log('Firebase login successful, isLoggedIn set to true');
  };

  const handleFirebaseLogout = async () => {
    try {
      // Import Firebase auth and signOut
      const { auth } = require('./firebase/config');
      const { signOut } = require('firebase/auth');
      
      await signOut(auth);
      await AsyncStorage.removeItem('userToken');
      setFirebaseUser(null);
      setIsLoggedIn(false);
      console.log('Firebase logout successful');
    } catch (error) {
      console.error('Error during Firebase logout:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setCurrentRole('guest');
      setErrorMessage('');
      await AsyncStorage.setItem(CURRENT_ROLE_STORAGE_KEY, 'guest');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar 
          barStyle="dark-content" 
          translucent={Platform.OS === 'android'}
          backgroundColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          animated={true}
        />
        <SafeAreaView style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaProvider>
        <StatusBar 
          barStyle="dark-content" 
          translucent={Platform.OS === 'android'}
          backgroundColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          animated={true}
        />
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {errorMessage}</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const setChildNameWithStorage = async (name) => {
    try {
      setChildName(name);
      await AsyncStorage.setItem('quizAppChildName', name);
    } catch (error) {
      console.error('Error saving child name:', error);
    }
  };

  const contextValue = {
    currentRole,
    handleLogout,
    setErrorMessage,
    errorMessage,
    childName,
    setChildName: setChildNameWithStorage,
    firebaseUser,
    isLoggedIn,
    handleFirebaseLogout
  };

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="dark-content" 
        translucent={Platform.OS === 'android'}
        backgroundColor={Platform.OS === 'android' ? '#ffffff' : undefined}
        animated={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      <AppContext.Provider value={contextValue}>
        <NavigationContainer>
          {!isLoggedIn ? (
            <Stack.Navigator initialRouteName="FirebaseLogin">
              <Stack.Screen 
                name="FirebaseLogin" 
                options={{ headerShown: false }}
              >
                {(props) => (
                  <FirebaseLogin 
                    {...props} 
                    onLoginSuccess={handleFirebaseLoginSuccess}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          ) : (
            <Stack.Navigator initialRouteName="MainScreen">
              <Stack.Screen name="MainScreen" component={MainScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AdminPanel" component={AdminPanel} options={{ headerShown: false }} />
              <Stack.Screen name="UserPanel" component={UserPanel} options={{ headerShown: false }} />
              <Stack.Screen name="FolderSubfolders" component={FolderSubfolders} options={{ headerShown: false }} />
              <Stack.Screen name="AllQuestionsScreen" component={AllQuestionsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="QuizScreen" component={QuizScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ResultPage" component={ResultPage} options={{ headerShown: false }} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffe6e6',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
});

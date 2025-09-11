import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, BackHandler, StatusBar, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuizTakingComponent from './QuizTakingComponent';
import { AppContext } from '../context/AppContext';

// Simple Error Boundary Component
class QuizErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('QuizErrorBoundary caught an error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    if (error.message.includes("Property 'questions' doesn't exist")) {
      console.error('This is the questions property error we are trying to fix');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Something went wrong with the quiz.</Text>
            <Text style={styles.errorText}>Error: {this.state.errorMessage}</Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const QuizScreen = ({ route }) => {
  const navigation = useNavigation();
  const context = useContext(AppContext);
  const childName = (context && context.childName) || 'Guest';
  
  const { 
    quiz, 
    timePerQuestion, 
    resumeDraft, 
    sessionId
  } = route.params || {};

  // Add loading state for navigation transition
  const [isReady, setIsReady] = useState(false);

  // Wait for navigation to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('QuizScreen: Setting ready state, route.params:', route.params);
      setIsReady(true);
    }, 50); // Reduced delay
    return () => clearTimeout(timer);
  }, [route.params]);

  // Handle hardware back button - MOVED BEFORE VALIDATION
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Navigate back to UserPanel when back button is pressed
        navigation.goBack();
        return true;
      };
      
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        if (subscription && subscription.remove) subscription.remove();
      };
    }, [navigation])
  );

  // Validate quiz structure AFTER all hooks
  if (!isReady || !quiz) {
    console.log('QuizScreen: Loading...', { 
      isReady, 
      hasQuiz: !!quiz
    });
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading quiz...</Text>
      </SafeAreaView>
    );
  }

  // Ensure quiz has questions array
  if (!quiz.questions || !Array.isArray(quiz.questions)) {
    console.error('QuizScreen: Invalid quiz structure - missing questions array');
    return (
      <SafeAreaView style={styles.container}>
        <Text>Error: Invalid quiz structure</Text>
      </SafeAreaView>
    );
  }

  // Create a stable quiz object to prevent any property access issues
  const stableQuiz = {
    id: quiz.id || `temp-${Date.now()}`,
    title: quiz.title || 'Quiz',
    questions: Array.isArray(quiz.questions) ? quiz.questions : [],
    ...quiz // spread any other properties
  };

  const handleQuizComplete = async (payload) => {
    // Extract the needed values from the payload
    const { score, totalQuestions, quizTitle, questions: userAnswers, timeUsed, wrongCount, skippedCount } = payload;
    
    // Save quiz result directly here
    try {
      const results = await AsyncStorage.getItem('quizAppResults');
      const parsedResults = results ? JSON.parse(results) : [];
      const newResult = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toLocaleString(),
        score: score,
        totalQuestions: totalQuestions,
        quizTitle: quizTitle,
        timeUsed: timeUsed || 0,
        wrongCount: wrongCount || 0,
        skippedCount: skippedCount || 0,
        userAnswers: userAnswers || [],
        childName: childName || 'Unknown',
        timestamp: new Date().toISOString()
      };
      parsedResults.push(newResult);
      await AsyncStorage.setItem('quizAppResults', JSON.stringify(parsedResults));
      
      // Delete the draft when quiz is completed
      if (quiz?.id) {
        const drafts = await AsyncStorage.getItem('quizAppDrafts');
        if (drafts) {
          const parsedDrafts = JSON.parse(drafts);
          const filteredDrafts = parsedDrafts.filter(d => d.quizId !== quiz.id);
          await AsyncStorage.setItem('quizAppDrafts', JSON.stringify(filteredDrafts));
        }
      }
      
      // Navigate to ResultPage with the quiz result data
      navigation.navigate('ResultPage', { 
        quizResult: {
          ...payload,
          id: newResult.id,
          date: newResult.date,
          childName: childName || 'Unknown'
        }
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
      // Still navigate to result page even if saving fails
      navigation.navigate('ResultPage', { 
        quizResult: {
          ...payload,
          childName: childName || 'Unknown'
        }
      });
    }
  };

  const handleDraftUpdate = async (draftData) => {
    if (!draftData) {
      // Clear draft
      try {
        const drafts = await AsyncStorage.getItem('quizAppDrafts');
        if (drafts) {
          const parsedDrafts = JSON.parse(drafts);
          const filteredDrafts = parsedDrafts.filter(d => d.quizId !== quiz?.id);
          await AsyncStorage.setItem('quizAppDrafts', JSON.stringify(filteredDrafts));
        }
      } catch (error) {
        console.error('Error clearing draft:', error);
      }
      return;
    }

    // Save draft
    try {
      const drafts = await AsyncStorage.getItem('quizAppDrafts');
      const parsedDrafts = drafts ? JSON.parse(drafts) : [];
      const existingIndex = parsedDrafts.findIndex(d => d.quizId === quiz?.id);
      
      const newDraft = {
        ...draftData,
        quizId: quiz?.id,
        quizTitle: quiz?.title,
        timestamp: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        parsedDrafts[existingIndex] = newDraft;
      } else {
        parsedDrafts.push(newDraft);
      }
      
      await AsyncStorage.setItem('quizAppDrafts', JSON.stringify(parsedDrafts));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  if (!quiz) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No quiz data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        translucent={false}
        backgroundColor="#f8fafc"
        animated={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      <QuizErrorBoundary>
        <QuizTakingComponent
          quiz={stableQuiz}
          onQuizComplete={handleQuizComplete}
          timePerQuestion={timePerQuestion}
          resumeDraft={resumeDraft}
          sessionId={sessionId}
          onDraftUpdate={handleDraftUpdate}
          navigation={navigation}
          childName={childName}
        />
      </QuizErrorBoundary>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
  },
});

export default QuizScreen;

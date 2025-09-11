import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const AllQuestionsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { quiz, answers: initialAnswers = [], onAnswerUpdate } = route.params || {};
  
  const [answers, setAnswers] = useState(initialAnswers);
  const questions = quiz?.questions || [];
  const totalQuestions = questions.length;

  // Update answers when they change
  const handleAnswerChange = (questionIndex, selectedOption) => {
    const updatedAnswers = [...answers];
    updatedAnswers[questionIndex] = selectedOption;
    setAnswers(updatedAnswers);
    
    // Call parent callback if provided
    if (onAnswerUpdate) {
      onAnswerUpdate(updatedAnswers);
    }
  };

  // Calculate statistics
  const answeredCount = answers.filter(a => a !== null && a !== undefined).length;
  const correctCount = answers.reduce((acc, ans, idx) => {
    if (ans && questions[idx]) {
      return acc + (questions[idx].correctAnswer === ans ? 1 : 0);
    }
    return acc;
  }, 0);

  const handleBackToQuiz = () => {
    navigation.goBack();
  };

  const handleSubmitQuiz = () => {
    Alert.alert(
      'Submit Quiz',
      `You have answered ${answeredCount} out of ${totalQuestions} questions.\n\nAre you sure you want to submit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          style: 'default',
          onPress: () => {
            // Navigate back with submission flag
            navigation.goBack();
            // You can add submission logic here
          }
        }
      ]
    );
  };

  if (!quiz || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No quiz data available</Text>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackToQuiz}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToQuiz}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>All Questions</Text>
          <Text style={styles.headerSubtitle}>{quiz.title}</Text>
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitQuiz}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Bar */}
      <View style={styles.statsBar}>
        <View style={[styles.statItem, styles.totalStat]}>
          <Text style={[styles.statNumber, styles.totalNumber]}>{totalQuestions}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.answeredStat]}>
          <Text style={[styles.statNumber, styles.answeredNumber]}>{answeredCount}</Text>
          <Text style={styles.statLabel}>Answered</Text>
        </View>
        <View style={[styles.statItem, styles.correctStat]}>
          <Text style={[styles.statNumber, styles.correctNumber]}>{correctCount}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={[styles.statItem, styles.remainingStat]}>
          <Text style={[styles.statNumber, styles.remainingNumber]}>{totalQuestions - answeredCount}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {/* Questions List */}
      <ScrollView style={styles.questionsList} showsVerticalScrollIndicator={true}>
        {questions.map((question, questionIndex) => (
          <View key={questionIndex} style={styles.questionCard}>
            {/* Question Header */}
            <View style={styles.questionHeader}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumber}>Q{questionIndex + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.question}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsList}>
              {question.options.map((option, optionIndex) => {
                const isUserAnswer = answers[questionIndex] === option;
                const isCorrectAnswer = question.correctAnswer === option;
                
                let optionStyle = [styles.optionCard];
                let textStyle = [styles.optionText];
                let indicators = [];
                
                if (isUserAnswer && isCorrectAnswer) {
                  // User selected correct answer
                  optionStyle.push(styles.optionCorrectUser);
                  textStyle.push(styles.optionCorrectText);
                  indicators.push('👆✓');
                } else if (isUserAnswer && !isCorrectAnswer) {
                  // User selected wrong answer
                  optionStyle.push(styles.optionWrongUser);
                  textStyle.push(styles.optionWrongText);
                  indicators.push('👆✗');
                } else if (!isUserAnswer && isCorrectAnswer) {
                  // Correct answer (not selected by user)
                  optionStyle.push(styles.optionCorrect);
                  textStyle.push(styles.optionCorrectText);
                  indicators.push('✓');
                }

                return (
                  <TouchableOpacity 
                    key={optionIndex} 
                    style={optionStyle}
                    onPress={() => handleAnswerChange(questionIndex, option)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionLabel}>
                        {String.fromCharCode(65 + optionIndex)}.
                      </Text>
                      <Text style={textStyle}>{option}</Text>
                    </View>
                    {indicators.length > 0 && (
                      <Text style={styles.optionIndicator}>{indicators.join(' ')}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Explanation */}
            {question.explanation && (
              <View style={styles.explanationCard}>
                <Text style={styles.explanationLabel}>💡 Explanation:</Text>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>
            )}

            {/* Question Status */}
            <View style={styles.questionStatus}>
              {answers[questionIndex] ? (
                answers[questionIndex] === question.correctAnswer ? (
                  <View style={styles.statusCorrect}>
                    <Text style={styles.statusText}>✓ Correct Answer</Text>
                  </View>
                ) : (
                  <View style={styles.statusWrong}>
                    <Text style={styles.statusText}>✗ Wrong Answer</Text>
                  </View>
                )
              ) : (
                <View style={styles.statusUnanswered}>
                  <Text style={styles.statusText}>○ Not Answered</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backToQuizBtn} onPress={handleBackToQuiz}>
          <Text style={styles.backToQuizText}>← Back to Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitQuizBtn} onPress={handleSubmitQuiz}>
          <Text style={styles.submitQuizText}>Submit Quiz →</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4a5568',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  submitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#22c55e',
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Statistics Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Colored stat items
  totalStat: {
    backgroundColor: '#f3f4f6',
  },
  totalNumber: {
    color: '#374151',
  },
  answeredStat: {
    backgroundColor: '#dbeafe',
  },
  answeredNumber: {
    color: '#1d4ed8',
  },
  correctStat: {
    backgroundColor: '#dcfce7',
  },
  correctNumber: {
    color: '#16a34a',
  },
  remainingStat: {
    backgroundColor: '#fef3c7',
  },
  remainingNumber: {
    color: '#d97706',
  },

  // Questions List
  questionsList: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  questionNumberBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    marginTop: 2,
  },
  questionNumber: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    lineHeight: 22,
  },

  // Options
  optionsList: {
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 12,
    minWidth: 24,
  },
  optionText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  optionIndicator: {
    fontSize: 16,
    marginLeft: 8,
  },
  optionCorrect: {
    backgroundColor: '#ecfdf5',
    borderColor: '#22c55e',
  },
  optionCorrectUser: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 3,
  },
  optionWrongUser: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 3,
  },
  optionCorrectText: {
    color: '#15803d',
    fontWeight: '600',
  },
  optionWrongText: {
    color: '#dc2626',
    fontWeight: '600',
  },

  // Explanation
  explanationCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },

  // Question Status
  questionStatus: {
    alignItems: 'flex-end',
  },
  statusCorrect: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusWrong: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusUnanswered: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  backToQuizBtn: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  backToQuizText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitQuizBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitQuizText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AllQuestionsScreen;

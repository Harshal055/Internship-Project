import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import PlayButton from '../components/PlayButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

const FOLDERS_STORAGE_KEY = 'quizAppFolders';

const FolderSubfolders = () => {
  // Handle hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (selectedSubfolder) {
        setSelectedSubfolder(null);
        return true;
      }
      navigation.goBack();
      return true;
    };
    const subscription = require('react-native').BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription && subscription.remove && subscription.remove();
  }, [selectedSubfolder, navigation]);
  
  const navigation = useNavigation();
  const route = useRoute();
  const { folderId } = route.params || {};
  const [folder, setFolder] = useState(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(null);
  const [lastAttempts, setLastAttempts] = useState({}); // { [quizTitle]: number (ms) }
  const [draftProgress, setDraftProgress] = useState({}); // { [quizIdOrTitle]: 0..1 }

  const loadLastAttempts = async () => {
    try {
      const raw = await AsyncStorage.getItem('quizAppResults');
      const parsed = raw ? JSON.parse(raw) : [];
      const map = {};
      parsed.forEach(r => {
        const title = (r && r.quizTitle ? String(r.quizTitle).trim() : null);
        const tsStr = r?.timestamp || r?.date;
        if (!title || !tsStr) return;
        const when = new Date(tsStr).getTime();
        if (!map[title] || when > map[title]) {
          map[title] = when;
        }
      });
      setLastAttempts(map);
    } catch (e) {
      setLastAttempts({});
    }
  };

  // Refresh last attempts whenever this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadLastAttempts();
      loadDraftProgress();
      return () => {};
    }, [])
  );

  const loadDraftProgress = async () => {
    try {
      const raw = await AsyncStorage.getItem('quizAppDrafts');
      const parsed = raw ? JSON.parse(raw) : [];
      const map = {};
      parsed.forEach(d => {
        const key = d?.quizId || d?.quizTitle;
        const total = Number(d?.totalQuestions) || 0;
        const idx = Number(d?.currentQIndex) || 0;
        if (key && total > 0) {
          const prog = Math.max(0, Math.min(1, idx / total));
          map[key] = prog;
        }
      });
      setDraftProgress(map);
    } catch (e) {
      setDraftProgress({});
    }
  };

  const handleStartQuiz = (quiz) => {
    if (!quiz) {
      console.error('No quiz provided to handleStartQuiz');
      Alert.alert('Error', 'Quiz data is missing');
      return;
    }
    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      console.warn('Quiz has no questions or invalid questions array:', quiz);
      Alert.alert('Error', 'This quiz has no questions available');
      return;
    }
    setLoadingQuiz(quiz.id || quiz.title || quiz.name || 'quiz');
    try {
      // Small delay for UX consistency and to prevent accidental double taps
      setTimeout(() => {
        navigation.navigate('QuizScreen', {
          quiz: { ...quiz, questions: quiz.questions || [] },
          timePerQuestion: 15,
          resumeDraft: null,
          sessionId: 'quizAppSessionId',
        });
        setLoadingQuiz(null);
      }, 400);
    } catch (e) {
      console.error('Error starting quiz:', e);
      Alert.alert('Error', 'Failed to start quiz');
      setLoadingQuiz(null);
    }
  };

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const raw = await AsyncStorage.getItem(FOLDERS_STORAGE_KEY);
        const folders = raw ? JSON.parse(raw) : [];
        // Recursive search for folder by id
        const findFolderById = (id, arr) => {
          for (const f of arr) {
            if (f.id === id) return f;
            if (f.subfolders && f.subfolders.length > 0) {
              const found = findFolderById(id, f.subfolders);
              if (found) return found;
            }
          }
          return null;
        };
        setFolder(findFolderById(folderId, folders));
        setSelectedSubfolder(null);
      } catch {
        setFolder(null);
      }
    };
    loadFolders();
  }, [folderId]);

  if (!folder) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar 
          barStyle="dark-content" 
          translucent={Platform.OS === 'android'}
          backgroundColor={Platform.OS === 'android' ? '#f8fafc' : undefined}
          animated={true}
        />
        <Text style={styles.notFound}>Folder not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text>Back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Quiz list for selected subfolder
  if (selectedSubfolder) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          translucent={Platform.OS === 'android'}
          backgroundColor={Platform.OS === 'android' ? '#f8fafc' : undefined}
          animated={true}
        />
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Header with navigation buttons */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSubfolder(null)}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('MainScreen')}>
              <Text style={styles.homeBtnText}>⌂</Text>
            </TouchableOpacity>
          </View>
          
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{selectedSubfolder.name}</Text>
          </View>
          
          {/* Quiz Cards */}
          {selectedSubfolder.quizzes && selectedSubfolder.quizzes.length > 0 ? (
            selectedSubfolder.quizzes.map((quiz, idx) => {
              const questionsCount = (quiz.questions && Array.isArray(quiz.questions)) ? quiz.questions.length : 0;
              const keyTitle = (quiz.title || quiz.name || '').toString().trim();
              const keyId = quiz.id ? String(quiz.id) : null;

              // Last attempt timestamp (from results store)
              const lastAttemptMs = (keyTitle && lastAttempts[keyTitle]) || (keyId && lastAttempts[keyId]) || null;
              const lastAttemptDateStr = typeof lastAttemptMs === 'number'
                ? new Date(lastAttemptMs).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null;
              const lastAttemptTimeStr = typeof lastAttemptMs === 'number'
                ? new Date(lastAttemptMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                : null;

              // Uploaded/Created timestamp (from quiz metadata)
              const uploadedRaw = quiz?.createdAt || quiz?.uploadedAt || quiz?.date || null;
              let uploadedMs = null;
              if (uploadedRaw) {
                const parsed = typeof uploadedRaw === 'number' ? uploadedRaw : Date.parse(uploadedRaw);
                if (!Number.isNaN(parsed)) uploadedMs = parsed;
              }
              const uploadedDateStr = typeof uploadedMs === 'number'
                ? new Date(uploadedMs).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null;
              const uploadedTimeStr = typeof uploadedMs === 'number'
                ? new Date(uploadedMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                : null;

              const draftProg = (keyId && draftProgress[keyId]) ?? (keyTitle && draftProgress[keyTitle]) ?? 0;
              const progress = draftProg > 0 ? draftProg : (lastAttemptMs ? 1 : 0);
              return (
                <View key={quiz.id || idx} style={styles.quizCard}>
                  <Text style={styles.quizNum}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quizTitle}>{quiz.title || quiz.name}</Text>
                    {/* Date/Time line */}
                    <Text style={styles.quizMeta}>
                      Uploaded Date: {uploadedDateStr || '—'}  Uploaded Time: {uploadedTimeStr || '—'}
                    </Text>
                    {/* Questions count */}
                    <Text style={styles.quizMeta}>{questionsCount} Questions</Text>
                    {/* Progress Bar */}
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                    {/* Bottom status text */}
                    {lastAttemptMs ? (
                      <Text style={styles.lastAttemptText}>Last Attempt: {lastAttemptDateStr} {lastAttemptTimeStr}</Text>
                    ) : (
                      <Text style={styles.neverAttemptText}>Never Attempt (Last On)</Text>
                    )}
                  </View>
                  <PlayButton
                    size={40}
                    loading={loadingQuiz === (quiz.id || quiz.title || quiz.name || 'quiz')}
                    disabled={loadingQuiz === (quiz.id || quiz.title || quiz.name || 'quiz')}
                    onPress={() => handleStartQuiz(quiz)}
                  />
                </View>
              );
            })
          ) : (
              <Text style={styles.noQuiz}>No quizzes found in this chapter.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      );
  }

  // Chapters list
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        translucent={Platform.OS === 'android'}
        backgroundColor={Platform.OS === 'android' ? '#f8fafc' : undefined}
        animated={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('MainScreen')}>
            <Text style={styles.homeBtnText}>⌂</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{folder.name}</Text>
          <Text style={styles.subtitle}>Select and take quizzes from organized folders</Text>
        </View>

        {/* Subfolders/Chapters */}
        {Array.isArray(folder.subfolders) && folder.subfolders.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Chapters</Text>
            {folder.subfolders.map((sub, idx) => {
              const sets = Array.isArray(sub.quizzes) ? sub.quizzes.length : 0;
              const questions = Array.isArray(sub.quizzes)
                ? sub.quizzes.reduce((acc, q) => acc + (q.questions ? q.questions.length : 0), 0)
                : 0;
              return (
                <TouchableOpacity key={sub.id} style={styles.subfolderCard} onPress={() => setSelectedSubfolder(sub)}>
                  <Text style={styles.subNum}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subTitle}>{sub.name}</Text>
                    <Text style={styles.subMeta}>{sets} Set | {questions} Questions</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* No content message */}
        {(!Array.isArray(folder.subfolders) || folder.subfolders.length === 0) && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateIcon}>📚</Text>
              <Text style={styles.emptyStateTitle}>No Content Available</Text>
              <Text style={styles.emptyStateMessage}>No chapters found in this folder.</Text>
              <Text style={styles.emptyStateHint}>Please ask the admin to add content to this folder.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB', paddingTop: 0 },
  
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB' },
  notFound: { fontSize: 20, color: '#888888', marginBottom: 16 },
  
  // Header Styling
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: { 
    padding: 12, 
    backgroundColor: '#ffffff', 
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  homeBtn: { 
    padding: 12, 
    backgroundColor: '#ffffff', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  homeBtnText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Title Area
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  subfolderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  subNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F6FB',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
    color: '#2962FF',
    marginRight: 12,
    fontSize: 18,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2962FF',
  },
  subMeta: {
    fontSize: 14,
    color: '#6C7A93',
  },
  arrow: {
    fontSize: 28,
    color: '#6C7A93',
    marginLeft: 10,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  quizNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F6FB',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
    color: '#2962FF',
    marginRight: 12,
    fontSize: 18,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2962FF',
  },
  quizMeta: {
    fontSize: 14,
    color: '#6C7A93',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  lastAttemptText: {
    color: '#6C7A93',
    fontSize: 13,
    marginTop: 4,
  },
  neverAttemptText: {
    color: '#22c55e',
    fontSize: 13,
    marginTop: 4,
  },
  playBtn: {
    marginLeft: 10,
    backgroundColor: '#4F8CFF',
    borderRadius: 22,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noQuiz: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 16,
    marginVertical: 20,
  },
  // Empty State Styling
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    minWidth: '85%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default FolderSubfolders;

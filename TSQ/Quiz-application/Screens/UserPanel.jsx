import React, { useState, useEffect, useContext } from 'react';
import { Picker } from '@react-native-picker/picker';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert, Modal, FlatList, SafeAreaView, BackHandler, StatusBar, Platform } from 'react-native';
import PlayButton from '../components/PlayButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOLDERS_STORAGE_KEY = 'quizAppFolders';
const CHILD_SESSION_KEY = 'quizAppSessionId';
const DRAFT_STORAGE_KEY = 'quizAppDrafts';
const DEFAULT_PER_Q_SECONDS = 15;


import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';

const UserPanel = (props) => {
  const context = useContext(AppContext);
  const navigation = props.navigation || useNavigation();
  // Get username from navigation params, context, or props
  const route = props.route;
  const username = (context && context.childName) || 
                  (route && route.params && route.params.username) || 
                  props.username;

  // Add a function to reload folders from AsyncStorage
  const reloadFolders = async () => {
    try {
      const raw = await AsyncStorage.getItem(FOLDERS_STORAGE_KEY);
      setFolders(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setFolders([]);
    }
  };

  // Load quiz results from AsyncStorage
  const loadQuizResults = async () => {
    try {
      const results = await AsyncStorage.getItem('quizAppResults');
      if (results) {
        setAllResults(JSON.parse(results));
      }
    } catch (error) {
      console.error('Error loading quiz results:', error);
    }
  };
  

  const handleLogout = () => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation.navigate) {
      navigation.navigate('MainScreen');
    }
  };

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Only navigate back if not already at root
        if (navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else if (navigation.navigate) {
          navigation.navigate('MainScreen');
        }
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        if (subscription && subscription.remove) subscription.remove();
      };
    }, [navigation])
  );

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      reloadFolders();
      loadDrafts();
      loadQuizResults();
    }, [])
  );

  const [folders, setFolders] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [folderFilter, setFolderFilter] = useState('all');
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(DEFAULT_PER_Q_SECONDS);
  const [resumeDraft, setResumeDraft] = useState(null);
  const [showResultPage, setShowResultPage] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [allResults, setAllResults] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [showResumeDraft, setShowResumeDraft] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const displayName = username || 'Client 1';

  // Load folders from AsyncStorage on mount
  useEffect(() => {
    reloadFolders();
    loadDrafts();
  }, []);

  // Load saved drafts
  const loadDrafts = async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      const allDrafts = raw ? JSON.parse(raw) : [];
      // Filter drafts for current user
      const userDrafts = allDrafts.filter(draft => 
        draft.childName === displayName && 
        draft.currentQIndex < (draft.totalQuestions - 1 || 0)
      );
      setDrafts(userDrafts);
    } catch (e) {
      setDrafts([]);
    }
  };

  // Save draft to AsyncStorage
  const saveDraft = async (draftData) => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      let allDrafts = raw ? JSON.parse(raw) : [];
      
      // Remove existing draft for this quiz and user
      allDrafts = allDrafts.filter(draft => 
        !(draft.quizId === draftData.quizId && draft.childName === displayName)
      );
      
      // Add new draft if not completed
      if (draftData && draftData.currentQIndex < (draftData.totalQuestions - 1)) {
        allDrafts.push({
          ...draftData,
          childName: displayName,
          savedAt: new Date().toISOString()
        });
      }
      
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(allDrafts));
      loadDrafts(); // Reload drafts
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  };

  // Delete draft
  const deleteDraft = async (quizId) => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      let allDrafts = raw ? JSON.parse(raw) : [];
      allDrafts = allDrafts.filter(draft => 
        !(draft.quizId === quizId && draft.childName === displayName)
      );
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(allDrafts));
      loadDrafts();
    } catch (e) {
      console.error('Failed to delete draft:', e);
    }
  };

  // Helper to flatten all quizzes from folders and subfolders
  const getAllQuizzes = (foldersArray = folders, parentPath = '') => {
    const result = [];
    foldersArray.forEach(folder => {
      const currentPath = parentPath ? `${parentPath} > ${folder.name}` : folder.name;
      (folder.quizzes || []).forEach(quiz => {
        result.push({
          ...quiz,
          folderName: currentPath,
          folderId: folder.id,
          folderPath: currentPath.split(' > ')
        });
      });
      if (folder.subfolders && folder.subfolders.length > 0) {
        result.push(...getAllQuizzes(folder.subfolders, currentPath));
      }
    });
    return result;
  };

  const allAvailableQuizzes = getAllQuizzes();
  
  // Debug log to check if we have quizzes
  useEffect(() => {
    console.log('UserPanel - All available quizzes:', allAvailableQuizzes.length);
    console.log('UserPanel - folders count:', folders.length);
    if (allAvailableQuizzes.length > 0) {
      console.log('UserPanel - First quiz:', allAvailableQuizzes[0]);
    }
  }, [allAvailableQuizzes, folders]);

  const handleStartQuiz = (quiz, draft = null) => {
    console.log('Play button pressed, quiz:', quiz?.title);
    console.log('Navigation object:', navigation);
    
    if (!quiz) {
      console.error('No quiz provided to handleStartQuiz');
      Alert.alert('Error', 'Quiz data is missing');
      return;
    }
    
    // Validate quiz has questions
    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      console.error('Quiz has no questions or invalid questions array:', quiz);
      Alert.alert('Error', 'This quiz has no questions available');
      return;
    }
    
    if (!navigation) {
      console.error('Navigation is not available');
      Alert.alert('Error', 'Navigation is not available');
      return;
    }
    
    setLoadingQuiz(quiz.id);
    setResumeDraft(draft);
    
    try {
      // Simulate loading delay for better UX
      setTimeout(() => {
        console.log('Navigating to QuizScreen with quiz:', quiz.title);
        navigation.navigate('QuizScreen', {
          quiz: {
            ...quiz,
            questions: quiz.questions || []
          },
          timePerQuestion: timePerQuestion,
          resumeDraft: draft && draft.quizId === quiz.id ? draft : null,
          sessionId: CHILD_SESSION_KEY
        });
        setLoadingQuiz(null);
        setShowResumeDraft(false);
      }, 500);
    } catch (error) {
      console.error('Error starting quiz:', error);
      Alert.alert('Error', 'Failed to start quiz');
      setLoadingQuiz(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        translucent={false}
        backgroundColor="#ffffff"
        animated={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>⋮</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.header}>Quiz Dashboard</Text>
          <Text style={styles.subHeader}>Select and take quizzes from organized folders</Text>
          <Text style={styles.welcome}>Welcome, {displayName}</Text>
        </View>

        {/* Menu Modal */}
        <Modal visible={menuOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.menuModal}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, color: '#333333', flex: 1 }}>Time per question (sec)</Text>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="numeric"
                  value={String(timePerQuestion)}
                  onChangeText={v => setTimePerQuestion(Number(v) || DEFAULT_PER_Q_SECONDS)}
                />
              </View>
              <TouchableOpacity style={styles.resultBtn} onPress={() => { setShowResultPage(true); setMenuOpen(false); }}>
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>🎯 View Result Page</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setMenuOpen(false)}>
                <Text style={{ color: '#333333', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Resume Draft Section */}
        {drafts.length > 0 && (
          <View style={styles.resumeDraftContainer}>
            <Text style={styles.resumeDraftTitle}>Quiz start from where you have left</Text>
            {drafts.map((draft, index) => {
              const quiz = allAvailableQuizzes.find(q => q.id === draft.quizId);
              if (!quiz) return null;
              
              return (
                <View key={draft.quizId} style={styles.draftCard}>
                  <View style={styles.draftInfo}>
                    <Text style={styles.draftQuizTitle}>{draft.quizTitle}</Text>
                    <Text style={styles.draftProgress}>
                      Q{draft.currentQIndex + 1} / {draft.totalQuestions} Question
                    </Text>
                  </View>
                  <View style={styles.draftActions}>
                    <TouchableOpacity 
                      style={styles.startDraftBtn}
                      onPress={() => handleStartQuiz(quiz, draft)}
                    >
                      <Text style={styles.startDraftBtnText}>Start</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.discardDraftBtn}
                      onPress={() => {
                        Alert.alert(
                          'Discard Draft',
                          'Are you sure you want to discard this saved progress?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Discard', style: 'destructive', onPress: () => deleteDraft(draft.quizId) }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.discardDraftBtnText}>Discard</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Available Quizzes Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Available Quizzes</Text>
          <View style={styles.folderGridContainer}>
            {folders.map((folder, idx) => {
              const chapters = Array.isArray(folder.subfolders) ? folder.subfolders.length : 0;
              const countSetsAndQuestions = (f) => {
                let sets = 0, questions = 0;
                if (Array.isArray(f.quizzes)) {
                  sets += f.quizzes.length;
                  questions += f.quizzes.reduce((sum, q) => sum + (Array.isArray(q.questions) ? q.questions.length : 0), 0);
                }
                if (Array.isArray(f.subfolders)) {
                  f.subfolders.forEach(sub => {
                    const res = countSetsAndQuestions(sub);
                    sets += res.sets;
                    questions += res.questions;
                  });
                }
                return { sets, questions };
              };
              const { sets, questions } = countSetsAndQuestions(folder);
              
              // Card colors (cycle through) - matching web version
              const cardColors = ['#4da3ff', '#2ecc71', '#b97aff', '#ff6fcf', '#ffc93c', '#2ed9c3'];
              const color = cardColors[idx % cardColors.length];
              
              return (
                <TouchableOpacity
                  key={folder.id || folder.name}
                  style={[styles.folderCard, { backgroundColor: color }]}
                  onPress={() => navigation.navigate('FolderSubfolders', { folderId: folder.id })}
                  activeOpacity={0.9}
                >
                  <Text style={styles.folderCardTitle}>{folder.name}</Text>
                  <Text style={styles.folderCardChapter}>{chapters} Chapter</Text>
                  <View style={styles.cardDivider} />
                  <Text style={styles.folderCardDetails}>{sets} Set / {questions} Question</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quiz Organization Section */}
        <View style={styles.organizationContainer}>
          <Text style={styles.organizationTitle}>Quiz Organization</Text>
          
          {/* Folder Filter Dropdown */}
          {allAvailableQuizzes.length > 0 && (
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={folderFilter}
                style={styles.picker}
                onValueChange={(itemValue) => setFolderFilter(itemValue)}
              >
                <Picker.Item label="All Folders" value="all" />
                {[...new Set(allAvailableQuizzes.map(q => q.folderName))].map(folderPath => (
                  <Picker.Item key={folderPath} label={folderPath} value={folderPath} />
                ))}
              </Picker>
              
              {/* Folder Quiz Counts */}
              <View style={styles.folderCountsContainer}>
                {(() => {
                  const folderCounts = {};
                  allAvailableQuizzes.forEach(quiz => {
                    folderCounts[quiz.folderName] = (folderCounts[quiz.folderName] || 0) + 1;
                  });
                  return Object.entries(folderCounts).map(([folderPath, count]) => (
                    <View key={folderPath} style={styles.folderCountRow}>
                      <Text style={styles.folderCountText}>📁 {folderPath.split(' > ')[0]}</Text>
                      <Text style={styles.folderCountBadge}>{count} Quiz{count !== 1 ? 'zes' : ''}</Text>
                    </View>
                  ));
                })()}
              </View>
            </View>
          )}
        </View>

        {/* Uploade Quiz Section */}
        <View style={styles.uploadQuizContainer}>
          <Text style={styles.uploadQuizTitle}>Uploaded Quiz</Text>
          
          /* Quiz List */
                <View style={styles.quizListContainer}>
                {allAvailableQuizzes.length === 0 ? (
                  <Text style={styles.noQuizText}>No quizzes available yet. Ask Admin to create folders and quizzes!</Text>
                ) : (
                  allAvailableQuizzes
                  .filter(quiz => folderFilter === 'all' || quiz.folderName === folderFilter)
                  .map((quiz, idx) => (
                    <View key={quiz.id} style={styles.quizListItem}>
                    <View style={styles.quizNumberContainer}>
                      <Text style={styles.quizNumber}>{idx + 1}</Text>
                    </View>
                    <View style={styles.quizInfoContainer}>
                      <View style={styles.folderPathContainer}>
                      <Text style={styles.folderPathText}>
                        📁 {quiz.folderPath.join(' > ')}
                      </Text>
                      </View>
                      <Text style={styles.quizTitle}>{quiz.title} </Text>
                      <Text style={styles.quizQuestions}>
                      {(quiz.questions && Array.isArray(quiz.questions)) ? quiz.questions.length : 0} Questions
                      </Text>
                      {quiz.createdAt && (
                      <View style={styles.quizDateContainer}>
                        <Text style={styles.quizDate}>{new Date(quiz.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                        })}</Text>
                        <Text style={styles.quizTime}>{new Date(quiz.createdAt).toLocaleTimeString('en-US', {
                        hour12: true,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                        })}</Text>
                      </View>
                      )}
                    </View>
                    <PlayButton
                      size={44}
                      loading={loadingQuiz === quiz.id}
                      disabled={loadingQuiz === quiz.id}
                      onPress={() => {
                      console.log('Play button pressed for quiz:', quiz.title);
                      handleStartQuiz(quiz);
                      }}
                    />
                    </View>
                  ))
                )}
                </View>
                    
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  backBtnText: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  
  menuBtnText: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  subHeader: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: 280,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  resultBtn: {
    backgroundColor: '#4F8CFF',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  closeMenuBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  
  // Section Styles
  sectionContainer: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  // Resume Draft Section
  resumeDraftContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  resumeDraftTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 20,
    textAlign: 'center',
  },
  draftCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 0,
  },
  draftInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  draftQuizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  draftProgress: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  draftDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  draftActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  startDraftBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  startDraftBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  discardDraftBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  discardDraftBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Available Quizzes Cards - Grid Layout
  folderGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 12,
  },
  folderCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    minHeight: 120,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderCardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  folderCardChapter: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  folderCardDetails: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  cardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 8,
  },

  // Legacy quiz cards styles (keeping for compatibility)
  quizCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  singleCardContainer: {
    alignItems: 'center',
  },
  multipleCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  availableQuizCard: {
    borderRadius: 12,
    padding: 20,
    minHeight: 90,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 12,
    justifyContent: 'center',
    transform: [{ scale: 1 }], // Base scale for potential animation
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cardDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginVertical: 6,
    alignSelf: 'center',
  },
  singleCard: {
    width: '75%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  doubleCard: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '48%',
    marginBottom: 8,
  },
  multipleCard: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '48%',
    marginBottom: 8,
    aspectRatio: 1.2,
  },
  
  // New Grid Card Styles (matching web version)
  folderGridCard: {
    borderRadius: 12,
    padding: 20,
    minHeight: 90,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleGridCard: {
    width: '80%',
    maxWidth: 350,
    alignSelf: 'center',
    minHeight: 120,
  },
  doubleGridCard: {
    width: '48%',
    minHeight: 100,
  },
  multipleGridCard: {
    width: '48%',
    minHeight: 90,
    marginHorizontal: '1%',
  },
  gridCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  gridCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridCardChapter: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  gridCardDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginVertical: 6,
    alignSelf: 'center',
  },
  gridCardDetails: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  
  availableQuizCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 22,
  },
  availableQuizCardChapter: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  availableQuizCardDetails: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  
  // Quiz Organization Section
  organizationContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  organizationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dropdownContainer: {
    color: '#1a1a1a',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  picker: {
    height: 50,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  folderCountsContainer: {
    marginTop: 8,
  },
  folderCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  folderCountText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  folderCountBadge: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    color: '#666666',
  },
  
  // Upload Quiz Section
  uploadQuizContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadQuizTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
  },
  quizListContainer: {
    flex: 1,
  },
  noQuizText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 20,
  },
  
  // Quiz List Item
  quizListItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#e0e6ed',
  },
  quizNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quizNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  quizInfoContainer: {
    flex: 1,
  },
  folderPathContainer: {
    marginBottom: 4,
  },
  folderPathText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  quizQuestions: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  quizDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizDate: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  quizTime: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  playButton: {
  // Legacy style retained for compatibility if referenced elsewhere
  },
  playButtonLoading: {
  // Not used with new PlayButton component; kept to avoid breakages
  },
  playButtonText: {
  // Not used with new PlayButton component
  },
  quizButtonsContainer: {
    alignItems: 'center',
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6b7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
});

export default UserPanel;

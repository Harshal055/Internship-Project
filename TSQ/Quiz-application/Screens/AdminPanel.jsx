import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Appearance, BackHandler, StatusBar, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import { useNavigation } from '@react-navigation/native';
import { AppContext, FOLDERS_STORAGE_KEY } from '../context/AppContext';


const AdminPanel = (props) => {
  const navigation = useNavigation();
  const context = useContext(AppContext);
  const { handleLogout, setErrorMessage, errorMessage } = context || {};
  
  // Get system theme
  const [isDarkTheme, setIsDarkTheme] = useState(Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkTheme(colorScheme === 'dark');
    });
    return () => subscription?.remove();
  }, []);

  // Load quiz history on component mount and filter change
  useEffect(() => {
    loadQuizHistory();
  }, [quizFilter]);

  // Diagnostics for import preview, errors, and mapping
  const [importDiagnostics, setImportDiagnostics] = useState(null);
  // Column mapping state for import
  const [columnMap, setColumnMap] = useState({ question: '', options: [], correctAnswer: '', explanation: '' });
  // Advanced quiz import states
  const [importHeaders, setImportHeaders] = useState([]);
  const [importRows, setImportRows] = useState([]);
  const [importDebug, setImportDebug] = useState(null);
  const [importError, setImportError] = useState('');
  
  // Sample folders data
  const SAMPLE_FOLDERS = [
    {
      id: '1',
      name: 'Sample Folder',
      quizzes: [],
      subfolders: []
    }
  ];
  
  // Additional missing state variables
  const [pendingTitle, setPendingTitle] = useState('');

  // Quiz History State
  const [quizHistory, setQuizHistory] = useState([]);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const [quizFilter, setQuizFilter] = useState('All quizzes');

  // Custom Alert Modal States
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info', // 'success', 'error', 'warning', 'info'
    buttons: [],
    onClose: null
  });

  // Custom Alert Function
  const showCustomAlert = (title, message, type = 'info', buttons = null) => {
    const defaultButtons = buttons || [
      {
        text: 'OK',
        style: 'default',
        onPress: () => setCustomAlert(prev => ({ ...prev, visible: false }))
      }
    ];

    setCustomAlert({
      visible: true,
      title,
      message,
      type,
      buttons: defaultButtons,
      onClose: () => setCustomAlert(prev => ({ ...prev, visible: false }))
    });
  };

  // Load Quiz History
  const loadQuizHistory = async () => {
    try {
      const results = await AsyncStorage.getItem('quizAppResults');
      if (results) {
        const parsedResults = JSON.parse(results);
        let filteredResults = parsedResults;
        
        // Apply filter
        switch (quizFilter) {
          case 'Recent':
            // Show only last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filteredResults = parsedResults.filter(result => 
              new Date(result.timestamp || result.date) >= weekAgo
            );
            break;
          case 'High Scores':
            // Show only scores >= 80%
            filteredResults = parsedResults.filter(result => 
              ((result.score || 0) / (result.totalQuestions || 1)) >= 0.8
            );
            break;
          case 'Low Scores':
            // Show only scores < 60%
            filteredResults = parsedResults.filter(result => 
              ((result.score || 0) / (result.totalQuestions || 1)) < 0.6
            );
            break;
          default:
            filteredResults = parsedResults;
        }
        
        // Sort by date (newest first)
        const sortedResults = filteredResults.sort((a, b) => 
          new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
        );
        setQuizHistory(sortedResults);
      } else {
        setQuizHistory([]);
      }
    } catch (error) {
      console.error('Error loading quiz history:', error);
      showCustomAlert('Error', 'Failed to load quiz history', 'error');
      setQuizHistory([]);
    }
  };

  // Delete Quiz History Item
  const deleteQuizHistoryItem = async (itemId) => {
    try {
      const results = await AsyncStorage.getItem('quizAppResults');
      if (results) {
        const parsedResults = JSON.parse(results);
        const filteredResults = parsedResults.filter(result => result.id !== itemId);
        await AsyncStorage.setItem('quizAppResults', JSON.stringify(filteredResults));
        setQuizHistory(filteredResults);
        showCustomAlert('Success', 'Quiz result deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting quiz history item:', error);
      showCustomAlert('Error', 'Failed to delete quiz result', 'error');
    }
  };

  // Clear All Quiz History
  const clearAllQuizHistory = () => {
    showCustomAlert(
      'Confirm Delete',
      'Are you sure you want to delete all quiz history? This action cannot be undone.',
      'warning',
      [
        {
          text: 'Cancel',
          style: 'default',
          onPress: () => setCustomAlert(prev => ({ ...prev, visible: false }))
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('quizAppResults');
              setQuizHistory([]);
              setCustomAlert(prev => ({ ...prev, visible: false }));
              showCustomAlert('Success', 'All quiz history deleted successfully', 'success');
            } catch (error) {
              console.error('Error clearing quiz history:', error);
              showCustomAlert('Error', 'Failed to clear quiz history', 'error');
            }
          }
        }
      ]
    );
  };

  const [pendingImport, setPendingImport] = useState(null);

  // File input handler
  const handleAdvancedFileUpload = async (e) => {
    let jsonRows = [];
    let text = null;
    let workbook = null;
    let fileUri = '';
    let fileName = '';
    let fileExt = '';
    let debugInfo = { fileUri: '', fileName: '', fileExt: '', readMethod: '' };
    try {
      if (e && e.uri) {
        fileUri = e.uri;
        fileName = e.name || '';
        debugInfo.fileUri = fileUri;
        debugInfo.fileName = fileName;
      } else if (e && e.target && e.target.files && e.target.files[0]) {
        fileUri = e.target.files[0].uri;
        fileName = e.target.files[0].name;
        debugInfo.fileUri = fileUri;
        debugInfo.fileName = fileName;
      }
      fileExt = (fileName || '').split('.').pop().toLowerCase();
      debugInfo.fileExt = fileExt;
      const binaryExts = ['xls', 'xlsx', 'ods'];
      const isBinary = binaryExts.includes(fileExt);
      
      // Validate file URI
      if (!fileUri) {
        throw new Error('No file URI provided');
      }
      
      if (fileUri && (fileUri.startsWith('file:') || fileUri.startsWith('content:') || fileUri.startsWith('data:'))) {
        try {
          if (isBinary) {
            const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
            workbook = XLSX.read(base64, { type: 'base64' });
            debugInfo.readMethod = 'direct-base64';
          } else {
            text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
            debugInfo.readMethod = 'direct-utf8';
          }
        } catch (errRead) {
          console.log('Direct read failed, trying cache copy:', errRead.message);
          try {
            const dest = FileSystem.cacheDirectory + `import-${Date.now()}.${fileExt}`;
            await FileSystem.copyAsync({ from: fileUri, to: dest });
            if (isBinary) {
              const base64 = await FileSystem.readAsStringAsync(dest, { encoding: FileSystem.EncodingType.Base64 });
              workbook = XLSX.read(base64, { type: 'base64' });
              debugInfo.readMethod = 'cache-base64';
            } else {
              text = await FileSystem.readAsStringAsync(dest, { encoding: FileSystem.EncodingType.UTF8 });
              debugInfo.readMethod = 'cache-utf8';
            }
          } catch (errCopy) {
            debugInfo.readMethod = 'cache-failed';
            setImportDebug(debugInfo);
            setImportDiagnostics({ status: 'error', note: 'Could not access file contents (content URI).'});
            setImportHeaders([]);
            setImportRows([]);
            return;
          }
        }
      } else {
        // Fallback: try fetch for remote http/https URLs only
        if (!fileUri || !(fileUri.startsWith('http://') || fileUri.startsWith('https://'))) {
          debugInfo.readMethod = 'unsupported-uri';
          setImportDebug(debugInfo);
          const errorMsg = `Unsupported file URI: ${fileUri ? fileUri.substring(0, 50) : 'No URI'}... 
          Please try selecting the file again or choose a different file.`;
          setImportDiagnostics({ status: 'error', note: errorMsg });
          setImportHeaders([]);
          setImportRows([]);
          showCustomAlert('File Error', errorMsg, 'error');
          return;
        }
        const response = await fetch(fileUri);
        if (isBinary) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          try {
            workbook = XLSX.read(arrayBuffer, { type: 'array' });
            debugInfo.readMethod = 'fetch-array';
          } catch (e) {
            debugInfo.readMethod = 'fetch-array-failed';
            setImportDebug(debugInfo);
            setImportDiagnostics({ status: 'error', note: 'Invalid spreadsheet file.' });
            setImportHeaders([]);
            setImportRows([]);
            return;
          }
        } else {
          text = await response.text();
          debugInfo.readMethod = 'fetch-text';
        }
      }
      setImportDebug(debugInfo);
      if (fileExt === 'json') {
        try {
          jsonRows = JSON.parse(text || '[]');
        } catch (e) {
          setImportDiagnostics({ status: 'error', note: 'Invalid JSON file.' });
          setImportHeaders([]);
          setImportRows([]);
          return;
        }
      } else if (fileExt === 'tsv') {
        jsonRows = (text || '').split('\n').map(row => (row || '').split('\t').map(cell => String(cell || '').trim()));
      } else if (fileExt === 'csv') {
        jsonRows = (text || '').split('\n').map(row => (row || '').split(',').map(cell => String(cell || '').trim()));
      } else {
        // binary workbook path (XLSX/ODS)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      }
      let headerRowIndex = 0;
      let rawHeaders = (jsonRows[headerRowIndex] || []).map(h => String(h || '').trim());
      if (Array.isArray(jsonRows) && jsonRows.length > 0 && typeof jsonRows[0] === 'object' && !Array.isArray(jsonRows[0])) {
        rawHeaders = Object.keys(jsonRows[0]);
      }
      if (!rawHeaders || rawHeaders.length === 0) {
        setImportDiagnostics({ status: 'error', note: 'No headers found in file.' });
        setImportHeaders([]);
        setImportRows([]);
        return;
      }
      setImportDiagnostics({
        fileName,
        rawHeaders,
        previewRows: jsonRows.slice(0, 5), // Keep preview limited for UI display
        allRows: jsonRows, // Store all rows for actual import
        status: 'preview',
        note: 'Preview loaded. Please map columns before saving.'
      });
      setColumnMap({ question: '', options: [], correctAnswer: '', explanation: '' });
      setImportHeaders(rawHeaders);
      setImportRows(jsonRows); // Store all rows, not just first 5
    } catch (err) {
      console.error('File upload error:', err);
      const errorMessage = `Error importing file: ${err.message}. 
      Please try selecting the file again or use a different file format.`;
      setImportDiagnostics({ status: 'error', note: errorMessage });
      setImportHeaders([]);
      setImportRows([]);
      showCustomAlert('Import Error', errorMessage, 'error');
    }
  };

  // Save imported quiz to folder after manual mapping
  const handleSaveImportedQuiz = (columnMap) => {
    if (!selectedFolderId || !importDiagnostics || !importDiagnostics.allRows) return;
    // Parse questions using mapped columns from ALL rows, not just preview
    const questions = [];
    const rows = importDiagnostics.allRows; // Use all rows instead of previewRows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let qText = row[columnMap.question];
      let opts = [];
      if (columnMap.options && Array.isArray(columnMap.options)) {
        opts = columnMap.options.map(idx => row[idx]).filter(Boolean);
      } else if (columnMap.options) {
        opts = String(row[columnMap.options] || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      }
      let corr = row[columnMap.correctAnswer];
      let explanation = columnMap.explanation ? row[columnMap.explanation] : '';
      if (qText && opts.length >= 2 && corr) {
        questions.push({ question: qText, options: opts, correctAnswer: corr, explanation });
      }
    }
    if (questions.length === 0) {
      setErrorMessage('No valid questions found after mapping.');
      return;
    }
    const newQuiz = { id: `quiz-${Date.now()}`, title: pendingTitle, questions, createdAt: new Date().toISOString() };
    setFolders(prev => updateFolderById(selectedFolderId, folder => ({
      ...folder,
      quizzes: [...(folder.quizzes || []), newQuiz]
    }), prev));
    setPendingImport(null);
    setPendingTitle('');
    setImportDiagnostics(null);
    setErrorMessage('');
    showCustomAlert('Success', `Quiz "${pendingTitle}" imported successfully with ${questions.length} questions!`, 'success');
  };
  
  // Missing handler functions
  const handleAdvancedSave = () => {
    if (!columnMap.question || columnMap.options.length < 2 || !columnMap.correctAnswer) {
      setImportError('Please map all required columns (question, at least 2 options, correct answer)');
      return;
    }
    if (!pendingTitle) {
      setPendingTitle(importDiagnostics?.fileName?.replace(/\.[^/.]+$/, '') || 'Imported Quiz');
    }
    handleSaveImportedQuiz(columnMap);
    setImportError('');
  };
  
  const resetMapping = () => {
    resetColumnMap();
    setImportError('');
  };
  
  // Check if import is valid
  const importIsValid = columnMap.question && columnMap.options.length >= 2 && columnMap.correctAnswer;
  const [folderName, setFolderName] = useState('');
  const [folders, setFolders] = useState([]);

  // Load folders from AsyncStorage on mount (fallback to sample)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(FOLDERS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (mounted) setFolders(parsed);
        } else {
          if (mounted) setFolders(SAMPLE_FOLDERS);
        }
      } catch (err) {
        console.warn('Failed to load folders from storage', err);
        if (mounted) setFolders(SAMPLE_FOLDERS);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Persist folders whenever they change
  useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders || []));
      } catch (err) {
        console.warn('Failed to save folders', err);
      }
    };
    save();
  }, [folders]);

  // Hardware back button handler for Android
  useEffect(() => {
    const backAction = () => {
      handleLogout();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleLogout]);

  const [selectedQuiz, setSelectedQuiz] = useState('all');

  // Get all quiz titles from folders
  const quizTitles = folders
    .flatMap(folder => folder.quizzes ? folder.quizzes.map(q => q.title) : [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // Helper: flatten and collect all quizzes (preserves folder path)
  const getAllQuizzes = (foldersArray = folders, parentPath = '') => {
    const out = [];
    (foldersArray || []).forEach(folder => {
      const currentPath = parentPath ? `${parentPath} > ${folder.name}` : folder.name;
      // add direct quizzes
      (folder.quizzes || []).forEach(q => {
        out.push({ ...q, folderId: folder.id, folderName: folder.name, folderPath: currentPath.split(' > ') });
      });
      // recurse into subfolders
      if (folder.subfolders && folder.subfolders.length > 0) {
        out.push(...getAllQuizzes(folder.subfolders, currentPath));
      }
    });
    return out;
  };

  // Add demo questions to selected folder
  const addDemoQuestions = () => {
    if (!selectedFolderId) {
      showCustomAlert('Error', 'Please select a folder first.', 'warning');
      return;
    }
    
    const demoQuestions = [
      {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        explanation: "Paris is the capital and largest city of France."
      },
      {
        question: "Which planet is closest to the Sun?",
        options: ["Venus", "Mercury", "Earth", "Mars"],
        correctAnswer: "Mercury",
        explanation: "Mercury is the innermost planet in our solar system."
      },
      {
        question: "What is 15 + 27?",
        options: ["40", "41", "42", "43"],
        correctAnswer: "42",
        explanation: "15 + 27 = 42"
      },
      {
        question: "Who wrote 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
        correctAnswer: "William Shakespeare",
        explanation: "Romeo and Juliet is a tragedy written by William Shakespeare."
      },
      {
        question: "What is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correctAnswer: "Pacific Ocean",
        explanation: "The Pacific Ocean is the largest and deepest ocean basin on Earth."
      }
    ];

    const demoQuiz = {
      id: `quiz-${Date.now()}`,
      title: 'Demo Quiz - Sample Questions',
      questions: demoQuestions,
      createdAt: new Date().toISOString()
    };

    setFolders(prev => updateFolderById(selectedFolderId, folder => ({
      ...folder,
      quizzes: [...(folder.quizzes || []), demoQuiz]
    }), prev));

    showCustomAlert('Success', 'Demo quiz with 5 questions has been added to the selected folder!', 'success');
  };

  // RN-friendly template download using expo-file-system + expo-sharing
  const downloadTemplate = async () => {
    try {
      const csvHeader = [
        'Question',
        'OptionA',
        'OptionB',
        'OptionC',
        'OptionD',
        'CorrectAnswer',
        'Explanation',
        'MediaURLs'
      ].join(',');
      const sampleRows = [
        ['What is 2 + 2?', '3', '4', '5', '6', '4', 'Basic math addition', ''],
        ['Capital of France?', 'Berlin', 'Madrid', 'Paris', 'Rome', 'Paris', 'Paris is the capital city of France', 'https://example.com/paris.jpg']
      ];
      const sample = sampleRows
        .map(r => r.map(v => typeof v === 'string' && v.includes(',') ? '"' + v.replace(/"/g, '""') + '"' : v).join(','))
        .join('\n');
      const content = [csvHeader, sample].join('\n');
      const path = FileSystem.cacheDirectory + 'quiz-template.csv';
      await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) {
        showCustomAlert('Share not available', 'Cannot open share dialog on this device.', 'warning');
        return;
      }
      await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch (err) {
      console.warn('Failed to create template', err);
      showCustomAlert('Error', 'Could not create/download template.', 'error');
    }
  };

  // Count quizzes including nested subfolders
  const countTotalQuizzes = (folder) => {
    if (!folder) return 0;
    let total = (folder.quizzes?.length || 0);
    if (folder.subfolders && folder.subfolders.length > 0) {
      folder.subfolders.forEach(sub => {
        total += countTotalQuizzes(sub);
      });
    }
    return total;
  };

  // Create folder logic
  const handleCreateFolder = () => {
    if (folderName.trim()) {
      setFolders(prev => [...prev, { id: Date.now().toString(), name: folderName.trim(), quizzes: [] }]);
      setFolderName('');
    }
  };

  // Clear all quizzes logic
  const handleClearAll = () => {
    setFolders(prev => prev.map(f => ({ ...f, quizzes: [] })));
    setSelectedQuiz('all');
  };

  // Refresh logic (dummy)
  const handleRefresh = () => {
    // In a real app, fetch latest results/quizzes from backend
  };

  // State for selected folder and subfolder creation
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  // when non-null, holds folderId where a new subfolder will be created
  const [showSubfolderInput, setShowSubfolderInput] = useState(null);
  const [subfolderName, setSubfolderName] = useState('');

  // Create subfolder logic (store nested under folders)
  const handleCreateSubfolder = (folderId) => {
    if (subfolderName.trim()) {
      const newSub = { id: Date.now().toString(), name: subfolderName.trim(), quizzes: [], subfolders: [] };
      setFolders(prev => updateFolderById(folderId, folder => ({
        ...folder,
        subfolders: [...(folder.subfolders || []), newSub]
      }), prev));
      setSubfolderName('');
      setShowSubfolderInput(null);
    }
  };

  // Add quiz to subfolder

  // Manual quiz creation states and handlers
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [manualQuestions, setManualQuestions] = useState([]);

  const handleAddQuestionToManualQuiz = () => {
    const optionsArr = newOptions.split(',').map(o => o.trim()).filter(Boolean);
    if (!newQuestionText || optionsArr.length < 2 || !newCorrectAnswer) return;
    setManualQuestions(prev => [
      ...prev,
      {
        question: newQuestionText,
        options: optionsArr,
        correctAnswer: newCorrectAnswer,
        explanation: newExplanation,
      }
    ]);
    setNewQuestionText('');
    setNewOptions('');
    setNewCorrectAnswer('');
    setNewExplanation('');
  };

  const handleSaveManualQuiz = () => {
    if (!selectedFolderId || !newQuizTitle || manualQuestions.length === 0) return;
    const newQuiz = {
      id: `quiz-${Date.now()}`,
      title: newQuizTitle,
      questions: manualQuestions,
      createdAt: new Date().toISOString(),
    };
    setFolders(prev => updateFolderById(selectedFolderId, folder => ({
      ...folder,
      quizzes: [...(folder.quizzes || []), newQuiz]
    }), prev));
    setNewQuizTitle('');
    setManualQuestions([]);
  };

  // Results logic (dummy for now)
  const [childResults, setChildResults] = useState([]);
  const RESULTS_STORAGE_KEY = 'quiz_results';
  const [resultsFilterQuiz, setResultsFilterQuiz] = useState('all');

  // Helper: update folder/subfolder by ID
  const updateFolderById = (folderId, updateFn, foldersArray = folders) => {
    return foldersArray.map(folder => {
      if (folder.id === folderId) {
        return updateFn(folder);
      }
      if (folder.subfolders && folder.subfolders.length > 0) {
        return {
          ...folder,
          subfolders: updateFolderById(folderId, updateFn, folder.subfolders)
        };
      }
      return folder;
    });
  };

  // Delete folder/subfolder
  const handleDeleteFolder = (folderId) => {
    setFolders(prev => removeFolderRecursive(prev, folderId));
    if (selectedFolderId === folderId) setSelectedFolderId(null);
  };
  const removeFolderRecursive = (foldersArray, targetId) => {
    return foldersArray.filter(folder => {
      if (folder.id === targetId) return false;
      if (folder.subfolders && folder.subfolders.length > 0) {
        folder.subfolders = removeFolderRecursive(folder.subfolders, targetId);
      }
      return true;
    });
  };

  // Delete quiz
  const handleDeleteQuiz = (folderId, quizId) => {
    setFolders(prev => updateFolderById(folderId, folder => ({
      ...folder,
      quizzes: (folder.quizzes || []).filter(q => q.id !== quizId)
    }), prev));
  };

  // Results logic (dummy for now)
  const handleClearAllResults = () => {
    setChildResults([]);
    AsyncStorage.removeItem(RESULTS_STORAGE_KEY);
  };

  // UI rendering
  // Helper to update column mapping
  const handleColumnMapChange = (field, value) => {
    setColumnMap(prev => ({ ...prev, [field]: value }));
  };
  // Helper to reset column mapping
  const resetColumnMap = () => setColumnMap({ question: '', options: [], correctAnswer: '', explanation: '' });

  // Helper functions for custom alerts
  const getAlertColor = (type) => {
    switch (type) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info':
      default: return '#3b82f6';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info':
      default: return 'ℹ️';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#e9efff', paddingTop: 5 }}>
      <StatusBar 
        barStyle="dark-content" 
        translucent={false}
        backgroundColor="#e9efff"
        animated={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      <ScrollView style={styles.safeArea}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 0 }}>
                            <TouchableOpacity
                              onPress={() => {
                                if (navigation && navigation.goBack) {
                                  navigation.goBack();
                                } else {
                                  showCustomAlert('Navigation Error', 'Navigation not available', 'error');
                                }
                              }}
                              style={{ padding: 4, marginRight: 8 }}
                              accessibilityLabel="Go back"
                            >
                              <Text style={{ fontSize: 28, color: '#1a1a1a', fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>←</Text>
                            </TouchableOpacity>
                            <Text style={styles.header}>Admin Dashboard</Text>
                          </View>
                          <Text style={styles.subHeader}>Manage quizzes and monitor results</Text>
                          {/* Fix: errorMessage property doesn't exist. Use importDiagnostics or Alert for errors. */}
                          {importDiagnostics && importDiagnostics.status === 'error' && (
                            <Text style={{ color: 'red', textAlign: 'center', marginBottom: 8 }}>{importDiagnostics.note || 'Import error.'}</Text>
                          )}

                          {/* Folder Management */}
                          <View style={styles.cardOuter}>
                            <Text style={styles.sectionTitle}>Folder Management</Text>
                            <Text style={styles.sectionDesc}>create and choice a folder to uploade Quizes</Text>
                            <View style={styles.row}>
                              <TextInput
                                style={styles.input}
                                placeholder={showSubfolderInput ? 'Enter subfolder name' : 'Enter folder name'}
                                value={showSubfolderInput ? subfolderName : folderName}
                                onChangeText={showSubfolderInput ? setSubfolderName : setFolderName}
                              />
                              <TouchableOpacity style={styles.createBtnWeb} onPress={() => {
                                if (showSubfolderInput) {
                                  handleCreateSubfolder(showSubfolderInput);
                                } else {
                                  handleCreateFolder();
                                }
                              }}>
                                <Text style={styles.createBtnText}>{showSubfolderInput ? '+ Add Sub' : '+ Create'}</Text>
                              </TouchableOpacity>
                            </View>
                            {showSubfolderInput && (
                              <View style={styles.subfolderInputBanner}>
                                <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>Creating subfolder in: {folders.find(f => f.id === showSubfolderInput)?.name}</Text>
                                <TouchableOpacity onPress={() => setShowSubfolderInput(null)}>
                                  <Text style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: 8 }}>✖</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                            {folders.length === 0 ? (
                              <View style={styles.center}>
                                <Text style={styles.noFolderIcon}>⭐</Text>
                                <Text style={styles.noFolderText}>No folders yet</Text>
                                <Text style={styles.noFolderSubText}>Create your first folder above</Text>
                              </View>
                            ) : (
                              folders.map(folder => (
                                <View key={folder.id} style={[styles.folderCardWeb, selectedFolderId === folder.id && styles.selectedCardWeb]}> 
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity onPress={() => setSelectedFolderId(folder.id)}>
                                      <View style={[styles.radioCircleWeb, selectedFolderId === folder.id && styles.radioSelectedWeb]}>
                                        {selectedFolderId === folder.id && <View style={styles.selectedRbWeb} />}
                                      </View>
                                    </TouchableOpacity>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.folderNameWeb}>{folder.name}</Text>
                                      <Text style={styles.folderQuizCountWeb}>{(folder.quizzes?.length || 0)} direct quizzes · {countTotalQuizzes(folder)} total</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <TouchableOpacity onPress={() => setShowSubfolderInput(folder.id)}>
                                        <Text style={styles.folderAddWeb}>＋</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => handleDeleteFolder(folder.id)}>
                                        <Text style={styles.folderDeleteWeb}>✖</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                  {/* Subfolders */}
                                  {folder.subfolders?.map(sub => (
                                    <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: 12 }}>
                                      <View style={styles.subfolderConnectorWeb} />
                                      <View style={[styles.folderCardWeb, selectedFolderId === sub.id && styles.selectedCardWeb, { borderWidth: 2, marginVertical: 6, flex: 1 }]}> 
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                          <TouchableOpacity onPress={() => setSelectedFolderId(sub.id)}>
                                            <View style={[styles.radioCircleWeb, selectedFolderId === sub.id && styles.radioSelectedWeb]}>
                                              {selectedFolderId === sub.id && <View style={styles.selectedRbWeb} />}
                                            </View>
                                          </TouchableOpacity>
                                          <View style={{ flex: 1 }}>
                                            <Text style={styles.folderNameWeb}>{sub.name}</Text>
                                            <Text style={styles.folderQuizCountWeb}>{(sub.quizzes?.length || 0)} direct quizzes</Text>
                                          </View>
                                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <TouchableOpacity onPress={() => handleDeleteFolder(sub.id)}>
                                              <Text style={styles.folderDeleteWeb}>✖</Text>
                                            </TouchableOpacity>
                                          </View>
                                        </View>
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              ))
                            )}
                          </View>


                          {/* Quiz Management UI: Only show when a folder is selected */}
                          {selectedFolderId && (
                            <>
                              {/* Quiz Management Header */}
                              <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Quiz Management</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                  <Text style={{ fontSize: 20, marginRight: 6 }}>📁</Text>
                                  <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
                                    {(() => {
                                      const folder = folders.find(f => f.id === selectedFolderId) ||
                                        folders.flatMap(f => f.subfolders || []).find(sub => sub.id === selectedFolderId);
                                      return folder ? folder.name : '';
                                    })()}
                                  </Text>
                                </View>
                              </View>

                              {/* Quiz Import from File */}
                              <View style={{ alignItems: 'center', marginTop: 8 }}>
                                <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#d3dbed', borderRadius: 16, padding: 20, width: '90%', backgroundColor: '#ffffff', marginBottom: 16 }}>
                                  <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 4 }]}>Upload Quiz File</Text>
                                  <Text style={{ textAlign: 'center', color: '#6b7280', marginBottom: 12 }}>Excel, CSV, TSV, ODS, JSON supported</Text>
                                  <View style={{ alignItems: 'center', marginBottom: 12 }}>
                                    <TouchableOpacity
                                      style={[styles.createBtn, { alignSelf: 'center', width: 140 }]} 
                                      onPress={async () => {
                                        // Use Expo DocumentPicker for file selection
                                        try {
                                          const res = await DocumentPicker.getDocumentAsync({
                                            type: [
                                              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                              'application/vnd.ms-excel',
                                              'application/vnd.oasis.opendocument.spreadsheet',
                                              'text/csv',
                                              'text/tab-separated-values',
                                              'application/json',
                                              '*/*',
                                            ],
                                            copyToCacheDirectory: true
                                          });
                                          
                                          if (res.type === 'cancel' || res.canceled) return;
                                          
                                          // Handle different response formats
                                          let fileToProcess;
                                          if (res.assets && res.assets.length > 0) {
                                            // New DocumentPicker format
                                            fileToProcess = res.assets[0];
                                          } else if (res.uri) {
                                            // Legacy format
                                            fileToProcess = res;
                                          } else {
                                            throw new Error('Invalid file selection response');
                                          }
                                          
                                          handleAdvancedFileUpload(fileToProcess);
                                        } catch (err) {
                                          setImportError('File selection failed: ' + err.message);
                                        }
                                      }}
                                    >
                                      <Text style={styles.createBtnText}>Choose File</Text>
                                    </TouchableOpacity>
                                  </View>
                                  <TouchableOpacity onPress={downloadTemplate} style={{ marginTop: 12, alignSelf: 'center' }}>
                                    <Text style={{ color: '#1062fe', textAlign: 'center', fontSize: 15 }}>📥 Download Template</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Upload Status - Show when file is uploaded successfully */}
                              {importDiagnostics && importDiagnostics.status === 'preview' && (
                                <View style={{ alignItems: 'center', marginTop: 16 }}>
                                  <View style={styles.uploadStatusCard}>
                                    <Text style={styles.uploadStatusTitle}>Upload Status</Text>
                                    <View style={styles.uploadSuccessContainer}>
                                      <View style={styles.successCheckmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                      </View>
                                      <Text style={styles.uploadSuccessText}>File Uploaded Successfully</Text>
                                    </View>
                                    <View style={styles.fileInfoContainer}>
                                      <Text style={styles.fileIcon}>📄</Text>
                                      <Text style={styles.fileName}>{importDiagnostics.fileName || 'quiz-file.csv'}</Text>
                                    </View>
                                    <Text style={styles.questionsInfo}>
                                      📊 {importDiagnostics.allRows?.length || 0} Questions found (showing first {Math.min(5, importDiagnostics.allRows?.length || 0)} in preview)
                                    </Text>
                                  </View>
                                </View>
                              )}

                              {/* Preview & Save Quiz - Show when file is processed */}
                              {importDiagnostics && importDiagnostics.status === 'preview' && (
                                <View style={{ alignItems: 'center', marginTop: 16 }}>
                                  <View style={styles.previewSaveCard}>
                                    <Text style={styles.previewSaveTitle}>Preview & Save Quiz</Text>
                                    
                                    <Text style={styles.quizTitleLabel}>Quiz Title</Text>
                                    <TextInput
                                      style={styles.quizTitleInput}
                                      placeholder="Enter quiz title"
                                      value={pendingTitle || (importDiagnostics.fileName?.replace(/\.[^/.]+$/, '') || '')}
                                      onChangeText={setPendingTitle}
                                    />
                                    
                                    <View style={styles.questionsReadyContainer}>
                                      <Text style={styles.questionsReadyIcon}>📊</Text>
                                      <Text style={styles.questionsReadyText}>
                                        {importDiagnostics.allRows?.length || 0} questions ready to import
                                      </Text>
                                    </View>
                                    
                                    {/* Preview Questions */}
                                    <View style={styles.questionPreviewContainer}>
                                      {importDiagnostics.previewRows?.slice(0, 3).map((row, idx) => {
                                        const questionText = Array.isArray(row) ? row[0] : (row.Question || Object.values(row)[0] || '');
                                        return (
                                          <Text key={idx} style={styles.questionPreviewText}>
                                            Q{idx + 1}: {String(questionText).substring(0, 50)}...
                                          </Text>
                                        );
                                      })}
                                      {(importDiagnostics.previewRows?.length || 0) > 3 && (
                                        <Text style={styles.moreQuestionsText}>
                                          +{(importDiagnostics.previewRows?.length || 0) - 3} more questions
                                        </Text>
                                      )}
                                    </View>
                                    
                                    {/* Action Buttons */}
                                    <View style={styles.actionButtonsContainer}>
                                      <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={() => {
                                          if (!pendingTitle) {
                                            setPendingTitle(importDiagnostics.fileName?.replace(/\.[^/.]+$/, '') || 'Imported Quiz');
                                          }
                                          // Auto-map columns based on common header names
                                          const autoMappedColumns = {
                                            question: importDiagnostics.rawHeaders.findIndex(h => 
                                              h.toLowerCase().includes('question') || h.toLowerCase().includes('q')
                                            ),
                                            options: importDiagnostics.rawHeaders.map((h, i) => 
                                              h.toLowerCase().includes('option') || h.toLowerCase().includes('choice') ? i : -1
                                            ).filter(i => i !== -1),
                                            correctAnswer: importDiagnostics.rawHeaders.findIndex(h => 
                                              h.toLowerCase().includes('correct') || h.toLowerCase().includes('answer')
                                            ),
                                            explanation: importDiagnostics.rawHeaders.findIndex(h => 
                                              h.toLowerCase().includes('explanation') || h.toLowerCase().includes('note')
                                            )
                                          };
                                          
                                          setColumnMap(autoMappedColumns);
                                          handleSaveImportedQuiz(autoMappedColumns);
                                        }}
                                      >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                      </TouchableOpacity>
                                      
                                      <TouchableOpacity
                                        style={styles.discardButton}
                                        onPress={() => {
                                          setImportDiagnostics(null);
                                          setImportHeaders([]);
                                          setImportRows([]);
                                          setPendingTitle('');
                                          resetColumnMap();
                                        }}
                                      >
                                        <Text style={styles.discardButtonText}>Discard</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </View>
                              )}

                              {importError && (
                                <Text style={{ color: 'red', textAlign: 'center', marginTop: 8 }}>{importError}</Text>
                              )}

                                  {/* Demo Questions Section */}
                                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                                    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#d3dbed', borderRadius: 16, padding: 20, width: '90%', backgroundColor: '#ffffff', marginBottom: 16 }}>
                                      <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 4, textAlign: 'center' }]}>Quick Start</Text>
                                      <Text style={{ textAlign: 'center', color: '#6b7280', marginBottom: 12 }}>Add sample questions to get started</Text>
                                      <TouchableOpacity
                                        style={[styles.createBtn, { alignSelf: 'center', width: 160, backgroundColor: isDarkTheme ? '#8B5A2B' : '#CD853F' }]} 
                                        onPress={addDemoQuestions}
                                      >
                                        <Text style={styles.createBtnText}>📋 Add Demo Quiz</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>

                                  {/* Manual Quiz Creation */}
                                  <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Create Quiz Manually</Text>
                                  </View>
                                  <View style={[styles.card, { marginTop: 0 }]}> 
                                    <Text style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 8 }}>Quiz Title</Text>
                                    <TextInput
                                      style={styles.input}
                                      placeholder="Enter quiz title"
                                      value={newQuizTitle}
                                      onChangeText={setNewQuizTitle}
                                    />
                                    <Text style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>Add New Question</Text>
                                    <TextInput
                                      style={styles.input}
                                      placeholder="Question text"
                                      value={newQuestionText}
                                      onChangeText={setNewQuestionText}
                                    />
                                    <TextInput
                                      style={styles.input}
                                      placeholder="Options (comma-separated)"
                                      value={newOptions}
                                      onChangeText={setNewOptions}
                                    />
                                    <TextInput
                                      style={styles.input}
                                      placeholder="Correct answer"
                                      value={newCorrectAnswer}
                                      onChangeText={setNewCorrectAnswer}
                                    />
                                    <TextInput
                                      style={styles.input}
                                      placeholder="Explanation (optional)"
                                      value={newExplanation}
                                      onChangeText={setNewExplanation}
                                    />
                                    <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: 'center' }}>
                                      <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#22c55e' }]} onPress={handleAddQuestionToManualQuiz}>
                                        <Text style={styles.createBtnText}>Add</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity style={[styles.clearBtn, { backgroundColor: '#ef4444' }]} onPress={() => { setNewQuestionText(''); setNewOptions(''); setNewCorrectAnswer(''); setNewExplanation(''); }}>
                                        <Text style={styles.clearBtnText}>Clear</Text>
                                      </TouchableOpacity>
                                    </View>
                                    {manualQuestions.length > 0 && (
                                      <TouchableOpacity style={[styles.createBtn, { marginTop: 8 }]} onPress={handleSaveManualQuiz}>
                                        <Text style={styles.createBtnText}>Save Quiz ({manualQuestions.length} questions)</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                            </>
                          )}

                          {/* Quizzes in selected folder/subfolder */}
                          <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Quizzes in Selected</Text>
                            {(() => {
                              const folder = findFolderById(selectedFolderId, folders);
                              if (!folder || !folder.quizzes || folder.quizzes.length === 0) {
                                return (
                                  <View style={styles.center}>
                                    <Text style={styles.noFolderIcon}>⭐</Text>
                                    <Text style={styles.noFolderText}>No quizzes yet</Text>
                                  </View>
                                );
                              }
                              return folder.quizzes.map(quiz => (
                                <View key={quiz.id} style={styles.subfolderCard}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{quiz.title}</Text>
                                    <Text style={{ color: '#6b7280' }}>{(quiz.questions?.length || 0)} questions</Text>
                                  </View>
                                  <TouchableOpacity onPress={() => handleDeleteQuiz(folder.id, quiz.id)}>
                                    <Text style={styles.folderDelete}>✖</Text>
                                  </TouchableOpacity>
                                </View>
                              ));
                            })()}
                          </View>

                          

                          {/* Quiz History Section */}
                          <View style={styles.cardOuter}>
                            <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 20, fontSize: 24, fontWeight: '600' }]}>Quiz Results</Text>
                            
                            {/* Filter and Controls */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                              <View style={styles.pickerContainer}>
                                <Picker
                                  selectedValue={quizFilter}
                                  onValueChange={(itemValue) => setQuizFilter(itemValue)}
                                  style={styles.pickerStyle}
                                >
                                  <Picker.Item label="All quizzes" value="All quizzes" />
                                  <Picker.Item label="Recent" value="Recent" />
                                  <Picker.Item label="High Scores" value="High Scores" />
                                  <Picker.Item label="Low Scores" value="Low Scores" />
                                </Picker>
                              </View>
                              
                              <TouchableOpacity 
                                style={styles.refreshButton} 
                                onPress={loadQuizHistory}
                              >
                                <Text style={styles.refreshButtonText}>Refresh</Text>
                              </TouchableOpacity>
                            </View>
                            
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                              <TouchableOpacity 
                                style={styles.clearAllButton} 
                                onPress={clearAllQuizHistory}
                              >
                                <Text style={styles.clearAllButtonText}>Clear All</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Quiz Results List */}
                            {quizHistory.length === 0 ? (
                              <View style={styles.center}>
                                 <Text style={styles.noFolderIcon}>⭐</Text>
                                <Text style={styles.noFolderText}>No quiz history found</Text>
                                <Text style={styles.noFolderSubText}>Quiz attempts will appear here when students complete quizzes</Text>
                              </View>
                            ) : (
                              <View style={{ width: '100%' }}>
                                {quizHistory.map((result, idx) => (
                                  <View key={result.id || idx} style={styles.quizResultCard}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.quizResultTitle}>
                                          {result.childName || 'Unknown'}
                                        </Text>
                                        <Text style={styles.quizResultId}>
                                          {result.id || `1755539${idx}...`}
                                        </Text>
                                        <Text style={styles.quizResultQuizName}>
                                          {result.quizTitle || 'quiz-template'} ({result.totalQuestions || 0})
                                        </Text>
                                        <Text style={styles.quizResultScore}>
                                          Score: {result.score || 0} / {result.totalQuestions || 0}
                                        </Text>
                                        <Text style={styles.quizResultTime}>
                                          Time: {result.timeUsed ? `0:${String(result.timeUsed % 60).padStart(2, '0')}` : '0:02'}
                                        </Text>
                                        <Text style={styles.quizResultDate}>
                                          {new Date(result.timestamp || result.date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                          })}, {new Date(result.timestamp || result.date).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                        </Text>
                                      </View>
                                      <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.quizResultPercentage}>
                                          {Math.round(((result.score || 0) / (result.totalQuestions || 1)) * 100)}%
                                        </Text>
                                        <TouchableOpacity 
                                          onPress={() => deleteQuizHistoryItem(result.id)}
                                          style={styles.deleteButton}
                                        >
                                          <Text style={styles.deleteButtonText}>✕</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        </ScrollView>

                        {/* Custom Alert Modal */}
                        <Modal
                          visible={customAlert.visible}
                          transparent={true}
                          animationType="fade"
                          onRequestClose={customAlert.onClose}
                        >
                          <View style={styles.alertOverlay}>
                            <View style={[styles.alertContainer, { borderColor: getAlertColor(customAlert.type) }]}>
                              <View style={[styles.alertHeader, { backgroundColor: getAlertColor(customAlert.type) }]}>
                                <Text style={styles.alertIcon}>{getAlertIcon(customAlert.type)}</Text>
                                <Text style={styles.alertTitle}>{customAlert.title}</Text>
                              </View>
                              <View style={styles.alertBody}>
                                <Text style={styles.alertMessage}>{customAlert.message}</Text>
                              </View>
                              <View style={styles.alertFooter}>
                                {customAlert.buttons.map((button, index) => (
                                  <TouchableOpacity
                                    key={index}
                                    style={[
                                      styles.alertButton,
                                      { backgroundColor: button.style === 'destructive' ? '#ef4444' : getAlertColor(customAlert.type) }
                                    ]}
                                    onPress={button.onPress}
                                  >
                                    <Text style={styles.alertButtonText}>{button.text}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        </Modal>
                      </SafeAreaView>
                    );
}

// Helper: find folder/subfolder by ID (accept foldersArray explicitly)
function findFolderById(folderId, foldersArray) {
  if (!foldersArray) return null;
  for (const folder of foldersArray) {
    if (folder.id === folderId) return folder;
    if (folder.subfolders && folder.subfolders.length > 0) {
      const found = findFolderById(folderId, folder.subfolders);
      if (found) return found;
    }
  }
  return null;
}

const theme = Appearance.getColorScheme();

const styles = StyleSheet.create({
  folderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  folderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    marginRight: 8,
  },
  folderQuizCount: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 8,
  },
  folderAdd: {
    fontSize: 18,
    color: '#a259f7',
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  folderDelete: {
    fontSize: 18,
    color: '#f87171',
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#a259f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#a259f7',
  },
  subfolderCardNew: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    marginLeft: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subfolderCardHighlight: {
    borderColor: '#1062fe',
    backgroundColor: '#e9f0ff',
    borderWidth: 2,
    shadowColor: '#1062fe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  subfolderConnector: {
    width: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#dbeafe',
    marginRight: 8,
    marginTop: 8,
    height: '100%'
  },
  subfolderNameNew: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    marginRight: 8,
  },
  subfolderQuizCountNew: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 8,
  },
  addBtnNew: {
    fontSize: 18,
    color: '#a259f7',
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  deleteBtnNew: {
    fontSize: 18,
    color: '#f87171',
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  subfolderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a202c',
    justifyContent: 'space-between',
  },
  subfolderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCard: {
    borderColor: '#1062fe',
    backgroundColor: '#e9f0ff',
  },
  cardOuter: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#2c3e50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
    borderWidth: 0,
  },
  folderCardWeb: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    marginHorizontal: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedCardWeb: {
    borderColor: '#1062fe',
    backgroundColor: '#e9f0ff',
  },
  radioCircleWeb: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#a259f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  radioSelectedWeb: {
    borderColor: '#1062fe',
    backgroundColor: '#e9f0ff',
  },
  selectedRbWeb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1062fe',
  },
  folderNameWeb: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 2,
  },
  folderQuizCountWeb: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  folderAddWeb: {
    fontSize: 18,
    color: '#1062fe',
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  folderDeleteWeb: {
    fontSize: 18,
    color: '#ef4444',
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  subfolderConnectorWeb: {
    width: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#dbeafe',
    marginRight: 8,
    marginTop: 8,
    height: '100%',
  },
  createBtnWeb: {
    backgroundColor: '#a259f7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginLeft: 8,
  },
  subfolderInputBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9f0ff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  radioSelected: {
    borderColor: '#1062fe',
    backgroundColor: '#e9f0ff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginLeft: 4,
    color: '#1a1a1a',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4a5568',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#2c3e50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1a202c',
  },
  sectionDesc: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d3dbed',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 8,
    color: '#000000',
    backgroundColor: '#f7faff',
  },
  createBtn: {
    backgroundColor: '#a259f7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  center: {
    alignItems: 'center',
    marginTop: 16,
  },
  noFolderIcon: {
    fontSize: 32,
    color: '#d3dbed',
    marginBottom: 8,
  },
  noFolderText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '700',
    marginBottom: 2,
  },
  noFolderSubText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  picker: {
    height: 40,
    width: 120,
    marginRight: 8,
    backgroundColor: '#f7faff',
    borderRadius: 8,
  },
  refreshBtn: {
    backgroundColor: '#1062fe',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  clearBtn: {
    backgroundColor: '#f87171',
    borderRadius: 8,  
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  clearBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Upload Status Card Styles
  uploadStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uploadStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#374151',
  },
  uploadSuccessContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successCheckmark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  uploadSuccessText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
  },
  questionsInfo: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Preview & Save Quiz Card Styles
  previewSaveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewSaveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#374151',
  },
  quizTitleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  quizTitleInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
    textAlign: 'center',
  },
  questionsReadyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  questionsReadyIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  questionsReadyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  questionPreviewContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  questionPreviewText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  moreQuestionsText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 80,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  discardButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 80,
  },
  discardButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Custom Alert Modal Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minWidth: 300,
    maxWidth: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  alertBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  alertMessage: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  alertButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Quiz Results Styles
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    minWidth: 150,
  },
  pickerStyle: {
    height: 40,
    color: '#374151',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearAllButton: {
    backgroundColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearAllButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  quizResultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quizResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  quizResultId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  quizResultQuizName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  quizResultScore: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  quizResultTime: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  quizResultDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  quizResultPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: 'bold',
  },
});

export default AdminPanel;

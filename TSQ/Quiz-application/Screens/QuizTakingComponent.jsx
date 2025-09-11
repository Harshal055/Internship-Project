
/*
*/

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, StyleSheet, Alert, SafeAreaView, StatusBar, Platform, Image, Share, Linking, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech'; // Text-to-Speech functionality
import * as Sharing from 'expo-sharing'; // Sharing functionality
import { Audio } from 'expo-av'; // For audio permissions

const DEFAULT_PER_Q_SECONDS = 15;

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isTablet = screenWidth > 768;

const QuizTakingComponent = ({ quiz, onQuizComplete, timePerQuestion = DEFAULT_PER_Q_SECONDS, resumeDraft = null, sessionId, onDraftUpdate, navigation }) => {
	// Basic validation for debugging - only log meaningful changes
	const isValidQuizStructure = quiz && typeof quiz === 'object' && Array.isArray(quiz?.questions) && quiz?.questions.length > 0;
	
	// Emergency bailout if quiz is completely invalid
	if (!quiz || typeof quiz !== 'object') {
		console.error('QuizTakingComponent: quiz is not a valid object');
		return (
			<View style={styles.container}>
				<View style={styles.noQuestionContainer}>
					<Text style={styles.noQuestionText}>Error: Invalid quiz data</Text>
				</View>
			</View>
		);
	}

	// Initialize with extra-safe defaults - Use useMemo to prevent recreation
	const safeQuiz = useMemo(() => {
		const result = {
			id: quiz?.id || `temp-quiz-${Date.now()}`,
			title: quiz?.title || 'Quiz',
			questions: Array.isArray(quiz?.questions) ? quiz?.questions : []
		};
		
		// Only log once when safeQuiz changes meaningfully
		if (process.env.NODE_ENV === 'development' && result.questions.length > 0) {
			console.log('QuizTakingComponent: Initialized with', result.questions.length, 'questions');
		}
		
		return result;
	}, [quiz?.id, quiz?.title, quiz?.questions?.length]); // Only depend on length, not the full array
	
	const totalQuestions = safeQuiz.questions.length;

	// Responsive timer size
	const timerSize = isSmallScreen ? 48 : isTablet ? 72 : 56;
	const safeTotalQuestions = Math.max(totalQuestions, 1); // Ensure at least 1 for array initialization
	
	const [localQuestions, setLocalQuestions] = useState(() => safeQuiz.questions);

	// Sync local questions with quiz prop changes - Fixed to prevent loops
	useEffect(() => {
		// Only update if the quiz structure actually changed
		if (quiz?.questions && Array.isArray(quiz?.questions) && 
			(quiz?.questions.length !== localQuestions.length || quiz?.id !== safeQuiz.id)) {
			if (process.env.NODE_ENV === 'development') {
				console.log('QuizTakingComponent: Syncing localQuestions - Quiz changed');
			}
			setLocalQuestions(quiz?.questions);
		}
	}, [quiz?.id, quiz?.questions?.length]); // Stable dependencies only

	// --- Card UI with Logout ---
	const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

	// Handle logout (complete implementation with navigation and session clearing)
	const handleLogout = async () => {
		try {
			// Stop any ongoing speech first
			Speech.stop();
			
			// Clear session data from AsyncStorage
			await AsyncStorage.removeItem('userSession');
			await AsyncStorage.removeItem('quizDraft');
			await AsyncStorage.removeItem('userToken');
			await AsyncStorage.removeItem('currentUser');
			
			// Clear draft update
			if (onDraftUpdate) {
				onDraftUpdate(null);
			}
			
			// Navigate to login/main screen
			if (navigation) {
				// Reset navigation stack and go to main screen
				navigation.reset({
					index: 0,
					routes: [{ name: 'RoleSelection' }],
				});
			} else {
				// Fallback: show alert and call onQuizComplete with special flag
				Alert.alert('Success', 'You have been logged out successfully!');
				onQuizComplete({ logout: true });
			}
			
			setLogoutDialogOpen(false);
		} catch (error) {
			console.error('Logout error:', error);
			Alert.alert('Error', 'Failed to logout. Please try again.');
		}
	};
	const [currentQIndex, setCurrentQIndex] = useState(0);
	const [answers, setAnswers] = useState(() => {
		const length = Math.max(quiz?.questions?.length || 1, 1);
		return Array(length).fill(null);
	});
	const [selected, setSelected] = useState(null);
	const [perQSec, setPerQSec] = useState(timePerQuestion);
	const [timeLeft, setTimeLeft] = useState(timePerQuestion);
	const [totalSec, setTotalSec] = useState(() => {
		const questionCount = Math.max(quiz?.questions?.length || 1, 1);
		return Math.max(timePerQuestion * questionCount, 30);
	});
	const [totalLeft, setTotalLeft] = useState(() => {
		const questionCount = Math.max(quiz?.questions?.length || 1, 1);
		return Math.max(timePerQuestion * questionCount, 30);
	});
	const [paused, setPaused] = useState(false);
	const [favorites, setFavorites] = useState(() => {
		const length = Math.max(quiz?.questions?.length || 1, 1);
		return Array(length).fill(false);
	});
	const [notes, setNotes] = useState(() => {
		const length = Math.max(quiz?.questions?.length || 1, 1);
		return Array(length).fill('');
	});
	const [ytLinks, setYtLinks] = useState(() => {
		const length = Math.max(quiz?.questions?.length || 1, 1);
		return Array(length).fill('');
	});
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
	const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
	const [fontSize, setFontSize] = useState(16);
	const [autoNext, setAutoNext] = useState(false);
	
	// Additional state variables
	const [ttsVoice, setTtsVoice] = useState('Female');
	const [animationStyle, setAnimationStyle] = useState('fade');
	const [images, setImages] = useState(() => {
		const length = Math.max(quiz?.questions?.length || 1, 1);
		return Array.from({ length }, () => Array(10).fill(null));
	});
	const [galleryIdx, setGalleryIdx] = useState(0);
	const [imagePreview, setImagePreview] = useState({ open: false, src: '' });
	const [ytEditOpen, setYtEditOpen] = useState(false);
	const [ytTemp, setYtTemp] = useState('');
	const [shareOpen, setShareOpen] = useState(false);
	const [themeOpen, setThemeOpen] = useState(false);
	const [currentTheme, setCurrentTheme] = useState('light');
	const [fontChoice, setFontChoice] = useState('system');
	const [showAllQuestions, setShowAllQuestions] = useState(false);
	const [quizCompleted, setQuizCompleted] = useState(false);
	const [score, setScore] = useState(0);
	
	// Quiz Settings State
	const [soundEffects, setSoundEffects] = useState(true);
	const [textToSpeech, setTextToSpeech] = useState(false);
	const [fontFamily, setFontFamily] = useState('System (Sans)');
	const [fontWeight, setFontWeight] = useState('Normal');
	const [ttsSpeed, setTtsSpeed] = useState('Normal');
	const [animationStyleOption, setAnimationStyleOption] = useState('Fade');
	const [animationStyleCorrect, setAnimationStyleCorrect] = useState('Fade');
	const [animationStyleWrong, setAnimationStyleWrong] = useState('Fade');
	const [showCorrectPreview, setShowCorrectPreview] = useState(true);
	
	// Flag to prevent auto-save on initial mount
	const [isInitialMount, setIsInitialMount] = useState(true);
	
	// Flag to prevent multiple submissions
	const [isSubmitting, setIsSubmitting] = useState(false);
	
	// Navigation debouncer to prevent rapid navigation
	const [isNavigating, setIsNavigating] = useState(false);
	
	// Ref to track if component is mounted
	const isMountedRef = useRef(true);
	
	// Edit Question State
	const [editQuestionOpen, setEditQuestionOpen] = useState(false);
	const [editingQuestion, setEditingQuestion] = useState(null);
	const [editedQuestion, setEditedQuestion] = useState('');
	const [editedOptions, setEditedOptions] = useState(['', '', '', '']);
	const [editedCorrectAnswer, setEditedCorrectAnswer] = useState(0);
	const [editedExplanation, setEditedExplanation] = useState('');
	
	// TTS Permission Status State
	const [audioPermissionStatus, setAudioPermissionStatus] = useState('unknown'); // 'granted', 'denied', 'unknown'
	
	// Content Box Modal States
	const [imageUploadModalOpen, setImageUploadModalOpen] = useState(false);
	
	// Media Gallery States (replacing simple content boxes)
	const [mediaBoxes, setMediaBoxes] = useState(Array(10).fill().map((_, index) => ({
		id: index,
		contentType: 'none', // 'none', 'image', 'youtube', 'website'
		contentUrl: '',
		thumbnailUrl: ''
	})));
	const [selectedMediaBox, setSelectedMediaBox] = useState(null);
	const [mediaViewModalOpen, setMediaViewModalOpen] = useState(false);
	const [mediaUploadModalOpen, setMediaUploadModalOpen] = useState(false);
	const [currentEditingBox, setCurrentEditingBox] = useState(null);
	const [uploadImageUri, setUploadImageUri] = useState('');
	const [uploadYoutubeUrl, setUploadYoutubeUrl] = useState('');
	const [uploadWebsiteUrl, setUploadWebsiteUrl] = useState('');
	const [messageBoxVisible, setMessageBoxVisible] = useState(false);
	const [messageBoxText, setMessageBoxText] = useState('');
	const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
	const [contentBoxClickCount, setContentBoxClickCount] = useState(0);
	const [tempYoutubeLink, setTempYoutubeLink] = useState('');
	
	// Double click detection state
	const [clickTimeout, setClickTimeout] = useState(null);
	const [lastClickTime, setLastClickTime] = useState(0);
	const [currentClickedBox, setCurrentClickedBox] = useState(null);

	// Validate required props and quiz structure after all hooks are declared
	const isValidQuiz = quiz && onQuizComplete && quiz?.questions && Array.isArray(quiz?.questions) && quiz?.questions.length > 0 && totalQuestions > 0;

	if (!isValidQuiz) {
		console.error('QuizTakingComponent: Invalid quiz or missing props:', { 
			hasQuiz: !!quiz, 
			hasOnQuizComplete: !!onQuizComplete,
			hasQuestions: !!(quiz?.questions),
			isArray: Array.isArray(quiz?.questions),
			questionsLength: quiz?.questions?.length,
			totalQuestions 
		});
		return (
			<View style={styles.container}>
				<View style={styles.noQuestionContainer}>
					<Text style={styles.noQuestionText}>
						{!quiz || !onQuizComplete ? 'Missing required props' : 'No questions found for this quiz.'}
					</Text>
					{onQuizComplete && (
						<TouchableOpacity onPress={() => onQuizComplete(0, 0, quiz?.title || 'Unknown Quiz')} style={styles.backBtn}>
							<Text style={styles.backBtnText}>Back to Quizzes</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	}

	// Calculated values with defensive checks and extensive logging
	let correctAnswers = [];
	let correctCount = 0;
	let currentQuestion = null;

	try {
		// Ensure we have valid localQuestions before mapping
		if (Array.isArray(localQuestions) && localQuestions.length > 0) {
			correctAnswers = localQuestions.map((q, idx) => {
				if (!q || typeof q !== 'object') {
					console.warn(`QuizTakingComponent: Invalid question at index ${idx}:`, q);
					return '';
				}
				return q.correctAnswer || '';
			});
		} else {
			console.warn('QuizTakingComponent: localQuestions is not a valid array:', localQuestions);
			correctAnswers = [];
		}

		// Ensure we have valid answers array before reducing
		if (Array.isArray(answers) && Array.isArray(correctAnswers)) {
			correctCount = answers.reduce((acc, ans, idx) => {
				const correctAnswer = correctAnswers[idx];
				const isCorrect = ans && correctAnswer && correctAnswer === ans;
				return acc + (isCorrect ? 1 : 0);
			}, 0);
		} else {
			console.warn('QuizTakingComponent: Invalid arrays for calculation:', { 
				answersValid: Array.isArray(answers),
				correctAnswersValid: Array.isArray(correctAnswers) 
			});
		}

		// Get current question safely
		if (Array.isArray(localQuestions) && currentQIndex >= 0 && currentQIndex < localQuestions.length) {
			currentQuestion = localQuestions[currentQIndex];
		}
	} catch (error) {
		console.error('QuizTakingComponent: Error in calculated values:', error);
		correctAnswers = [];
		correctCount = 0;
		currentQuestion = null;
	}

	// YouTube utility functions
	const extractYouTubeId = (url) => {
		if (!url) return null;
		const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
		return match ? match[1] : null;
	};

	const isValidYouTubeUrl = (url) => {
		return url && extractYouTubeId(url) !== null;
	};

	const getYouTubeEmbedUrl = (url) => {
		const videoId = extractYouTubeId(url);
		return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
	};

	// Media Gallery Helper Functions
	const getYouTubeThumbnail = (url) => {
		const videoId = extractYouTubeId(url);
		return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
	};

	const isValidUrl = (url) => {
		try {
			new URL(url);
			return url.match(/^https?:\/\/.+/);
		} catch {
			return false;
		}
	};

	const showMessageBox = (message) => {
		setMessageBoxText(message);
		setMessageBoxVisible(true);
	};

	const handleMediaBoxClick = (boxIndex) => {
		const currentTime = Date.now();
		const box = mediaBoxes[boxIndex];
		
		// Store last click time for double-click detection
		if (!box.lastClickTime) {
			box.lastClickTime = 0;
		}

		const timeDiff = currentTime - box.lastClickTime;
		const isDoubleClick = timeDiff < 300; // 300ms threshold for double-click

		if (isDoubleClick) {
			// Double click - open upload modal
			setCurrentEditingBox(boxIndex);
			setUploadImageUri('');
			setUploadYoutubeUrl('');
			setUploadWebsiteUrl('');
			setMediaUploadModalOpen(true);
		} else {
			// Single click - open view modal (only if box has content)
			if (box.contentType !== 'none') {
				setSelectedMediaBox(box);
				setMediaViewModalOpen(true);
			}
		}

		// Update last click time
		setMediaBoxes(prev => {
			const updated = [...prev];
			updated[boxIndex] = { ...updated[boxIndex], lastClickTime: currentTime };
			return updated;
		});
	};

	const updateMediaBox = (boxIndex, contentType, contentUrl, thumbnailUrl = '') => {
		setMediaBoxes(prev => {
			const updated = [...prev];
			updated[boxIndex] = {
				...updated[boxIndex],
				contentType,
				contentUrl,
				thumbnailUrl: thumbnailUrl || contentUrl
			};
			
			// Save all media boxes data permanently for this specific question only
			const allMediaData = updated.filter(box => box.contentType !== 'none').map((box, index) => ({
				boxIndex: index,
				contentType: box.contentType,
				contentUrl: box.contentUrl,
				thumbnailUrl: box.thumbnailUrl,
				timestamp: Date.now(),
				questionIndex: currentQIndex // Store which question this belongs to
			}));
			
			console.log(`Saving ${allMediaData.length} media items for Question ${currentQIndex + 1}`);
			
			// Save to AsyncStorage with question-specific key
			saveMediaDataForQuestion(currentQIndex, allMediaData);
			
			return updated;
		});
	};

	const deleteMediaBox = (boxIndex) => {
		setMediaBoxes(prev => {
			const updated = [...prev];
			updated[boxIndex] = {
				...updated[boxIndex],
				contentType: 'none',
				contentUrl: '',
				thumbnailUrl: ''
			};
			
			// Save updated media boxes data (excluding deleted one) for this specific question only
			const allMediaData = updated.filter(box => box.contentType !== 'none').map((box, index) => ({
				boxIndex: index,
				contentType: box.contentType,
				contentUrl: box.contentUrl,
				thumbnailUrl: box.thumbnailUrl,
				timestamp: Date.now(),
				questionIndex: currentQIndex // Store which question this belongs to
			}));
			
			console.log(`Saving ${allMediaData.length} media items for Question ${currentQIndex + 1} after deletion`);
			
			// Save to AsyncStorage with question-specific key
			saveMediaDataForQuestion(currentQIndex, allMediaData);
			
			return updated;
		});
	};

	// Accept an optional imageUri to allow immediate uploads after selection
	const handleMediaUpload = async (imageUriParam = '') => {
		if (currentEditingBox === null) return;

		const imageToUse = imageUriParam || uploadImageUri;
		let mediaSet = false;

		// Priority: Image > YouTube > Website
		if (imageToUse) {
			updateMediaBox(currentEditingBox, 'image', imageToUse);
			mediaSet = true;
		} else if (uploadYoutubeUrl && isValidYouTubeUrl(uploadYoutubeUrl)) {
			const thumbnailUrl = getYouTubeThumbnail(uploadYoutubeUrl);
			updateMediaBox(currentEditingBox, 'youtube', uploadYoutubeUrl, thumbnailUrl);
			mediaSet = true;
		} else if (uploadWebsiteUrl && isValidUrl(uploadWebsiteUrl)) {
			updateMediaBox(currentEditingBox, 'website', uploadWebsiteUrl);
			mediaSet = true;
		}

		if (mediaSet) {
			setMediaUploadModalOpen(false);
			setCurrentEditingBox(null);
			setUploadImageUri('');
			setUploadYoutubeUrl('');
			setUploadWebsiteUrl('');
			// Show success message with question number
			showMessageBox(`✅ Media uploaded and permanently saved for Question ${currentQIndex + 1}!\n\n📍 This media will ONLY appear for this specific question.\n🔄 When you navigate to other questions, they will have their own separate media.`);
		} else {
			showMessageBox('Please provide a valid image, YouTube URL, or website URL.');
		}
	};

	// Persist YouTube links in draft
	const persistYtLinks = (newYtLinks) => {
		if (onDraftUpdate) {
			onDraftUpdate({
				ytLinks: newYtLinks
			});
		}
	};

	// Image upload functions
	const requestImagePermissions = async () => {
		try {
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert(
					'Permission Required',
					'Sorry, we need camera roll permissions to upload images!',
					[{ text: 'OK' }]
				);
				return false;
			}
			return true;
		} catch (error) {
			console.error('Error requesting image permissions:', error);
			Alert.alert('Error', 'Failed to request permissions');
			return false;
		}
	};

	const pickImage = async () => {
		try {
			const hasPermission = await requestImagePermissions();
			if (!hasPermission) return;

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [16, 9],
				quality: 0.8,
				base64: false,
				allowsMultipleSelection: false,
			});

			if (!result.canceled && result.assets && result.assets[0]) {
				const asset = result.assets[0];
				console.log('Image selected:', asset.uri);
				return asset.uri;
			}
		} catch (error) {
			console.error('Error picking image:', error);
			Alert.alert('Error', 'Failed to select image from gallery. Please try again.');
		}
		return null;
	};

	const takePhoto = async () => {
		try {
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert(
					'Camera Permission Required',
					'This app needs camera access to take photos for quiz questions. Please enable camera permission in your device settings.',
					[
						{ text: 'OK' },
						{ 
							text: 'Open Settings', 
							onPress: () => {
								if (Platform.OS === 'ios') {
									Linking.openURL('app-settings:');
								} else {
									Linking.openSettings();
								}
							}
						}
					]
				);
				return null;
			}

			const result = await ImagePicker.launchCameraAsync({
				allowsEditing: true,
				aspect: [16, 9],
				quality: 0.8,
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
			});

			if (!result.canceled && result.assets && result.assets[0]) {
				const asset = result.assets[0];
				console.log('Photo taken:', asset.uri);
				return asset.uri;
			}
		} catch (error) {
			console.error('Error taking photo:', error);
			Alert.alert('Error', 'Failed to take photo. Please try again.');
		}
		return null;
	};

	const addImageToQuestion = (imageUri) => {
		if (!imageUri) return;
		
		const newImages = [...images];
		const questionImages = [...newImages[currentQIndex]];
		
		// Find first empty slot
		const emptyIndex = questionImages.findIndex(img => img === null);
		if (emptyIndex !== -1) {
			questionImages[emptyIndex] = imageUri;
			newImages[currentQIndex] = questionImages;
			setImages(newImages);
			persistImages(newImages);
		} else {
			Alert.alert('Limit Reached', 'You can add up to 10 images per question');
		}
	};

	const removeImageFromQuestion = (imageIndex) => {
		const newImages = [...images];
		const questionImages = [...newImages[currentQIndex]];
		questionImages[imageIndex] = null;
		newImages[currentQIndex] = questionImages;
		setImages(newImages);
		persistImages(newImages);
	};

	// Core quiz logic functions
	const handleAnswer = (selectedOption) => {
		if (timeLeft <= 0 || answers[currentQIndex] !== null) return;
		
		const newAnswers = [...answers];
		newAnswers[currentQIndex] = selectedOption;
		setAnswers(newAnswers);
		
		// Calculate score
		if (selectedOption === localQuestions[currentQIndex].correctAnswer) {
			setScore(prevScore => prevScore + 1);
		}
		
		// Auto-advance if configured
		setTimeout(() => {
			if (currentQIndex < localQuestions.length - 1) {
				nextQuestion();
			} else {
				submitQuiz();
			}
		}, 1000);
	};

	const nextQuestion = () => {
		setCurrentQIndex(prevIndex => {
			if (prevIndex < localQuestions.length - 1) {
				setTimeLeft(perQSec);
				return prevIndex + 1;
			} else {
				submitQuiz();
				return prevIndex;
			}
		});
	};

	const previousQuestion = () => {
		setCurrentQIndex(prevIndex => {
			if (prevIndex > 0) {
				setTimeLeft(perQSec);
				return prevIndex - 1;
			}
			return prevIndex;
		});
	};

	const submitQuiz = () => {
		setQuizCompleted(true);
		setTimeLeft(0);
		
		// Calculate final score
		let finalScore = 0;
		answers.forEach((answer, index) => {
			if (answer === localQuestions[index].correctAnswer) {
				finalScore++;
			}
		});
		setScore(finalScore);
		
		// Navigate to results
		if (navigation) {
			navigation.navigate('ResultPage', {
				score: finalScore,
				totalQuestions: localQuestions.length,
				selectedAnswers: answers,
				questions: localQuestions
			});
		} else {
			// Fallback if no navigation
			onQuizComplete({
				score: finalScore,
				totalQuestions: localQuestions.length,
				answers: answers,
				questions: localQuestions
			});
		}
	};

	const persistImages = (newImages) => {
		if (onDraftUpdate) {
			onDraftUpdate({
				images: newImages
			});
		}
	};

	const showImagePicker = () => {
		Alert.alert(
			'Add Image',
			'Choose how you want to add an image',
			[
				{ 
					text: '📷 Take Photo', 
					onPress: async () => {
						const uri = await takePhoto();
						if (uri) addImageToQuestion(uri);
					}
				},
				{ 
					text: '🖼️ Choose from Gallery', 
					onPress: async () => {
						const uri = await pickImage();
						if (uri) addImageToQuestion(uri);
					}
				},
				{ text: 'Cancel', style: 'cancel' }
			],
			{ cancelable: true }
		);
	};

	// Audio permission handling
	const requestAudioPermissions = async () => {
		try {
			if (Platform.OS === 'android') {
				// Request audio permissions for Android
				const { status } = await Audio.requestPermissionsAsync();
				if (status !== 'granted') {
					setAudioPermissionStatus('denied');
					Alert.alert(
						'Audio Permission Required',
						'This app needs audio permissions to provide text-to-speech functionality for quiz questions and feedback.',
						[{ text: 'OK' }]
					);
					return false;
				} else {
					setAudioPermissionStatus('granted');
				}
			} else {
				// iOS typically has speech permissions handled automatically
				setAudioPermissionStatus('granted');
			}
			return true;
		} catch (error) {
			console.log('Audio permission error:', error);
			setAudioPermissionStatus('denied');
			return false;
		}
	};

	// Check audio permission status
	const checkAudioPermissionStatus = async () => {
		try {
			if (Platform.OS === 'android') {
				const { status } = await Audio.getPermissionsAsync();
				setAudioPermissionStatus(status === 'granted' ? 'granted' : 'denied');
			} else {
				setAudioPermissionStatus('granted');
			}
		} catch (error) {
			console.log('Permission check error:', error);
			setAudioPermissionStatus('unknown');
		}
	};

	// Initialize audio permissions on component mount and load settings
	useEffect(() => {
		checkAudioPermissionStatus();
		loadSettings();
		console.log('QuizTakingComponent: Initial settings loaded');
		
		// Set flag to allow auto-save after initial mount
		const timer = setTimeout(() => {
			setIsInitialMount(false);
		}, 1000);
		
		return () => clearTimeout(timer);
	}, []);

	// Auto-save settings when they change (debounced) - Skip initial mount
	useEffect(() => {
		if (isInitialMount) return; // Skip auto-save on initial mount
		
		const timeoutId = setTimeout(() => {
			console.log('Auto-saving settings...');
			saveSettings();
		}, 1500);

		return () => clearTimeout(timeoutId);
	}, [isInitialMount, fontSize, fontFamily, fontWeight, soundEffects, textToSpeech, ttsVoice, ttsSpeed,
		animationStyleOption, animationStyleCorrect, animationStyleWrong, 
		showCorrectPreview, autoNext]);

	// Separate effect for timer settings - Skip initial mount
	useEffect(() => {
		if (isInitialMount) return; // Skip auto-save on initial mount
		
		const timeoutId = setTimeout(() => {
			console.log('Auto-saving timer settings...');
			saveSettings();
		}, 1500);

		return () => clearTimeout(timeoutId);
	}, [isInitialMount, perQSec, totalSec]);

	// Cleanup effect to prevent memory leaks
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			Speech.stop(); // Stop any ongoing speech
		};
	}, []);

	// Load settings from AsyncStorage
	const loadSettings = async () => {
		try {
			const savedSettings = await AsyncStorage.getItem('quizSettings');
			console.log('Loading settings from storage:', savedSettings);
			if (savedSettings) {
				const settings = JSON.parse(savedSettings);
				console.log('Parsed settings:', settings);
				setFontSize(settings.fontSize || 16);
				setFontFamily(settings.fontFamily || 'System (Sans)');
				setFontWeight(settings.fontWeight || 'Normal');
				setSoundEffects(settings.soundEffects !== undefined ? settings.soundEffects : true);
				setTextToSpeech(settings.textToSpeech || false);
				setTtsVoice(settings.ttsVoice || 'Female');
				setTtsSpeed(settings.ttsSpeed || 'Normal');
				setAnimationStyleOption(settings.animationStyleOption || 'Fade');
				setAnimationStyleCorrect(settings.animationStyleCorrect || 'Fade');
				setAnimationStyleWrong(settings.animationStyleWrong || 'Fade');
				setShowCorrectPreview(settings.showCorrectPreview !== undefined ? settings.showCorrectPreview : true);
				setAutoNext(settings.autoNext || false);
				// Load timer settings
				if (settings.perQSec && Number.isFinite(settings.perQSec)) {
					setPerQSec(settings.perQSec);
					setTimeLeft(settings.perQSec);
				}
				if (settings.totalSec && Number.isFinite(settings.totalSec)) {
					setTotalSec(settings.totalSec);
					setTotalLeft(settings.totalSec);
				}
				console.log('Settings applied successfully');
			} else {
				console.log('No saved settings found, using defaults');
			}
		} catch (error) {
			console.log('Error loading settings:', error);
		}
	};

	// Save settings to AsyncStorage
	const saveSettings = async () => {
		try {
			const settings = {
				fontSize,
				fontFamily,
				fontWeight,
				soundEffects,
				textToSpeech,
				ttsVoice,
				ttsSpeed,
				animationStyleOption,
				animationStyleCorrect,
				animationStyleWrong,
				showCorrectPreview,
				autoNext,
				perQSec,
				totalSec
			};
			await AsyncStorage.setItem('quizSettings', JSON.stringify(settings));
			console.log('Settings saved successfully:', settings);
		} catch (error) {
			console.log('Error saving settings:', error);
		}
	};

	// Media Persistence Functions - Save media data for specific questions only
	const saveMediaDataForQuestion = async (questionIndex, mediaData) => {
		try {
			const storageKey = `quiz_${safeQuiz.id}_question_${questionIndex}_media`;
			await AsyncStorage.setItem(storageKey, JSON.stringify(mediaData));
			console.log(`Media data saved for Question ${questionIndex + 1}:`, mediaData);
		} catch (error) {
			console.error('Error saving media data:', error);
		}
	};

	const loadMediaDataForQuestion = async (questionIndex) => {
		try {
			const storageKey = `quiz_${safeQuiz.id}_question_${questionIndex}_media`;
			const savedData = await AsyncStorage.getItem(storageKey);
			if (savedData) {
				const mediaData = JSON.parse(savedData);
				console.log(`Media data loaded for Question ${questionIndex + 1}:`, mediaData);
				return mediaData;
			}
		} catch (error) {
			console.error('Error loading media data:', error);
		}
		return null;
	};

	const clearMediaDataForQuestion = async (questionIndex) => {
		try {
			const storageKey = `quiz_${safeQuiz.id}_question_${questionIndex}_media`;
			await AsyncStorage.removeItem(storageKey);
			console.log(`Media data cleared for Question ${questionIndex + 1}`);
		} catch (error) {
			console.error('Error clearing media data:', error);
		}
	};

	const getAllQuizMediaData = async () => {
		try {
			const allMediaData = {};
			for (let i = 0; i < safeQuiz.questions.length; i++) {
				const questionMedia = await loadMediaDataForQuestion(i);
				if (questionMedia && questionMedia.length > 0) {
					allMediaData[i] = questionMedia;
				}
			}
			return allMediaData;
		} catch (error) {
			console.error('Error getting all quiz media data:', error);
			return {};
		}
	};

	const exportQuizWithMedia = async () => {
		try {
			const allMedia = await getAllQuizMediaData();
			const exportData = {
				quiz: safeQuiz,
				mediaData: allMedia,
				exportDate: new Date().toISOString()
			};
			console.log('Quiz with media data:', exportData);
			// This could be extended to share or save the data
			showMessageBox(`Quiz data with media exported! Found media for ${Object.keys(allMedia).length} questions.`);
			return exportData;
		} catch (error) {
			console.error('Error exporting quiz with media:', error);
			showMessageBox('Error exporting quiz data.');
		}
	};

	// Demonstration function to show media storage per question
	const showMediaSummary = async () => {
		try {
			const allMedia = await getAllQuizMediaData();
			const questionsWithMedia = Object.keys(allMedia);
			
			if (questionsWithMedia.length === 0) {
				showMessageBox('📋 No media saved for any questions yet.\n\n💡 Upload some media to see question-specific storage!');
			} else {
				const summary = questionsWithMedia.map(qIndex => {
					const mediaCount = allMedia[qIndex].length;
					return `Question ${parseInt(qIndex) + 1}: ${mediaCount} media item${mediaCount > 1 ? 's' : ''}`;
				}).join('\n');
				
				showMessageBox(`📊 Media Summary:\n\n${summary}\n\n🔒 Each question stores its media separately!`);
			}
		} catch (error) {
			console.error('Error getting media summary:', error);
		}
	};

	// Stop speech when TTS is disabled or component unmounts
	useEffect(() => {
		if (!textToSpeech) {
			Speech.stop();
		}
		
		// Cleanup function to stop speech when component unmounts
		return () => {
			Speech.stop();
		};
	}, [textToSpeech]);

	// Helper function to get font family
	const getFontFamily = () => {
		switch (fontFamily) {
			case 'System (Serif)': return 'serif';
			case 'System (Mono)': return 'monospace';
			case 'Roboto': return Platform.OS === 'ios' ? 'Helvetica' : 'Roboto';
			case 'Open Sans': return Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif';
			case 'Lato': return Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif';
			case 'Nunito': return Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif';
			case 'Arial': return 'Arial';
			case 'Helvetica': return 'Helvetica';
			case 'Times New Roman': return Platform.OS === 'ios' ? 'Times New Roman' : 'serif';
			case 'Georgia': return Platform.OS === 'ios' ? 'Georgia' : 'serif';
			case 'Courier New': return Platform.OS === 'ios' ? 'Courier New' : 'monospace';
			default: return 'sans-serif';
		}
	};

	// Helper function to get font weight
	const getFontWeight = () => {
		switch (fontWeight) {
			case 'Light': return '300';
			case 'Normal': return 'normal';
			case 'Bold': return 'bold';
			case '600': return '600';
			case '700': return '700';
			case '800': return '800';
			default: return 'normal';
		}
	};

	// Update timer when perQSec changes - Fixed to prevent loops and stale closures
	useEffect(() => {
		setTimeLeft(perQSec);
		
		// Update total time proportionally only if needed
		const currentTotalQuestions = safeQuiz.questions.length || 1;
		const expectedTotalSec = Math.max(perQSec * currentTotalQuestions, 30);
		setTotalSec(prevTotalSec => {
			if (Math.abs(prevTotalSec - expectedTotalSec) > 1) {
				return expectedTotalSec;
			}
			return prevTotalSec;
		});
		
		// Update remaining total time proportionally
		setTotalLeft(prevTotalLeft => {
			const remainingQuestions = Math.max(currentTotalQuestions - currentQIndex, 0);
			const newTotalLeft = Math.max(perQSec * remainingQuestions, 0);
			return newTotalLeft;
		});
	}, [perQSec, safeQuiz.questions.length]); // Use stable reference

	useEffect(() => {
		if (resumeDraft && resumeDraft.quizId === quiz?.id) {
			const currentTotalQuestions = safeQuiz.questions.length;
			setCurrentQIndex(Math.min(resumeDraft.currentQIndex || 0, Math.max(currentTotalQuestions - 1, 0)));
			setAnswers(Array.isArray(resumeDraft.answers) && resumeDraft.answers.length === currentTotalQuestions ? resumeDraft.answers : Array(currentTotalQuestions).fill(null));
			setFavorites(Array.isArray(resumeDraft.favorites) && resumeDraft.favorites.length === currentTotalQuestions ? resumeDraft.favorites : Array(currentTotalQuestions).fill(false));
			setNotes(Array.isArray(resumeDraft.notes) && resumeDraft.notes.length === currentTotalQuestions ? resumeDraft.notes : Array(currentTotalQuestions).fill(''));
			setYtLinks(Array.isArray(resumeDraft.ytLinks) && resumeDraft.ytLinks.length === currentTotalQuestions ? resumeDraft.ytLinks : Array(currentTotalQuestions).fill(''));
			setImages(Array.isArray(resumeDraft.images) && resumeDraft.images.length === currentTotalQuestions ? resumeDraft.images : Array.from({ length: currentTotalQuestions }, () => Array(10).fill(null)));
			setPerQSec(Number.isFinite(resumeDraft.perQSec) ? resumeDraft.perQSec : timePerQuestion);
			setTimeLeft(Number.isFinite(resumeDraft.timeLeft) ? resumeDraft.timeLeft : timePerQuestion);
			setTotalSec(Number.isFinite(resumeDraft.totalSec) ? resumeDraft.totalSec : Math.max(timePerQuestion * Math.max(currentTotalQuestions, 1), 30));
			setTotalLeft(Number.isFinite(resumeDraft.totalLeft) ? resumeDraft.totalLeft : Math.max(timePerQuestion * Math.max(currentTotalQuestions, 1), 30));
			setPaused(Boolean(resumeDraft.paused));
		}
	}, [resumeDraft?.quizId, quiz?.id, safeQuiz.questions.length, timePerQuestion]); // Stable dependencies

	// Update selected answer when currentQIndex changes - Simplified to prevent loops
	useEffect(() => {
		// Update selected answer for current question
		if (answers && answers[currentQIndex] !== undefined) {
			setSelected(answers[currentQIndex]);
		}
	}, [currentQIndex]); // Only depend on currentQIndex

	// Load saved media data when question changes - Clear current and load question-specific media
	useEffect(() => {
		const loadQuestionMedia = async () => {
			try {
				console.log(`Loading media for Question ${currentQIndex + 1}`);
				
				// Always start with empty media boxes to clear previous question's media
				const emptyBoxes = Array(10).fill().map((_, index) => ({
					id: index,
					contentType: 'none',
					contentUrl: '',
					thumbnailUrl: ''
				}));
				
				// Load saved media data for current question only
				const savedMediaData = await loadMediaDataForQuestion(currentQIndex);
				
				if (savedMediaData && Array.isArray(savedMediaData)) {
					console.log(`Found ${savedMediaData.length} saved media items for Question ${currentQIndex + 1}`);
					// Restore saved media boxes for this specific question
					savedMediaData.forEach(mediaItem => {
						if (mediaItem.boxIndex >= 0 && mediaItem.boxIndex < emptyBoxes.length) {
							emptyBoxes[mediaItem.boxIndex] = {
								id: mediaItem.boxIndex,
								contentType: mediaItem.contentType,
								contentUrl: mediaItem.contentUrl,
								thumbnailUrl: mediaItem.thumbnailUrl
							};
						}
					});
				} else {
					console.log(`No saved media found for Question ${currentQIndex + 1}`);
				}
				
				// Set the media boxes (either empty or with loaded data)
				setMediaBoxes(emptyBoxes);
			} catch (error) {
				console.error('Error loading media for question:', error);
				// Fallback to empty boxes on error
				setMediaBoxes(Array(10).fill().map((_, index) => ({
					id: index,
					contentType: 'none',
					contentUrl: '',
					thumbnailUrl: ''
				})));
			}
		};

		loadQuestionMedia();
	}, [currentQIndex, safeQuiz.id]); // Load when question or quiz changes

	// Main timer countdown effect - Fixed to prevent excessive re-renders
	useEffect(() => {
		if (!localQuestions[currentQIndex]) return;
		if (paused || quizCompleted || isSubmitting) return;
		
		const questionsLength = localQuestions.length;
		
		const t = setInterval(() => {
			setTimeLeft(prevTimeLeft => {
				const newTimeLeft = Math.max(prevTimeLeft - 1, 0);
				
				// Handle time up for question
				if (newTimeLeft <= 0) {
					// Stop any ongoing speech first
					Speech.stop();
					
					setAnswers(prevAnswers => {
						const updated = [...prevAnswers];
						updated[currentQIndex] = selected;
						return updated;
					});
					
					setCurrentQIndex(prevIndex => {
						if (prevIndex < questionsLength - 1) {
							const nextIndex = prevIndex + 1;
							setTimeLeft(perQSec);
							
							// Auto-speak the new question if TTS is enabled
							setTimeout(() => {
								if (textToSpeech && localQuestions[nextIndex]) {
									const questionText = `Question ${nextIndex + 1}: ${localQuestions[nextIndex].question}. `;
									const optionsText = localQuestions[nextIndex].options.map((opt, idx) => 
										`Option ${String.fromCharCode(65 + idx)}: ${opt}`
									).join('. ');
									speakText(questionText + optionsText, false);
								}
							}, 500);
							return nextIndex;
						} else {
							setConfirmSubmitOpen(true);
							return prevIndex;
						}
					});
				}
				
				return newTimeLeft;
			});
			
			setTotalLeft(prevTotalLeft => {
				const newTotalLeft = Math.max(prevTotalLeft - 1, 0);
				
				// Handle total time up
				if (newTotalLeft <= 0) {
					setConfirmSubmitOpen(true);
				}
				
				return newTotalLeft;
			});
		}, 1000);
		
		return () => clearInterval(t);
	}, [paused, currentQIndex, localQuestions.length, quizCompleted, isSubmitting]); // Simplified dependencies

	// Status bar management for modals and app states
	useEffect(() => {
		const hasModalOpen = settingsOpen || confirmCloseOpen || confirmSubmitOpen || 
							 logoutDialogOpen || showAllQuestions || editQuestionOpen || shareOpen;
		
		if (hasModalOpen) {
			// Darker status bar for modals
			StatusBar.setBarStyle('dark-content', true);
			if (Platform.OS === 'android') {
				StatusBar.setBackgroundColor('rgba(0,0,0,0.3)', true);
			}
		} else {
			// Normal white status bar
			StatusBar.setBarStyle('dark-content', true);
			if (Platform.OS === 'android') {
				StatusBar.setBackgroundColor('#ffffff', true);
			}
		}
		
		// Cleanup on unmount
		return () => {
			StatusBar.setBarStyle('dark-content', true);
			if (Platform.OS === 'android') {
				StatusBar.setBackgroundColor('#ffffff', true);
			}
		};
	}, [settingsOpen, confirmCloseOpen, confirmSubmitOpen, logoutDialogOpen, 
		showAllQuestions, editQuestionOpen, shareOpen]);

	const persistDraft = useCallback((draft = {}) => {
		if (!onDraftUpdate || !isMountedRef.current) return;
		
		// Use current state values to avoid dependency issues
		const payload = {
			sessionId,
			quizId: quiz?.id,
			quizTitle: quiz?.title,
			totalQuestions,
			currentQIndex,
			answers,
			favorites,
			notes,
			perQSec,
			totalSec,
			totalLeft,
			paused,
			fontSize,
			timeLeft,
			...draft, // Override with any passed values
		};
		
		// Debounced draft save to prevent excessive calls
		clearTimeout(persistDraft.timeoutId);
		persistDraft.timeoutId = setTimeout(() => {
			if (isMountedRef.current && onDraftUpdate) {
				onDraftUpdate(payload);
			}
		}, 300);
	}, [onDraftUpdate, sessionId, quiz?.id]); // Minimal dependencies to prevent loops

	const handleSelect = (opt) => {
		const isCorrect = opt === localQuestions[currentQIndex].correctAnswer;

		// Audio feedback for correct/wrong answers
		if (isCorrect) {
			playCorrectSound();
		} else {
			playWrongSound();
		}

		setSelected(opt);
		const updated = [...answers];
		updated[currentQIndex] = opt;
		setAnswers(updated);
		persistDraft({ answers: updated });
		
		if (autoNext) {
			// Show selection feedback briefly before auto-advancing
			setTimeout(() => {
				handleNext();
			}, showCorrectPreview ? 800 : 500); // Longer delay if showing correct preview
		}
	};

	// Text-to-Speech function for reading question and options
	const speakText = async (text, forceSpeak = false) => {
		if (!textToSpeech && !forceSpeak) return;
		
		// Check permissions before speaking
		const hasPermission = await requestAudioPermissions();
		if (!hasPermission) {
			Alert.alert(
				'Permission Required',
				'Audio permissions are needed for text-to-speech functionality. Please enable them in your device settings.',
				[{ text: 'OK' }]
			);
			return;
		}

		try {
			// Stop any ongoing speech first
			Speech.stop();
			
			// Configure speech speed based on setting
			let speechRate = 0.8;
			switch (ttsSpeed) {
				case 'Slow': speechRate = 0.5; break;
				case 'Normal': speechRate = 0.8; break;
				case 'Fast': speechRate = 1.2; break;
				default: speechRate = 0.8;
			}
			
			// Configure speech options based on voice type
			let speechPitch = 1.0;
			let language = 'en-US';
			
			switch (ttsVoice) {
				case 'Female': 
					speechPitch = 1.3; 
					language = 'en-US';
					break;
				case 'Male': 
					speechPitch = 0.7; 
					language = 'en-US';
					break;
				case 'Female (High)': 
					speechPitch = 1.6; 
					language = 'en-US';
					break;
				case 'Male (Deep)': 
					speechPitch = 0.5; 
					language = 'en-US';
					break;
				case 'Robot': 
					speechPitch = 1.0; 
					speechRate = 0.6; 
					language = 'en-US';
					break;
				default: 
					speechPitch = 1.2;
					language = 'en-US';
			}
			
			const speechOptions = {
				rate: speechRate,
				pitch: speechPitch,
				language: language,
			};
			
			// Platform-specific voice selection
			if (Platform.OS === 'ios') {
				// iOS voice identifiers - use more common ones
				switch (ttsVoice) {
					case 'Female':
					case 'Female (High)':
						speechOptions.voice = 'com.apple.ttsbundle.Samantha-compact';
						break;
					case 'Male':
					case 'Male (Deep)':
						speechOptions.voice = 'com.apple.ttsbundle.Daniel-compact';
						break;
					case 'Robot':
						speechOptions.voice = 'com.apple.ttsbundle.Alex-compact';
						break;
					default:
						// Don't specify voice, let system choose based on language and pitch
						delete speechOptions.voice;
				}
			} else {
				// Android - rely on pitch and rate for voice differentiation
				// Don't specify voice identifier, let system choose
				speechOptions.language = language;
			}
			
			Speech.speak(text, speechOptions);
			console.log('TTS Speaking:', {
				text: text.substring(0, 50) + '...', 
				voice: ttsVoice, 
				speed: ttsSpeed, 
				pitch: speechPitch,
				rate: speechRate,
				platform: Platform.OS
			});
		} catch (error) {
			console.log('TTS error:', error);
			Alert.alert('Text-to-Speech Error', 'Unable to play audio. Please check your device settings.');
		}
	};

	const stopSpeech = () => {
		try {
			Speech.stop();
		} catch (error) {
			console.log('TTS stop error:', error);
		}
	};

	const speakQuestion = () => {
		const currentQ = localQuestions[currentQIndex];
		if (currentQ) {
			// Speak both question and options when TTS button is clicked
			const questionText = `Question ${currentQIndex + 1}: ${currentQ.question}. `;
			const optionsText = currentQ.options.map((opt, idx) => 
				`}: ${opt}`
			).join('. ');
			speakText(questionText + optionsText, true);
		}
	};

	const speakAllOptions = () => {
		const currentQ = localQuestions[currentQIndex];
		if (currentQ && currentQ.options) {
			const questionText = `Question ${currentQIndex + 1}: ${currentQ.question}. `;
			const optionsText = currentQ.options.map((opt, idx) => 
				`}: ${opt}`
			).join('. ');
			// Force speak even if TTS is disabled globally (manual button press)
			speakText(questionText + optionsText, true);
		}
	};

	// Audio feedback for correct/wrong answers
	const playCorrectSound = () => {
		if (!soundEffects) return;
		try {
			// Create a simple beep sound for correct answer with proper icon
			Speech.speak('Correct', {
				rate: 1.5,
				pitch: 1.3,
			});
		} catch (error) {
			console.log('Correct sound error:', error);
		}
	};

	const playWrongSound = () => {
		if (!soundEffects) return;
		try {
			// Create a different sound for wrong answer with proper icon
			Speech.speak('Wrong', {
				rate: 1.2,
				pitch: 0.8,
			});
		} catch (error) {
			console.log('Wrong sound error:', error);
		}
	};

	const toggleFavorite = () => {
		setFavorites(prev => {
			const next = prev.map((v, idx) => (idx === currentQIndex ? !v : v));
			persistDraft({ favorites: next });
			return next;
		});
	};

	const openEditQuestion = () => {
		const currentQ = localQuestions[currentQIndex];
		if (currentQ) {
			// Populate the edit form with current question data
			setEditingQuestion(currentQIndex);
			setEditedQuestion(currentQ.question || '');
			setEditedOptions([...currentQ.options] || ['', '', '', '']);
			setEditedCorrectAnswer(typeof currentQ.correctAnswer === 'number' ? currentQ.correctAnswer : 0);
			setEditedExplanation(currentQ.explanation || '');
			setEditQuestionOpen(true);
		}
	};

	// Share functionality
	const shareResults = async () => {
		try {
			const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
			const performanceEmoji = correctCount === totalQuestions ? '🏆' : 
									correctCount >= totalQuestions * 0.8 ? '⭐' : 
									correctCount >= totalQuestions * 0.6 ? '👍' : '📚';
			
			const shareText = `${performanceEmoji} Quiz Results\n\n📚 "${quiz?.title || 'Quiz'}"\n\n✅ Score: ${correctCount}/${totalQuestions} (${scorePercentage}%)\n\n🎉 ${correctCount === totalQuestions ? 'Perfect Score!' : correctCount >= totalQuestions * 0.8 ? 'Excellent!' : correctCount >= totalQuestions * 0.6 ? 'Good Job!' : 'Keep Learning!'}`;
			
			// Use native sharing
			if (await Sharing.isAvailableAsync()) {
				const result = await Share.share({
					message: shareText,
					title: 'Quiz Results'
				});
			} else {
				// Fallback for platforms where sharing isn't available
				Alert.alert(
					'Share Results',
					shareText,
					[
						{ text: 'OK', style: 'default' }
					]
				);
			}
		} catch (error) {
			console.error('Share error:', error);
			Alert.alert('Error', 'Failed to share results');
		}
	};

	const shareQuiz = async () => {
		try {
			const shareText = `🎯 Try This Quiz!\n\n📚 "${quiz?.title || 'Quiz'}"\n\n❓ ${totalQuestions} Questions\n⏱️ ${timePerQuestion} seconds per question\n\n🚀 Can you beat my score? Challenge yourself!`;
			
			// Use native sharing
			if (await Sharing.isAvailableAsync()) {
				const result = await Share.share({
					message: shareText,
					title: 'Try This Quiz!'
				});
			} else {
				// Fallback for platforms where sharing isn't available
				Alert.alert(
					'Share Quiz',
					shareText,
					[
						{ text: 'OK', style: 'default' }
					]
				);
			}
		} catch (error) {
			console.error('Share error:', error);
			Alert.alert('Error', 'Failed to share quiz');
		}
	};

	const shareCurrentQuestion = async () => {
		try {
			const currentQ = localQuestions[currentQIndex];
			// Truncate long questions for sharing
			const questionText = currentQ.question.length > 150 ? 
				currentQ.question.substring(0, 150) + '...' : 
				currentQ.question;
			const shareText = `❓ Quiz Question #${currentQIndex + 1}\n\n📝 ${questionText}\n\n🔤 Options:\nA) ${currentQ.options[0]}\nB) ${currentQ.options[1]}\nC) ${currentQ.options[2]}\nD) ${currentQ.options[3]}\n\n📚 From: "${quiz?.title || 'Quiz'}" quiz\n\n🤔 What's your answer?`;
			
			// Use native sharing
			if (await Sharing.isAvailableAsync()) {
				const result = await Share.share({
					message: shareText,
					title: `Quiz Question #${currentQIndex + 1}`
				});
			} else {
				// Fallback for platforms where sharing isn't available
				Alert.alert(
					'Share Question',
					shareText,
					[
						{ text: 'OK', style: 'default' }
					]
				);
			}
		} catch (error) {
			console.error('Share error:', error);
			Alert.alert('Error', 'Failed to share question');
		}
	};

	// Enhanced share functionality with detailed summary
	const shareDetailedSummary = async () => {
		try {
			const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
			const grade = scorePercentage >= 90 ? 'A+' : 
						 scorePercentage >= 80 ? 'A' : 
						 scorePercentage >= 70 ? 'B' : 
						 scorePercentage >= 60 ? 'C' : 'D';
			
			const performance = scorePercentage >= 90 ? '🏆 Excellent!' : 
							   scorePercentage >= 80 ? '⭐ Great Job!' : 
							   scorePercentage >= 70 ? '👍 Good Work!' : 
							   scorePercentage >= 60 ? '📈 Keep Improving!' : '📚 Keep Learning!';

			const timeSpent = Math.round(elapsedSeconds / 60);
			const avgTimePerQ = Math.round(elapsedSeconds / totalQuestions);

			const shareText = `🎯 QUIZ RESULTS SUMMARY
			
📚 Quiz: "${quiz?.title || 'Quiz'}"
📊 Score: ${correctCount}/${totalQuestions} (${scorePercentage}%)
🎓 Grade: ${grade}
${performance}

⏱️ Time Taken: ${timeSpent} minutes
📋 Avg per Question: ${avgTimePerQ} seconds
🔢 Total Questions: ${totalQuestions}

💪 Challenge completed! Can you beat this score?

#QuizTime #Learning #Achievement`;

			// Use native sharing
			if (await Sharing.isAvailableAsync()) {
				const result = await Share.share({
					message: shareText,
					title: 'Quiz Achievement!'
				});
			} else {
				Alert.alert(
					'Quiz Summary',
					shareText,
					[{ text: 'OK', style: 'default' }]
				);
			}
		} catch (error) {
			console.error('Share error:', error);
			Alert.alert('Error', 'Failed to share summary');
		}
	};

	const fmt = (s) => {
		const v = Math.max(0, Math.floor(s || 0));
		const m = Math.floor(v / 60);
		const ss = String(v % 60).padStart(2, '0');
		return `${m}:${ss}`;
	};

	const getYouTubeId = (url) => {
		const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
		return m ? m[1] : '';
	};

	const isYouTubeValid = (url) => {
		const u = url || '';
		if (!u) return false;
		return !!getYouTubeId(u);
	};

	const handlePrev = () => {
		if (currentQIndex === 0) return;
		
		// Stop any ongoing speech first
		Speech.stop();
		
		const prevIndex = currentQIndex - 1;
		setCurrentQIndex(prevIndex);
		setTimeLeft(perQSec);
		persistDraft({ currentQIndex: prevIndex, timeLeft: perQSec });
		
		// Auto-speak the previous question if TTS is enabled
		setTimeout(() => {
			if (textToSpeech && localQuestions[prevIndex]) {
				const questionText = `Question ${prevIndex + 1}: ${localQuestions[prevIndex].question}. `;
				const optionsText = localQuestions[prevIndex].options.map((opt, idx) => 
					`Option ${String.fromCharCode(65 + idx)}: ${opt}`
				).join('. ');
				speakText(questionText + optionsText, false);
			}
		}, 500); // Small delay to ensure UI has updated
	};

	// Content box click handlers with single/double click detection
	const handleContentBoxClick = (boxIndex) => {
		const currentTime = Date.now();
		const timeDifference = currentTime - lastClickTime;
		
		// Clear any existing timeout
		if (clickTimeout) {
			clearTimeout(clickTimeout);
			setClickTimeout(null);
		}
		
		// Check if this is a double click (within 400ms and same box)
		if (timeDifference < 400 && currentClickedBox === boxIndex) {
			// Double click detected - Open YouTube link modal
			handleDoubleClick(boxIndex);
			setLastClickTime(0); // Reset to prevent triple clicks
			setCurrentClickedBox(null);
		} else {
			// Potential single click - wait to see if double click follows
			setCurrentClickedBox(boxIndex);
			const newTimeout = setTimeout(() => {
				handleSingleClick(boxIndex);
				setClickTimeout(null);
				setCurrentClickedBox(null);
			}, 400); // Increased timeout for better UX
			
			setClickTimeout(newTimeout);
			setLastClickTime(currentTime);
		}
		
		// Update click count for analytics
		setContentBoxClickCount(prev => prev + 1);
	};

	// Direct navigation to specific question (for question list navigation)
	const navigateToQuestion = (questionIndex) => {
		if (questionIndex < 0 || questionIndex >= totalQuestions) return;
		
		// Stop any ongoing speech first
		Speech.stop();
		
		setCurrentQIndex(questionIndex);
		setTimeLeft(perQSec);
		persistDraft({ currentQIndex: questionIndex, timeLeft: perQSec });
		
		// Auto-speak the new question if TTS is enabled
		setTimeout(() => {
			if (textToSpeech && localQuestions[questionIndex]) {
				const questionText = `Question ${questionIndex + 1}: ${localQuestions[questionIndex].question}. `;
				const optionsText = localQuestions[questionIndex].options.map((opt, idx) => 
					`Option ${String.fromCharCode(65 + idx)}: ${opt}`
				).join('. ');
				speakText(questionText + optionsText, false);
			}
		}, 500); // Small delay to ensure UI has updated
	};

	const finalizeAndSubmit = useCallback(() => {
		// Prevent multiple submissions
		if (quizCompleted || isSubmitting) return;
		
		// Stop any ongoing speech when submitting
		Speech.stop();
		
		// Set submitting flag to prevent multiple submissions
		setIsSubmitting(true);
		setQuizCompleted(true);
		
		try {
			const correctAnswers = localQuestions.map(q => q.correctAnswer);
			const correctCount = answers.reduce((acc, ans, idx) => acc + (ans && correctAnswers[idx] === ans ? 1 : 0), 0);
			const skippedCount = answers.filter(a => a === null).length;
			const wrongCount = totalQuestions - correctCount - skippedCount;
			const favoriteCount = favorites.filter(Boolean).length;
			const timeUsed = Math.max((totalSec || 0) - (totalLeft || 0), 0);
			
			// Create comprehensive payload for result page
			const payload = {
				quizId: quiz?.id,
				quizTitle: quiz?.title,
				score: correctCount,
				totalQuestions,
				skippedCount,
				wrongCount,
				favoriteCount,
				answers,
				correctAnswers,
				notes,
				totalSec,
				totalLeft,
				timeUsed,
				percentage: Math.round((correctCount / totalQuestions) * 100),
				questions: localQuestions.map((q, i) => ({
					question: q.question,
					options: q.options,
					correctAnswer: q.correctAnswer,
					userAnswer: answers[i],
					explanation: q.explanation || '',
					isFavorite: favorites[i] || false,
					note: notes[i] || ''
				})),
				timestamp: new Date().toISOString(),
			};
			
			// Clear draft and call completion handler
			if (onDraftUpdate) onDraftUpdate(null);
			onQuizComplete(payload);
		} catch (error) {
			console.error('QuizTakingComponent: Error in finalizeAndSubmit:', error);
			// Reset flags on error
			setQuizCompleted(false);
			setIsSubmitting(false);
			// Fallback to basic completion
			onQuizComplete({
				score: 0,
				totalQuestions: totalQuestions,
				quizId: quiz?.id || 'unknown',
				title: quiz?.title || 'Quiz',
				timestamp: new Date().toISOString(),
				error: 'Submission failed'
			});
		}
	}, [quizCompleted, isSubmitting, localQuestions, answers, totalQuestions, favorites, notes, totalSec, totalLeft, quiz, onDraftUpdate, onQuizComplete]);

	const handleNext = () => {
		// Prevent rapid navigation
		if (isNavigating || quizCompleted || isSubmitting) return;
		
		// Stop any ongoing speech first
		Speech.stop();
		
		// Set navigation flag
		setIsNavigating(true);
		
		const updated = [...answers];
		updated[currentQIndex] = selected;
		setAnswers(updated);
		if (currentQIndex < totalQuestions - 1) {
			const nextIndex = currentQIndex + 1;
			setCurrentQIndex(nextIndex);
			setTimeLeft(perQSec);
			persistDraft({ answers: updated, currentQIndex: nextIndex, timeLeft: perQSec });
			
			// Auto-speak the new question if TTS is enabled
			setTimeout(() => {
				if (textToSpeech && localQuestions[nextIndex]) {
					const questionText = `Question ${nextIndex + 1}: ${localQuestions[nextIndex].question}. `;
					const optionsText = localQuestions[nextIndex].options.map((opt, idx) => 
						`Option ${String.fromCharCode(65 + idx)}: ${opt}`
					).join('. ');
					speakText(questionText + optionsText, false);
				}
			}, 500); // Small delay to ensure UI has updated
		} else {
			setConfirmSubmitOpen(true);
		}
		
		// Reset navigation flag after a short delay
		setTimeout(() => {
			setIsNavigating(false);
		}, 300);
	};

	const handleClose = () => {
		// Stop any ongoing speech when closing
		Speech.stop();
		setConfirmCloseOpen(true);
	};

	const handlePrevious = () => {
		// Stop any ongoing speech first
		Speech.stop();
		
		if (currentQIndex > 0) {
			const prevIndex = currentQIndex - 1;
			setCurrentQIndex(prevIndex);
			setTimeLeft(perQSec);
			persistDraft({ currentQIndex: prevIndex, timeLeft: perQSec });
			
			// Auto-speak the previous question if TTS is enabled
			setTimeout(() => {
				if (textToSpeech && localQuestions[prevIndex]) {
					const questionText = `Question ${prevIndex + 1}: ${localQuestions[prevIndex].question}. `;
					const optionsText = localQuestions[prevIndex].options.map((opt, idx) => 
						`Option ${String.fromCharCode(65 + idx)}: ${opt}`
					).join('. ');
					speakText(questionText + optionsText, false);
				}
			}, 500);
		}
	};

	if (!localQuestions[currentQIndex]) {
		return (
			<View style={styles.container}>
				{/* Card UI with header and logout */}
				<View style={styles.headerContainer}>
					<Text style={styles.quizTitle}>Quiz</Text>
					<TouchableOpacity onPress={() => setLogoutDialogOpen(true)} style={styles.logoutBtn}>
						<Text style={styles.logoutText}>Logout</Text>
					</TouchableOpacity>
				</View>
				
				<View style={styles.noQuestionContainer}>
					<Text style={styles.noQuestionText}>No questions found for this quiz.</Text>
					<TouchableOpacity onPress={() => onQuizComplete(0, 0, quiz?.title || 'Unknown Quiz')} style={styles.backBtn}>
						<Text style={styles.backBtnText}>Back to Quizzes</Text>
					</TouchableOpacity>
				</View>

				{/* Logout Confirmation Modal */}
				<Modal visible={logoutDialogOpen} transparent animationType="fade">
					<View style={styles.modalOverlay}>
						<View style={styles.confirmModal}>
							<Text style={styles.confirmTitle}>Confirm Logout</Text>
							<Text style={styles.confirmText}>Are you sure you want to logout?</Text>
							<View style={styles.confirmBtnRow}>
								<TouchableOpacity onPress={handleLogout} style={[styles.confirmBtn, styles.logoutConfirmBtn]}>
									<Text style={styles.logoutConfirmText}>Logout</Text>
								</TouchableOpacity>
								<TouchableOpacity onPress={() => setLogoutDialogOpen(false)} style={styles.confirmBtn}>
									<Text style={styles.settingsCloseBtnText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
			</View>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { flex: 1 }]}>
		
			<ScrollView 
				style={{ flex: 1 }}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ flexGrow: 1 }}
			>
				<View style={styles.contentContainer}>

				{/* Timer and Controls Bar - matching exact UI from image */}
				<View style={styles.timerControlsBar}>
					{/* Timer display with play/pause and question number */}
					<View style={styles.timerSection}>
						<View style={styles.timerQuestionGroup}>
						
							<Text style={styles.timerDisplay}>
								{Math.floor(totalLeft / 60)}:{String(totalLeft % 60).padStart(2, '0')}
							</Text>
						</View>
						<TouchableOpacity 
							onPress={() => {
								if (!paused) {
									Speech.stop();
								}
								setPaused(p => !p);
							}} 
							style={styles.playPauseBtn}
						>
							<Text style={styles.playPauseIcon}>{paused ? '▶' : '⏸'}</Text>
						</TouchableOpacity>
					</View>

					{/* Action buttons row */}
					<View style={styles.actionButtons}>
						

						<TouchableOpacity onPress={toggleFavorite} style={styles.actionBtn}>
							<Text style={styles.actionIcon}>{favorites[currentQIndex] ? '★' : '☆'}</Text>
						</TouchableOpacity>
						
						<TouchableOpacity 
							onPress={() => setSoundEffects(!soundEffects)} 
							style={styles.actionBtn}
						>
							<Text style={styles.actionIcon}>{soundEffects ? '🔊' : '🔇'}</Text>
						</TouchableOpacity>
						
						<TouchableOpacity 
							onPress={speakQuestion}
							style={styles.actionBtn}
						>
							<Text style={styles.actionIcon}>🗣️</Text>
						</TouchableOpacity>
						
						<TouchableOpacity 
							onPress={() => setShareOpen(true)} 
							style={styles.actionBtn}
						>
							<Image 
								source={require('../assets/share.png')} 
								style={styles.shareIcon}
							/>
						</TouchableOpacity>
						
						<TouchableOpacity 
							onPress={() => setSettingsOpen(true)} 
							style={styles.actionBtn}
						>
							<Text style={styles.actionIcon}>⚙</Text>
						</TouchableOpacity>
						
						<TouchableOpacity 
							onPress={openEditQuestion} 
							style={styles.actionBtn}
						>
							<Text style={styles.actionIcon}>⋮</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Progress bar with current/total */}
				<View style={styles.progressSection}>
					<View style={styles.progressBarContainer}>
						<View style={[styles.progressBar, { width: `${((currentQIndex + 1) / totalQuestions) * 100}%` }]} />
						<Text style={styles.progressBarText}>{currentQIndex + 1}/{totalQuestions}</Text>
					</View>
				</View>

				{/* Question Timer Circle */}
				<View style={styles.questionTimerContainer}>
					<View style={[styles.questionTimerCircle, { width: timerSize, height: timerSize, borderRadius: timerSize / 2 }]}>
						{/* Arc container */}
						<View style={{ position: 'absolute', width: timerSize, height: timerSize, justifyContent: 'center', alignItems: 'center' }}>
							{/* Spinning Arc Effect */}
							<View
								style={{
									position: 'absolute',
									width: timerSize,
									height: timerSize,
									borderRadius: timerSize / 2,
									borderWidth: Math.max(2, Math.round(timerSize * 0.08)),
									borderColor: '#ef4444',
									borderRightColor: 'transparent',
									borderBottomColor: 'transparent',
									transform: [
										{ rotate: `${360 * (1 - Math.max(0, timeLeft) / perQSec)}deg` },
									],
								}}
							/>
						</View>
						<Text style={[styles.questionTimerText, { fontSize: Math.max(12, Math.round(timerSize * 0.4)) }]}>{timeLeft}</Text>
					</View>
				</View>

				{/* Question */}
				<View style={styles.questionContainer}>
					<View style={styles.questionHeader}>
						<Text 
							style={[
								styles.questionText, 
								{ 
									fontSize: fontSize + 2,
									fontFamily: getFontFamily(),
									fontWeight: getFontWeight()
								}
							]}
							numberOfLines={8}
							ellipsizeMode="tail"
						>
							{localQuestions[currentQIndex].question.length > 500 ? 
								localQuestions[currentQIndex].question.substring(0, 500) + '...' :
								localQuestions[currentQIndex].question}
						</Text>
						{/* Media Status Indicator */}
						
					</View>
				</View>

				{/* Answer Options */}
				<View style={styles.optionsContainer}>
					{localQuestions[currentQIndex].options.map((opt, idx) => {
						const isSelected = selected === opt;
						const isCorrectAnswer = opt === localQuestions[currentQIndex].correctAnswer;
						let optionStyle = [styles.optionButton];
						let textStyle = [
							styles.optionText, 
							{ 
								fontSize: fontSize,
								fontFamily: getFontFamily(),
								fontWeight: getFontWeight()
							}
						];
						
						if (isSelected) {
							if (isCorrectAnswer) {
								optionStyle.push(styles.optionCorrect);
								textStyle.push(styles.optionCorrectText);
							} else {
								optionStyle.push(styles.optionWrong);
								textStyle.push(styles.optionWrongText);
							}
						} else if (selected && !isSelected && isCorrectAnswer && showCorrectPreview) {
							optionStyle.push(styles.optionCorrectPreview);
							textStyle.push(styles.optionCorrectText);
						}
						
						return (
							<TouchableOpacity 
								key={idx} 
								onPress={() => handleSelect(opt)} 
								style={optionStyle}
							>
								<View style={styles.optionContent}>
									<Text style={textStyle}>{opt}</Text>
									{isSelected && (
										<Text style={styles.feedbackIcon}>
											{isCorrectAnswer ? '' : ''}
										</Text>
									)}
									{selected && !isSelected && isCorrectAnswer && showCorrectPreview && (
										<Text style={styles.feedbackIcon}></Text>
									)}
								</View>
							</TouchableOpacity>
						);
					})}
				</View>


				{/* Explanation */}
				{selected && localQuestions[currentQIndex].explanation ? (
					<View style={styles.explanationContainer}>
						<Text style={[
							styles.explanationText,
							{ 
								fontSize: fontSize - 1,
								fontFamily: getFontFamily(),
								fontWeight: getFontWeight()
							}
						]}>
							{localQuestions[currentQIndex].explanation}
						</Text>
					</View>
				) : null}

				</View>
			</ScrollView>
			{/* Media Gallery - Horizontal scrollable grid */}
				<View style={styles.mediaGalleryContainer}>
					<ScrollView 
						horizontal 
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.mediaScrollContent}
					>
						{mediaBoxes.map((box, index) => (
							<TouchableOpacity
								key={box.id}
								style={[
									styles.mediaBox,
									box.contentType !== 'none' && styles.mediaBoxHasContent
								]}
								onPress={() => handleMediaBoxClick(index)}
								activeOpacity={0.7}
							>
								{box.contentType !== 'none' && (
									<View style={styles.savedIndicator}>
										<Text style={styles.savedIndicatorText}>💾</Text>
									</View>
								)}
								{box.contentType === 'none' ? (
									<View style={styles.emptyMediaBox}>
										
									</View>
								) : box.contentType === 'image' ? (
									<Image 
										source={{ uri: box.contentUrl }} 
										style={styles.mediaBoxImage}
										resizeMode="cover"
									/>
								) : box.contentType === 'youtube' ? (
									<View style={styles.mediaBoxContent}>
										<Image 
											source={{ uri: box.thumbnailUrl }} 
											style={styles.mediaBoxImage}
											resizeMode="cover"
										/>
										<View style={styles.youtubeOverlay}>
											<Text style={styles.youtubePlayIcon}>▶️</Text>
										</View>
									</View>
								) : box.contentType === 'website' ? (
									<View style={styles.mediaBoxContent}>
										<View style={styles.websitePreview}>
											<Text style={styles.websiteIcon}>🌐</Text>
											<Text style={styles.websiteUrl} numberOfLines={2}>
												{box.contentUrl}
											</Text>
										</View>
									</View>
								) : null}
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
				

			{/* Navigation - Fixed positioning outside ScrollView */}
			<View style={styles.navContainer}>
				{/* Arrow buttons row */}
				<View style={styles.navArrowContainer}>
					<TouchableOpacity 
						onPress={handlePrev} 
						disabled={currentQIndex === 0} 
						style={[
							styles.navArrowBtn, 
							currentQIndex === 0 && styles.navArrowBtnDisabled
						]}
					>
						<Text style={[
							styles.navArrowText, 
							currentQIndex === 0 && styles.navArrowTextDisabled
						]}>‹</Text>
					</TouchableOpacity>
					{/* Close button - repositioned to not overlap */}
				<View style={styles.navCloseBtnContainer}>
					<TouchableOpacity onPress={handleClose} style={styles.navCloseBtn}>
						<Text style={styles.navCloseBtnText}>✕</Text>
					</TouchableOpacity>
				</View>
					
					<TouchableOpacity onPress={handleNext} style={styles.navArrowBtn}>
						<Text style={styles.navArrowText}>
							{currentQIndex === totalQuestions - 1 ? '✓' : '›'}
						</Text>
					</TouchableOpacity>
				</View>
				
				
				
			</View>

			{/* Logout Confirmation Modal */}
			<Modal visible={logoutDialogOpen} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.confirmModal}>
						<Text style={styles.confirmTitle}>Confirm Logout</Text>
						<Text style={styles.confirmText}>Are you sure you want to logout?</Text>
						<View style={styles.confirmBtnRow}>
							<TouchableOpacity onPress={handleLogout} style={[styles.confirmBtn, styles.logoutConfirmBtn]}>
								<Text style={styles.logoutConfirmText}>Logout</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => setLogoutDialogOpen(false)} style={styles.confirmBtn}>
								<Text>Cancel</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Enhanced Settings Modal */}
			<Modal visible={settingsOpen} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.settingsModal}>
						<Text style={styles.settingsTitle}>Quiz Settings</Text>
						<View style={styles.settingsDivider} />
						
						<ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
							{/* Time per question */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Time per question (sec)</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<TouchableOpacity
										style={[styles.settingsInput, { width: 32, justifyContent: 'center', alignItems: 'center', marginRight: 4 }]}
										onPress={() => setPerQSec(Math.max(5, perQSec - 1))}
									>
										<Text style={{ fontSize: 18, color: '#3b82f6' }}>−</Text>
									</TouchableOpacity>
									<TextInput
										style={[styles.settingsInput, { width: 60, textAlign: 'center' }]}
										keyboardType="numeric"
										value={String(perQSec)}
										onChangeText={v => setPerQSec(Math.max(0, Math.min(300, Number(v) || perQSec)))}
									/>
									<TouchableOpacity
										style={[styles.settingsInput, { width: 32, justifyContent: 'center', alignItems: 'center', marginLeft: 4 }]}
										onPress={() => setPerQSec(Math.min(300, perQSec + 1))}
									>
										<Text style={{ fontSize: 18, color: '#3b82f6' }}>+</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Total quiz time */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Total quiz time (sec)</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<TouchableOpacity
										style={[styles.settingsInput, { width: 32, justifyContent: 'center', alignItems: 'center', marginRight: 4 }]}
										onPress={() => setTotalSec(Math.max(30, totalSec - 1))}
									>
										<Text style={{ fontSize: 18, color: '#3b82f6' }}>−</Text>
									</TouchableOpacity>
									<TextInput
										style={[styles.settingsInput, { width: 80, textAlign: 'center' }]}
										keyboardType="numeric"
										value={String(totalSec)}
										onChangeText={v => setTotalSec(Math.max(30, Math.min(36000, Number(v) || totalSec)))}
									/>
									<TouchableOpacity
										style={[styles.settingsInput, { width: 32, justifyContent: 'center', alignItems: 'center', marginLeft: 4 }]}
										onPress={() => setTotalSec(Math.min(36000, totalSec + 1))}
									>
										<Text style={{ fontSize: 18, color: '#3b82f6' }}>+</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Sound effects */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Sound effects</Text>
								<TouchableOpacity 
									onPress={() => setSoundEffects(!soundEffects)} 
									style={[styles.settingsCheckbox, soundEffects && styles.settingsCheckboxActive]}
								>
									<Text style={styles.settingsCheckboxText}>{soundEffects ? '✓' : ''}</Text>
								</TouchableOpacity>
							</View>

							{/* Text-to-Speech */}
							<View style={styles.settingsRow}>
								<View style={styles.settingsLabelContainer}>
									<Text style={styles.settingsLabel}>Text-to-Speech</Text>
									<Text style={[
										styles.settingsPermissionStatus,
										audioPermissionStatus === 'granted' ? styles.permissionGranted :
										audioPermissionStatus === 'denied' ? styles.permissionDenied :
										styles.permissionUnknown
									]}>
										{audioPermissionStatus === 'granted' ? '✓ Permitted' :
										 audioPermissionStatus === 'denied' ? '✗ Permission Denied' :
										 '? Permission Unknown'}
									</Text>
								</View>
								<TouchableOpacity 
									onPress={async () => {
										if (audioPermissionStatus !== 'granted') {
											const permitted = await requestAudioPermissions();
											if (!permitted) return;
										}
										setTextToSpeech(!textToSpeech);
									}} 
									style={[styles.settingsCheckbox, textToSpeech && styles.settingsCheckboxActive]}
								>
									<Text style={styles.settingsCheckboxText}>{textToSpeech ? '✓' : ''}</Text>
								</TouchableOpacity>
							</View>

							{/* Voice Selection */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Voice</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											// Cycle through voice options
											const voices = ['Female', 'Male', 'Female (High)', 'Male (Deep)', 'Robot'];
											const currentIndex = voices.indexOf(ttsVoice);
											const nextIndex = (currentIndex + 1) % voices.length;
											setTtsVoice(voices[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{ttsVoice}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Voice Speed */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Voice Speed</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											const speeds = ['Slow', 'Normal', 'Fast'];
											const currentIndex = speeds.indexOf(ttsSpeed || 'Normal');
											const nextIndex = (currentIndex + 1) % speeds.length;
											setTtsSpeed(speeds[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{ttsSpeed || 'Normal'}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Font Family */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Font Family</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											// Cycle through font options
											const fonts = [
												'System (Sans)', 
												'System (Serif)', 
												'System (Mono)',
												'Roboto',
												'Open Sans',
												'Lato',
												'Nunito',
												'Arial',
												'Helvetica',
												'Times New Roman',
												'Georgia',
												'Courier New'
											];
											const currentIndex = fonts.indexOf(fontFamily);
											const nextIndex = (currentIndex + 1) % fonts.length;
											setFontFamily(fonts[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{fontFamily}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Font Weight */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Font Weight</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											const weights = ['Normal', 'Bold', 'Light', '600', '700', '800'];
											const currentIndex = weights.indexOf(fontWeight || 'Normal');
											const nextIndex = (currentIndex + 1) % weights.length;
											setFontWeight(weights[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{fontWeight || 'Normal'}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Animation style option */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Animation style option</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											const options = ['Fade', 'Slide', 'Bounce', 'None'];
											const currentIndex = options.indexOf(animationStyleOption);
											const nextIndex = (currentIndex + 1) % options.length;
											setAnimationStyleOption(options[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{animationStyleOption}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Animation style correct answer */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Animation style correct answer</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											const options = ['Fade', 'Slide', 'Bounce', 'None'];
											const currentIndex = options.indexOf(animationStyleCorrect);
											const nextIndex = (currentIndex + 1) % options.length;
											setAnimationStyleCorrect(options[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{animationStyleCorrect}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Animation style for wrong answer */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Animation style for wrong answer</Text>
								<View style={styles.settingsDropdown}>
									<TouchableOpacity 
										style={styles.settingsDropdownButton}
										onPress={() => {
											const options = ['Fade', 'Slide', 'Bounce', 'None'];
											const currentIndex = options.indexOf(animationStyleWrong);
											const nextIndex = (currentIndex + 1) % options.length;
											setAnimationStyleWrong(options[nextIndex]);
										}}
									>
										<Text style={styles.settingsDropdownText}>{animationStyleWrong}</Text>
										<Text style={styles.settingsDropdownArrow}>▼</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Font size */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Font size (px)</Text>
								<TextInput 
									style={styles.settingsInput} 
									keyboardType="numeric" 
									value={String(fontSize)} 
									onChangeText={v => setFontSize(Math.max(12, Math.min(28, Number(v) || fontSize)))} 
								/>
							</View>

							{/* Auto next on select */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Auto next on select.</Text>
								<TouchableOpacity 
									onPress={() => setAutoNext(!autoNext)} 
									style={[styles.settingsCheckbox, autoNext && styles.settingsCheckboxActive]}
								>
									<Text style={styles.settingsCheckboxText}>{autoNext ? '✓' : ''}</Text>
								</TouchableOpacity>
							</View>

							{/* Show correct preview */}
							<View style={styles.settingsRow}>
								<Text style={styles.settingsLabel}>Show correct preview</Text>
								<TouchableOpacity 
									onPress={() => setShowCorrectPreview(!showCorrectPreview)} 
									style={[styles.settingsCheckbox, showCorrectPreview && styles.settingsCheckboxActive]}
								>
									<Text style={styles.settingsCheckboxText}>{showCorrectPreview ? '✓' : ''}</Text>
								</TouchableOpacity>
							</View>

							<Text style={styles.settingsNote}>
								Timer changes apply to current/next questions. Auto next will move forward right after a selection.
							</Text>
							
							{/* Reset to defaults button */}
							<TouchableOpacity 
								onPress={() => {
									Alert.alert(
										'Reset Settings',
										'Reset all settings to default values?',
										[
											{ text: 'Cancel', style: 'cancel' },
											{ 
												text: 'Reset', 
												onPress: async () => {
													try {
														// Reset all settings to defaults
														setFontSize(16);
														setFontFamily('System (Sans)');
														setFontWeight('Normal');
														setSoundEffects(true);
														setTextToSpeech(false);
														setTtsVoice('Female');
														setTtsSpeed('Normal');
														setAnimationStyleOption('Fade');
														setAnimationStyleCorrect('Fade');
														setAnimationStyleWrong('Fade');
														setShowCorrectPreview(true);
														setAutoNext(false);
														setPerQSec(DEFAULT_PER_Q_SECONDS);
														setTotalSec(Math.max(DEFAULT_PER_Q_SECONDS * Math.max(totalQuestions, 1), 30));
														setTimeLeft(DEFAULT_PER_Q_SECONDS);
														setTotalLeft(Math.max(DEFAULT_PER_Q_SECONDS * Math.max(totalQuestions, 1), 30));
														
														// Save the reset settings
														await saveSettings();
														Alert.alert('Settings Reset', 'All settings have been reset to defaults and saved!');
													} catch (error) {
														console.error('Error resetting settings:', error);
														Alert.alert('Error', 'Failed to reset settings. Please try again.');
													}
												}
											}
										]
									);
								}} 
								style={styles.settingsResetBtn}
							>
								<Text style={styles.settingsResetBtnText}>Reset to Defaults</Text>
							</TouchableOpacity>
							
						</ScrollView>
						
						<View style={styles.settingsButtons}>
							<TouchableOpacity 
								onPress={async () => {
									try {
										await saveSettings();
										// Update timer if changed
										setTimeLeft(perQSec);
										setTotalLeft(totalSec);
										setSettingsOpen(false);
										Alert.alert('Settings Saved', 'Your quiz settings have been saved and applied!');
									} catch (error) {
										console.error('Error saving settings:', error);
										Alert.alert('Error', 'Failed to save settings. Please try again.');
									}
								}} 
								style={styles.settingsApplyBtn}
							>
								<Text style={styles.settingsApplyBtnText}>Apply & Save</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								onPress={() => setSettingsOpen(false)} 
								style={styles.settingsCloseBtn}
							>
								<Text style={styles.settingsCloseBtnText}>Close</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Confirm Close Modal */}
			<Modal visible={confirmCloseOpen} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.confirmModal}>
						<Text style={styles.confirmTitle}>Close & Submit</Text>
						<Text style={styles.confirmText}>Submit your attempt now? You can also leave and resume later from the dashboard.</Text>
						<View style={styles.confirmBtnRow}>
							<TouchableOpacity onPress={() => { setConfirmCloseOpen(false); finalizeAndSubmit(); }} style={styles.confirmBtn}><Text>Submit</Text></TouchableOpacity>
							<TouchableOpacity onPress={() => setConfirmCloseOpen(false)} style={styles.confirmBtn}><Text>Cancel</Text></TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Confirm Submit Modal */}
			<Modal visible={confirmSubmitOpen} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.confirmModal}>
						<Text style={styles.confirmTitle}>Submit Quiz</Text>
						<Text style={styles.confirmText}>Submit your answers now?</Text>
						<View style={styles.confirmBtnRow}>
							<TouchableOpacity onPress={() => { setConfirmSubmitOpen(false); finalizeAndSubmit(); }} style={styles.confirmBtn}><Text>Submit</Text></TouchableOpacity>
							<TouchableOpacity onPress={() => setConfirmSubmitOpen(false)} style={styles.confirmBtn}><Text>Cancel</Text></TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* All Questions Modal */}
			<Modal visible={showAllQuestions} transparent animationType="slide">
				<View style={styles.allQuestionsOverlay}>
					<View style={styles.allQuestionsContainer}>
						{/* Header */}
						<View style={styles.allQuestionsHeader}>
							<Text style={styles.allQuestionsTitle}>All Quiz Questions</Text>
							<TouchableOpacity 
								onPress={() => setShowAllQuestions(false)} 
								style={styles.closeBtn}
							>
								<Text style={styles.closeBtnText}>✕</Text>
							</TouchableOpacity>
						</View>

						{/* Questions List */}
						<ScrollView style={styles.allQuestionsList} showsVerticalScrollIndicator={true}>
							{localQuestions.map((question, questionIndex) => (
								<View key={questionIndex} style={styles.questionCard}>
									{/* Question Number and Text */}
									<View style={styles.questionHeader}>
										<Text style={styles.questionNumber}>Q{questionIndex + 1}</Text>
										<Text 
											style={styles.questionTextAll}
											numberOfLines={4}
											ellipsizeMode="tail"
										>
											{question.question}
										</Text>
									</View>

									{/* Options */}
									<View style={styles.optionsListAll}>
										{question.options.map((option, optionIndex) => {
											const isUserAnswer = answers[questionIndex] === option;
											const isCorrectAnswer = question.correctAnswer === option;
											
											let optionStyle = [styles.optionCardAll];
											let textStyle = [styles.optionTextAll];
											
											if (isUserAnswer && isCorrectAnswer) {
												// User selected correct answer
												optionStyle.push(styles.optionCorrectUserAll);
												textStyle.push(styles.optionCorrectTextAll);
											} else if (isUserAnswer && !isCorrectAnswer) {
												// User selected wrong answer
												optionStyle.push(styles.optionWrongUserAll);
												textStyle.push(styles.optionWrongTextAll);
											} else if (!isUserAnswer && isCorrectAnswer) {
												// Correct answer (not selected by user)
												optionStyle.push(styles.optionCorrectAll);
												textStyle.push(styles.optionCorrectTextAll);
											}

											return (
												<TouchableOpacity 
													key={optionIndex} 
													style={optionStyle}
													onPress={() => {
														// Allow changing answers from this view
														const updatedAnswers = [...answers];
														updatedAnswers[questionIndex] = option;
														setAnswers(updatedAnswers);
														persistDraft({ answers: updatedAnswers });
													}}
												>
													<Text style={textStyle}>
														{String.fromCharCode(65 + optionIndex)}. {option}
													</Text>
													{isUserAnswer && (
														<Text style={styles.selectedIndicator}>👆</Text>
													)}
													{isCorrectAnswer && (
														<Text style={styles.correctIndicator}>✓</Text>
													)}
												</TouchableOpacity>
											);
										})}
									</View>

									{/* Explanation if available */}
									{question.explanation && (
										<View style={styles.explanationCardAll}>
											<Text style={styles.explanationLabelAll}>Explanation:</Text>
											<Text style={styles.explanationTextAll}>{question.explanation}</Text>
										</View>
									)}

									{/* Status */}
									<View style={styles.questionStatusAll}>
										{answers[questionIndex] ? (
											answers[questionIndex] === question.correctAnswer ? (
												<Text style={styles.statusCorrect}>✓ Correct</Text>
											) : (
												<Text style={styles.statusWrong}>✗ Wrong</Text>
											)
										) : (
											<Text style={styles.statusUnanswered}>○ Not Answered</Text>
										)}
									</View>
								</View>
							))}
						</ScrollView>

						{/* Footer with stats */}
						<View style={styles.allQuestionsFooter}>
							<View style={styles.statsRow}>
								<Text style={styles.statItem}>
									Total: {totalQuestions}
								</Text>
								<Text style={styles.statItem}>
									Answered: {answers.filter(a => a !== null).length}
								</Text>
								<Text style={styles.statItem}>
									Correct: {(() => {
										try {
											return answers.reduce((acc, ans, idx) => 
												acc + (ans && localQuestions[idx]?.correctAnswer === ans ? 1 : 0), 0);
										} catch (error) {
											console.error('Error calculating correct answers:', error);
											return 0;
										}
									})()}
								</Text>
							</View>
							<TouchableOpacity 
								onPress={() => setShowAllQuestions(false)} 
								style={styles.backToQuizBtn}
							>
								<Text style={styles.backToQuizText}>Back to Quiz</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Edit Question Modal */}
			<Modal visible={editQuestionOpen} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.editQuestionModal}>
						<Text style={styles.editQuestionTitle}>Edit Question</Text>
						<ScrollView style={styles.editQuestionContent}>
							<View style={styles.editQuestionRow}>
								<Text style={styles.editQuestionLabel}>Question Text:</Text>
								<TextInput 
									style={styles.editQuestionTextInput} 
									multiline
									value={editedQuestion} 
									onChangeText={setEditedQuestion}
									placeholder="Enter question text..."
								/>
							</View>

							<View style={styles.editQuestionRow}>
								<Text style={styles.editQuestionLabel}>Options:</Text>
								{editedOptions.map((option, index) => (
									<View key={index} style={styles.optionRow}>
										<TextInput 
											style={styles.optionInput} 
											value={option}
											onChangeText={(text) => {
												const newOptions = [...editedOptions];
												newOptions[index] = text;
												setEditedOptions(newOptions);
											}}
											placeholder={`Option ${index + 1}`}
										/>
										<TouchableOpacity 
											onPress={() => setEditedCorrectAnswer(index)}
											style={[styles.correctCheckbox, editedCorrectAnswer === index && styles.correctCheckboxActive]}
										>
											<Text style={styles.correctCheckboxText}>{editedCorrectAnswer === index ? '✓' : ''}</Text>
										</TouchableOpacity>
										{editedOptions.length > 2 && (
											<TouchableOpacity 
												onPress={() => {
													const newOptions = editedOptions.filter((_, i) => i !== index);
													setEditedOptions(newOptions);
													if (editedCorrectAnswer === index) {
														setEditedCorrectAnswer(0);
													} else if (editedCorrectAnswer > index) {
														setEditedCorrectAnswer(editedCorrectAnswer - 1);
													}
												}}
												style={styles.removeOptionBtn}
											>
												<Text style={styles.removeOptionText}>✕</Text>
											</TouchableOpacity>
										)}
									</View>
								))}
								
								{editedOptions.length < 6 && (
									<TouchableOpacity 
										onPress={() => setEditedOptions([...editedOptions, ''])}
										style={styles.addOptionBtn}
									>
										<Text style={styles.addOptionText}>+ Add Option</Text>
									</TouchableOpacity>
								)}
							</View>

							<View style={styles.editQuestionRow}>
								<Text style={styles.editQuestionLabel}>Explanation (optional):</Text>
								<TextInput 
									style={styles.editQuestionTextInput} 
									multiline
									value={editedExplanation} 
									onChangeText={setEditedExplanation}
									placeholder="Enter explanation for this question..."
								/>
							</View>
						</ScrollView>
						
						<View style={styles.editQuestionButtons}>
							<TouchableOpacity 
								onPress={() => {
									// Validate the edited question
									if (!editedQuestion.trim()) {
										alert('Question text cannot be empty');
										return;
									}
									
									const validOptions = editedOptions.filter(opt => opt.trim() !== '');
									if (validOptions.length < 2) {
										alert('At least 2 options are required');
										return;
									}
									
									if (editedCorrectAnswer >= validOptions.length) {
										alert('Please select a valid correct answer');
										return;
									}
									
									// Save edited question logic
									const updatedQuestion = {
										...localQuestions[currentQIndex],
										question: editedQuestion.trim(),
										options: validOptions,
										correctAnswer: editedCorrectAnswer,
										explanation: editedExplanation.trim()
									};
									
									// Update questions array with state management
									const newQuestions = [...localQuestions];
									newQuestions[currentQIndex] = updatedQuestion;
									setLocalQuestions(newQuestions);
									
									// Note: We don't mutate the original quiz prop - that's handled by parent component
									
									setEditQuestionOpen(false);
									
									// Show success message
									alert('Question updated successfully!');
								}} 
								style={styles.saveBtn}
							>
								<Text style={styles.saveBtnText}>Save Changes</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								onPress={() => setEditQuestionOpen(false)} 
								style={styles.cancelBtn}
							>
								<Text style={styles.cancelBtnText}>Cancel</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Share Modal */}
			<Modal visible={shareOpen} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.shareModal}>
						<Text style={styles.shareTitle}>📤 Share Options</Text>
						<View style={styles.shareContent}>
							<View style={styles.shareStats}>
								<Text style={styles.shareQuizTitle}>🎯 {quiz?.title || 'Quiz'}</Text>
								<Text style={styles.shareScore}>
									{correctCount} / {totalQuestions}
								</Text>
								<Text style={styles.sharePercentage}>
									{Math.round((correctCount / totalQuestions) * 100)}% Score
								</Text>
							</View>

							<View style={styles.shareButtons}>
								<TouchableOpacity 
									onPress={shareResults}
									style={styles.shareResultsBtn}
								>
									<Text style={styles.shareResultsBtnText}>🏆 Share Results</Text>
								</TouchableOpacity>

								<TouchableOpacity 
									onPress={shareDetailedSummary}
									style={styles.shareDetailedBtn}
								>
									<Text style={styles.shareDetailedBtnText}>📊 Share Detailed Summary</Text>
								</TouchableOpacity>

								<TouchableOpacity 
									onPress={shareQuiz}
									style={styles.shareQuizBtn}
								>
									<Text style={styles.shareQuizBtnText}>🎯 Share Quiz</Text>
								</TouchableOpacity>

								<TouchableOpacity 
									onPress={shareCurrentQuestion}
									style={styles.shareQuestionBtn}
								>
									<Text style={styles.shareQuestionBtnText}>📝 Share Question</Text>
								</TouchableOpacity>
							</View>
						</View>
						
						<View style={styles.shareModalButtons}>
							<TouchableOpacity 
								onPress={() => setShareOpen(false)} 
								style={styles.closeBtn}
							>
								<Text style={styles.closeBtnText}>Close</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Enhanced Image Upload Modal */}
			<Modal visible={imageUploadModalOpen} transparent animationType="slide">
				<View style={styles.modernModalOverlay}>
					<View style={styles.modernImageUploadModal}>
						{/* Modern Header */}
						<View style={styles.modernModalHeader}>
							<View style={styles.modalHeaderLeft}>
								<View style={styles.modalIconContainer}>
									<Text style={styles.modalHeaderIcon}>📷</Text>
								</View>
								<View>
									<Text style={styles.modernModalTitle}>Add Image</Text>
									<Text style={styles.modernModalSubtitle}>Question {currentQIndex + 1}</Text>
								</View>
							</View>
							<TouchableOpacity 
								onPress={() => setImageUploadModalOpen(false)}
								style={styles.modernCloseBtn}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Text style={styles.modernCloseBtnText}>✕</Text>
							</TouchableOpacity>
						</View>
						
						<ScrollView style={styles.modernModalContent} showsVerticalScrollIndicator={false}>
							{/* Description Card */}
							<View style={styles.descriptionCard}>
								
							</View>
							
							{/* Main Image Preview Section */}
							<View style={styles.mainPreviewSection}>
								{images[currentQIndex] && images[currentQIndex][galleryIdx] ? (
									<TouchableOpacity 
										onPress={() => setImagePreview({ open: true, src: images[currentQIndex][galleryIdx] })}
										style={styles.mainImagePreview}
										activeOpacity={0.8}
									>
										<Image 
											source={{ uri: images[currentQIndex][galleryIdx] }}
											style={styles.mainPreviewImage}
											resizeMode="cover"
										/>
										<View style={styles.imageOverlay}>
											<Text style={styles.overlayText}>👆 Tap to view full size</Text>
										</View>
									</TouchableOpacity>
								) : (
									<View style={styles.emptyImagePlaceholder}>
										<View style={styles.placeholderIconContainer}>
											<Text style={styles.placeholderIcon}>🖼️</Text>
										</View>
										<Text style={styles.placeholderTitle}>No Image Selected</Text>
										<Text style={styles.placeholderSubtext}>Choose from gallery or take a new photo</Text>
									</View>
								)}
							</View>
							
							{/* Action Buttons */}
							<View style={styles.actionButtonsContainer}>
								<TouchableOpacity 
									onPress={async () => {
										const uri = await pickImage();
										if (uri) addImageToQuestion(uri);
									}}
									style={[styles.modernActionBtn, styles.galleryBtn]}
									activeOpacity={0.8}
								>
									<View style={styles.btnIconContainer}>
										<Text style={styles.btnIcon}>📱</Text>
									</View>
									<View style={styles.btnTextContainer}>
										<Text style={styles.btnTitle}>Gallery</Text>
										<Text style={styles.btnSubtext}>Choose existing photo</Text>
									</View>
								</TouchableOpacity>
								
								<TouchableOpacity 
									onPress={async () => {
										const uri = await takePhoto();
										if (uri) addImageToQuestion(uri);
									}}
									style={[styles.modernActionBtn, styles.cameraBtn]}
									activeOpacity={0.8}
								>
									<View style={styles.btnIconContainer}>
										<Text style={styles.btnIcon}>📸</Text>
									</View>
									<View style={styles.btnTextContainer}>
										<Text style={styles.btnTitle}>Camera</Text>
										<Text style={styles.btnSubtext}>Take new photo</Text>
									</View>
								</TouchableOpacity>
							</View>
							
							{/* Current Images Gallery */}
							{images[currentQIndex] && images[currentQIndex].some(img => img) && (
								<View style={styles.gallerySection}>
									<Text style={styles.gallerySectionTitle}>📸 Your Images ({images[currentQIndex].filter(img => img).length})</Text>
									<ScrollView 
										horizontal 
										style={styles.horizontalGallery} 
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.galleryContentContainer}
									>
										{images[currentQIndex].map((img, idx) => img && (
											<TouchableOpacity 
												key={idx} 
												style={[
													styles.galleryImageItem,
													idx === galleryIdx && styles.selectedGalleryItem
												]}
												onPress={() => setGalleryIdx(idx)}
												activeOpacity={0.7}
											>
												<Image source={{ uri: img }} style={styles.galleryImageThumb} />
												{idx === galleryIdx && (
													<View style={styles.selectedIndicator}>
														<Text style={styles.selectedIndicatorText}>✓</Text>
													</View>
												)}
												<TouchableOpacity 
													onPress={() => removeImageFromQuestion(idx)}
													style={styles.deleteImageBtn}
													hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
												>
													<Text style={styles.deleteImageBtnText}>✕</Text>
												</TouchableOpacity>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>
							)}
						</ScrollView>
						
						{/* Modern Footer */}
						<View style={styles.modernModalFooter}>
							<TouchableOpacity 
								onPress={() => setImageUploadModalOpen(false)}
								style={styles.modernDoneBtn}
								activeOpacity={0.8}
							>
								<Text style={styles.modernDoneBtnText}>✨ Done</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Image Preview Full Screen Modal */}
			<Modal visible={imagePreview.open} transparent animationType="fade">
				<View style={styles.imagePreviewFullOverlay}>
					<TouchableOpacity 
						style={styles.imagePreviewFullContainer}
						onPress={() => setImagePreview({ open: false, src: '' })}
					>
						<Image 
							source={{ uri: imagePreview.src }}
							style={styles.imagePreviewFull}
							resizeMode="contain"
						/>
						<TouchableOpacity 
							onPress={() => setImagePreview({ open: false, src: '' })}
							style={styles.imagePreviewCloseBtn}
						>
							<Text style={styles.imagePreviewCloseBtnText}>✕</Text>
						</TouchableOpacity>
					</TouchableOpacity>
				</View>
			</Modal>

			{/* Enhanced YouTube Modal */}
			<Modal visible={youtubeModalOpen} transparent animationType="slide">
				<View style={styles.modernModalOverlay}>
					<View style={styles.modernYoutubeModal}>
						{/* Modern Header */}
						<View style={styles.modernModalHeader}>
							<View style={styles.modalHeaderLeft}>
								<View style={[styles.modalIconContainer, { backgroundColor: '#fef3e2' }]}>
									<Text style={styles.modalHeaderIcon}>🎥</Text>
								</View>
								<View>
									<Text style={styles.modernModalTitle}>YouTube Link</Text>
									<Text style={styles.modernModalSubtitle}>Question {currentQIndex + 1}</Text>
								</View>
							</View>
							<TouchableOpacity 
								onPress={() => setYoutubeModalOpen(false)}
								style={styles.modernCloseBtn}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Text style={styles.modernCloseBtnText}>✕</Text>
							</TouchableOpacity>
						</View>
						
						<ScrollView style={styles.modernModalContent} showsVerticalScrollIndicator={false}>
							{/* Description Card */}
							<View style={[styles.descriptionCard, { borderLeftColor: '#f59e0b' }]}>
								<Text style={styles.descriptionTitle}>🎬 Add Video Resource</Text>
								<Text style={styles.descriptionText}>
									Share a helpful YouTube video that explains concepts related to this question
								</Text>
							</View>
							
							{/* Current Link Display */}
							{ytLinks[currentQIndex] && (
								<View style={styles.currentVideoSection}>
									<Text style={styles.currentVideoTitle}>📺 Current Video</Text>
									<TouchableOpacity 
										onPress={() => Linking.openURL(ytLinks[currentQIndex])}
										style={styles.currentVideoCard}
										activeOpacity={0.8}
									>
										<View style={styles.videoCardIcon}>
											<Text style={styles.videoCardIconText}>▶️</Text>
										</View>
										<View style={styles.videoCardContent}>
											<Text style={styles.videoCardTitle}>Tap to watch</Text>
											<Text style={styles.videoCardUrl} numberOfLines={2}>
												{ytLinks[currentQIndex]}
											</Text>
										</View>
									</TouchableOpacity>
								</View>
							)}
							
							{/* URL Input Section */}
							<View style={styles.urlInputSection}>
								<Text style={styles.urlInputTitle}>🔗 YouTube URL</Text>
								<View style={styles.modernInputContainer}>
									<TextInput
										style={styles.modernInput}
										value={tempYoutubeLink}
										onChangeText={setTempYoutubeLink}
										placeholder="Paste YouTube link here..."
										placeholderTextColor="#9ca3af"
										autoCapitalize="none"
										autoCorrect={false}
										multiline
									/>
									{tempYoutubeLink.length > 0 && (
										<TouchableOpacity 
											onPress={() => setTempYoutubeLink('')}
											style={styles.clearInputBtn}
										>
											<Text style={styles.clearInputBtnText}>✕</Text>
										</TouchableOpacity>
									)}
								</View>
								{tempYoutubeLink && !isValidYouTubeUrl(tempYoutubeLink) && (
									<Text style={styles.errorText}>
										⚠️ Please enter a valid YouTube URL
									</Text>
								)}
							</View>
							
							{/* YouTube Preview */}
							{tempYoutubeLink && isValidYouTubeUrl(tempYoutubeLink) && (
								<View style={styles.previewSection}>
									<Text style={styles.previewSectionTitle}>👀 Preview</Text>
									<View style={styles.videoPreviewContainer}>
										<WebView
											source={{ uri: getYouTubeEmbedUrl(tempYoutubeLink) }}
											style={styles.modernVideoPreview}
											allowsInlineMediaPlayback
											mediaPlaybackRequiresUserAction={false}
										/>
									</View>
								</View>
							)}
						</ScrollView>
						
						{/* Modern Footer */}
						<View style={styles.modernModalFooter}>
							<View style={styles.youtubeModalActions}>
								<TouchableOpacity 
									onPress={() => {
										setTempYoutubeLink('');
										setYoutubeModalOpen(false);
									}}
									style={styles.modernCancelBtn}
									activeOpacity={0.8}
								>
									<Text style={styles.modernCancelBtnText}>Cancel</Text>
								</TouchableOpacity>
								
								<TouchableOpacity 
									onPress={() => {
										if (tempYoutubeLink.trim()) {
											const updatedLinks = [...ytLinks];
											updatedLinks[currentQIndex] = tempYoutubeLink.trim();
											setYtLinks(updatedLinks);
											persistYtLinks(updatedLinks);
										}
										setTempYoutubeLink('');
										setYoutubeModalOpen(false);
									}}
									style={[
										styles.modernSaveBtn, 
										!tempYoutubeLink.trim() && styles.modernSaveBtnDisabled
									]}
									disabled={!tempYoutubeLink.trim()}
									activeOpacity={0.8}
								>
									<Text style={[
										styles.modernSaveBtnText,
										!tempYoutubeLink.trim() && styles.modernSaveBtnTextDisabled
									]}>
										💾 Save Link
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>

			{/* Media View Modal */}
			<Modal visible={mediaViewModalOpen} transparent animationType="slide">
				<View style={styles.modernModalOverlay}>
					<View style={[styles.modernImageUploadModal, { height: isTablet ? '95%' : '50%' }]}>
						{/* Header with close and delete buttons */}
						<View style={styles.modernModalHeader}>
							<View style={styles.modalHeaderLeft}>
								<View style={styles.modalIconContainer}>
									<Text style={styles.modalHeaderIcon}> 
										{selectedMediaBox?.contentType === 'image' ? '🖼️' : 
										 selectedMediaBox?.contentType === 'youtube' ? '🎬' : '🌐'}
									</Text>
								</View>
								<View>
									<Text style={styles.modernModalTitle}>Media Viewer</Text>
									<Text style={styles.modernModalSubtitle}>
										{selectedMediaBox?.contentType === 'image' ? 'Image Preview' : 
										 selectedMediaBox?.contentType === 'youtube' ? 'YouTube Video' : 'Website Preview'}
									</Text>
								</View>
							</View>
							<View style={{ flexDirection: 'row', gap: 10 }}>
								{/* Delete button */}
								<TouchableOpacity 
									style={[styles.modernCloseBtn, { backgroundColor: '#ff4d4d' }]}
									onPress={() => {
										if (selectedMediaBox) {
											deleteMediaBox(selectedMediaBox.id);
											setMediaViewModalOpen(false);
											setSelectedMediaBox(null);
										}
									}}
								>
									<Text style={[styles.modernCloseBtnText, { color: '#ffffff' }]}>🗑️</Text>
								</TouchableOpacity>
								{/* Open in browser button (for YouTube/Website) */}
								{(selectedMediaBox?.contentType === 'youtube' || selectedMediaBox?.contentType === 'website') && (
									<TouchableOpacity 
										style={[styles.modernCloseBtn, { backgroundColor: '#3b82f6' }]}
										onPress={() => {
											if (selectedMediaBox?.contentUrl) {
												Linking.openURL(selectedMediaBox.contentUrl);
											}
										}}
									>
										<Text style={[styles.modernCloseBtnText, { color: '#ffffff' }]}>🔗</Text>
									</TouchableOpacity>
								)}
								{/* Close button */}
								<TouchableOpacity 
									style={styles.modernCloseBtn}
									onPress={() => {
										setMediaViewModalOpen(false);
										setSelectedMediaBox(null);
									}}
								>
									<Text style={styles.modernCloseBtnText}>✕</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Media content */}
						<View style={styles.modernModalContent}>
							<View style={styles.mediaViewerContent}>
								{selectedMediaBox?.contentType === 'image' ? (
									<Image 
										source={{ uri: selectedMediaBox.contentUrl }}
										style={styles.mediaViewerImage}
										resizeMode="contain"
									/>
								) : selectedMediaBox?.contentType === 'youtube' ? (
									<WebView 
										source={{ uri: getYouTubeEmbedUrl(selectedMediaBox.contentUrl) }}
										style={styles.mediaViewerWebView}
										allowsFullscreenVideo={true}
									/>
								) : selectedMediaBox?.contentType === 'website' ? (
									<WebView 
										source={{ uri: selectedMediaBox.contentUrl }}
										style={styles.mediaViewerWebView}
									/>
								) : null}
							</View>
						</View>
					</View>
				</View>
			</Modal>

			{/* Media Upload Modal */}
			<Modal visible={mediaUploadModalOpen} transparent animationType="slide">
				<View style={styles.modernModalOverlay}>
					<View style={styles.doubleClickPopup}>
						<View style={styles.modernModalHeader}>
							<View style={styles.modalHeaderLeft}>
								<View style={styles.modalIconContainer}>
									<Text style={styles.modalHeaderIcon}>📁</Text>
								</View>
								<View>
									<Text style={styles.modernModalTitle}>Upload Media</Text>
									<Text style={styles.modernModalSubtitle}>Add image, YouTube video, or website</Text>
								</View>
							</View>
							<TouchableOpacity 
								style={styles.modernCloseBtn}
								onPress={() => {
									setMediaUploadModalOpen(false);
									setCurrentEditingBox(null);
									setUploadImageUri('');
									setUploadYoutubeUrl('');
									setUploadWebsiteUrl('');
								}}
							>
								<Text style={styles.modernCloseBtnText}>✕</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.modernModalContent}>
							{/* Image Upload Section */}
							<View style={styles.uploadSection}>
								<Text style={styles.uploadSectionLabel}>📷 Image Upload</Text>
								<View style={styles.uploadButtonsContainer}>
									<TouchableOpacity 
										style={styles.uploadActionBtn}
										onPress={async () => {
											const result = await ImagePicker.launchImageLibraryAsync({
												mediaTypes: ImagePicker.MediaTypeOptions.Images,
												allowsEditing: true,
												aspect: [1, 1],
												quality: 0.8,
											});
											if (!result.canceled && result.assets[0]) {
												const uri = result.assets[0].uri;
												setUploadImageUri(uri);
												// Immediately upload using the selected URI to avoid stale state
												await handleMediaUpload(uri);
											}
										}}
									>
										<Text style={styles.uploadActionBtnText}>📂 Gallery</Text>
									</TouchableOpacity>
									<TouchableOpacity 
										style={styles.uploadActionBtn}
										onPress={async () => {
											const result = await ImagePicker.launchCameraAsync({
												mediaTypes: ImagePicker.MediaTypeOptions.Images,
												allowsEditing: true,
												aspect: [1, 1],
												quality: 0.8,
											});
											if (!result.canceled && result.assets[0]) {
												const uri = result.assets[0].uri;
												setUploadImageUri(uri);
												// Immediately upload using the selected URI to avoid stale state
												await handleMediaUpload(uri);
											}
										}}
									>
										<Text style={styles.uploadActionBtnText}>📸 Camera</Text>
									</TouchableOpacity>
								</View>
								{uploadImageUri ? (
									<Image source={{ uri: uploadImageUri }} style={styles.uploadPreviewImage} />
								) : null}
							</View>

							{/* YouTube URL Section */}
							<View style={styles.uploadSection}>
								<Text style={styles.uploadSectionLabel}>🎬 YouTube URL</Text>
								<TextInput
									style={styles.uploadInput}
									placeholder="https://www.youtube.com/watch?v=..."
									value={uploadYoutubeUrl}
									onChangeText={setUploadYoutubeUrl}
									autoCapitalize="none"
									autoCorrect={false}
								/>
							</View>

							{/* Website URL Section */}
							<View style={styles.uploadSection}>
								<Text style={styles.uploadSectionLabel}>🌐 Website URL</Text>
								<TextInput
									style={styles.uploadInput}
									placeholder="https://www.example.com"
									value={uploadWebsiteUrl}
									onChangeText={setUploadWebsiteUrl}
									autoCapitalize="none"
									autoCorrect={false}
								/>
							</View>

							{/* Upload Button */}
							<TouchableOpacity 
								style={styles.uploadSubmitBtn}
								onPress={handleMediaUpload}
							>
								<Text style={styles.uploadSubmitBtnText}>📤 Upload Media</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Message Box Modal */}
			<Modal visible={messageBoxVisible} transparent animationType="fade">
				<View style={styles.messageBoxOverlay}>
					<View style={styles.messageBoxContainer}>
						<Text style={styles.messageBoxText}>{messageBoxText}</Text>
						<TouchableOpacity 
							style={styles.messageBoxBtn}
							onPress={() => setMessageBoxVisible(false)}
						>
							<Text style={styles.messageBoxBtnText}>OK</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		
	},

	contentContainer: {
		flex: 1,
				borderTopLeftRadius: isTablet ? 30 : 20,
		borderTopRightRadius: isTablet ? 30 : 20,
		marginTop: isSmallScreen ? 5 : 10,
		marginHorizontal: isTablet ? 20 : 0,
		paddingTop: isTablet ? 30 : 20,
		paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
		paddingBottom: 320, // Increased padding for media gallery + navigation
	},

	quizTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1f2937',
		textAlign: 'center',
	},
	logoutBtn: {
		backgroundColor: '#ef4444',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		shadowColor: '#ef4444',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	logoutText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 14,
		textShadowColor: 'rgba(0, 0, 0, 0.3)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	editBtn: {
		backgroundColor: '#8b5cf6',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		shadowColor: '#8b5cf6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
		marginRight: 8,
	},
	editBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 14,
	},
	shareBtn: {
		backgroundColor: '#10b981',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		shadowColor: '#10b981',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
		marginRight: 8,
	},
	shareBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 14,
	},
	settingsBtn: {
		backgroundColor: '#3b82f6',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
		marginRight: 8,
	},
	settingsBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 14,
	},
	
	// Timer and Controls Bar - Web UI Matching
	timerControlsBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
		paddingVertical: isTablet ? 12 : 8,
		marginBottom: isTablet ? 20 : 16,
		backgroundColor: '#ffffff',
		borderRadius: isTablet ? 12 : 8,
		marginHorizontal: isSmallScreen ? 8 : isTablet ? 24 : 16,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	timerSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timerQuestionGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	questionNumberDisplay: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3b82f6',
		backgroundColor: '#eff6ff',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		minWidth: 40,
		textAlign: 'center',
	},
	timerDisplay: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#ef4444',
		fontFamily: 'monospace',
		minWidth: 40,
	},
	playPauseBtn: {
		width: 32,
		height: 24,
		borderRadius: 6,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e9ecef',
		justifyContent: 'center',
		alignItems: 'center',
	},
	playPauseIcon: {
		color: '#666666',
		fontSize: 12,
		fontWeight: 'normal',
	},
	actionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: isSmallScreen ? 6 : isTablet ? 12 : 8,
		flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
	},
	actionBtn: {
		width: isSmallScreen ? 28 : isTablet ? 40 : 32,
		height: isSmallScreen ? 20 : isTablet ? 32 : 24,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		borderRadius: isTablet ? 8 : 6,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	actionBtnActive: {
		backgroundColor: '#e3f2fd',
		borderColor: '#2196f3',
	},
	actionIconActive: {
		color: '#3b82f6',
	},
	actionIcon: {
		fontSize: 16,
		color: '#666666',
		fontWeight: 'normal',
		textAlign: 'center',
	},
	shareIcon: {
		width: 16,
		height: 16,
		tintColor: '#666666',
	},
	ttsIcon: {
		fontSize: 16,
		color: '#374151',
		textAlign: 'center',
		fontWeight: '500',
	},
	
	// Progress Section
	progressSection: {
		// marginBottom: isTablet ? 28 : 1,
		paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
	},
	progressBarContainer: {
		height: isSmallScreen ? 24 : isTablet ? 36 : 28,
		backgroundColor: '#e5e7eb',
		borderRadius: isSmallScreen ? 12 : isTablet ? 18 : 14,
		overflow: 'hidden',
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center',
	},
	progressBar: {
		position: 'absolute',
		left: 0,
		top: 0,
		height: '100%',
		backgroundColor: '#3b82f6',
		borderRadius: 14,
	},
	progressBarText: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#ffffff',
		zIndex: 1,
		textAlign: 'center',
	},
	progressCounter: {
		textAlign: 'center',
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3b82f6',
	},
	
	// Question Timer Circle
	questionTimerContainer: {
		alignItems: 'center',
		marginBottom: 15,
	},
	questionTimerCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#ffffff',
		borderWidth: 2,
		borderColor: '#ef4444',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#ef4444',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 4,
	},
	questionTimerText: {
		fontSize: isSmallScreen ? 16 : isTablet ? 22 : 20,
		fontWeight: 'bold',
		
	},
	
	// Question Container
	questionContainer: {
		paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
		marginBottom: isTablet ? 32 : 18,
		maxHeight: isSmallScreen ? 220 : isTablet ? 320 : 260,
		overflow: 'hidden',
	},
	questionHeader: {
		alignItems: 'center',
	},
	questionText: {
		fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18,
		fontWeight: '600',
		color: '#1f2937',
		textAlign: 'center',
		lineHeight: isSmallScreen ? 22 : isTablet ? 28 : 24,
		flexWrap: 'wrap',
		maxHeight: isSmallScreen ? 200 : isTablet ? 300 : 240,
	},
	mediaStatusIndicator: {
		backgroundColor: 'rgba(34, 197, 94, 0.1)',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginTop: 8,
		alignSelf: 'center',
	},
	mediaStatusText: {
		fontSize: 12,
		color: '#059669',
		fontWeight: '600',
	},
	
	// YouTube Container and Styles
	youtubeContainer: {
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	youtubeLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6b7280',
		marginBottom: 8,
	},
	youtubeInput: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#1f2937',
		backgroundColor: '#ffffff',
		marginBottom: 8,
	},
	youtubeError: {
		fontSize: 12,
		color: '#ef4444',
		marginBottom: 8,
		paddingHorizontal: 4,
	},
	youtubePreview: {
		aspectRatio: 16/9,
		backgroundColor: '#000000',
		borderRadius: 8,
		overflow: 'hidden',
		marginTop: 8,
	},
	youtubeWebView: {
		flex: 1,
		backgroundColor: '#000000',
	},
	
	// Image Upload Styles
	imageSection: {
		backgroundColor: '#f9fafb',
		borderRadius: 12,
		padding: 16,
		margin: 20,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	imageSectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	imageUploadButton: {
		backgroundColor: '#3b82f6',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 16,
		alignItems: 'center',
		marginBottom: 12,
	},
	imageUploadButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	imageGallery: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	imageItem: {
		position: 'relative',
		width: 80,
		height: 80,
	},
	uploadedImage: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
		backgroundColor: '#f3f4f6',
	},
	imageDeleteButton: {
		position: 'absolute',
		top: -5,
		right: -5,
		backgroundColor: '#ef4444',
		borderRadius: 12,
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	imageDeleteText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
	},
	
	// Options Container
		optionsContainer: {
			marginBottom: isTablet ? 28 : 14,
			paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
			gap: isSmallScreen ? 12 : isTablet ? 20 : 15,
		},
		
		// Content Boxes Container
		contentBoxesContainer: {
			flexDirection: 'row',
			justifyContent: 'center',
			gap: isSmallScreen ? 8 : isTablet ? 16 : 12,
			paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
			marginBottom: isTablet ? 28 : 10,
		},
		contentBox: {
			width: 80,
			
			height: 80,
			
			
			borderStyle: 'dashed',
			shadowColor: '#000000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 4,
			elevation: 2,
		},
		contentBoxInner: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			padding: 8,
		},
		contentBoxIcon: {
			fontSize: 24,
			marginBottom: 4,
		},
		contentBoxLabel: {
			fontSize: 10,
			color: '#6b7280',
			fontWeight: '500',
			textAlign: 'center',
		},
		
		optionButton: {
			backgroundColor: '#ffffff',
			borderWidth: 1,
			borderColor: '#e5e7eb',
			borderRadius: isTablet ? 20 : 16,
			paddingVertical: isSmallScreen ? 14 : isTablet ? 24 : 18,
			paddingHorizontal: isSmallScreen ? 18 : isTablet ? 28 : 22,
			shadowColor: '#000000',
			shadowOffset: { width: 0, height: 3 },
			shadowOpacity: 0.1,
			shadowRadius: 6,
			elevation: 3,
			marginBottom: isSmallScreen ? 12 : isTablet ? 20 : 15,
		},
		optionText: {
			fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
			color: '#374151',
			textAlign: 'center',
			fontWeight: '500',
			lineHeight: isTablet ? 24 : 20,
		},
		optionCorrect: {
			backgroundColor: '#dcfce7',
			borderColor: '#16a34a',
			borderWidth: 2,
		},
		optionCorrectText: {
			color: '#15803d',
			fontWeight: 'bold',
		},
		optionWrong: {
			backgroundColor: '#fef2f2',
			borderColor: '#dc2626',
			borderWidth: 2,
		},
		optionWrongText: {
			color: '#dc2626',
			fontWeight: 'bold',
		},
		optionCorrectPreview: {
			backgroundColor: '#f0fdf4',
			borderColor: '#22c55e',
			borderWidth: 1,
		},
		optionContent: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			width: '100%',
		},
		feedbackIcon: {
			fontSize: 18,
			marginLeft: 8,
		},
		progressBarContainer: {
			position: 'relative',
			height: 22,
			backgroundColor: '#e5e7eb',
			borderRadius: 12,
			marginBottom: 24,
			justifyContent: 'center',
			overflow: 'hidden',
			shadowColor: '#000000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
			elevation: 1,
		},
		progressBar: {
			position: 'absolute',
			left: 0,
			top: 0,
			height: 24,
			backgroundColor: '#3b82f6',
			borderRadius: 12,
			shadowColor: '#3b82f6',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.3,
			shadowRadius: 2,
		},
		progressText: {
			textAlign: 'center',
			fontSize: 13,
			color: '#1f2937',
			fontWeight: 'bold',
			zIndex: 1,
		},
		question: {
			fontSize: 20,
			fontWeight: '600',
			color: '#1f2937',
			marginBottom: 23,
			textAlign: 'center',
			lineHeight: 28,
			paddingHorizontal: 15,
			backgroundColor: '#ffffff',
			paddingVertical: 19,
			borderRadius: 16,
			shadowColor: '#000000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 6,
			elevation: 2,
		},
		optionsContainer: {
			marginBottom: 7,
			paddingHorizontal: 7,
		},
		optionBtn: {
			backgroundColor: '#ffffff',
			borderColor: '#d1d5db',
			borderWidth: 2,
			borderRadius: 16,
			padding: 18,
			
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#000000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.08,
			shadowRadius: 6,
			elevation: 3,
			minHeight: 57,
			marginBottom: 15, // <-- Properly add space between options from bottom, increment value as needed
			},
			optionText: {
				fontSize: 16,
				color: '#374151',
				lineHeight: 24,
				textAlign: 'center',
				fontWeight: '500',
			},
			optionCorrect: {
				backgroundColor: '#dcfce7',
				borderColor: '#22c55e',
				shadowColor: '#22c55e',
				shadowOpacity: 0.2,
			},
			optionWrong: {
				backgroundColor: '#fecaca',
				borderColor: '#ef4444',
				shadowColor: '#ef4444',
				shadowOpacity: 0.2,
			},
			optionCorrectPreview: {
				backgroundColor: '#f0fdf4',
				borderColor: '#22c55e',
				shadowColor: '#22c55e',
				shadowOpacity: 0.1,
			},
			explanationContainer: {
				padding: 20,
				marginBottom: 17,
				marginHorizontal: 8,
				
				
			},
			explanationText: {
				fontSize: 15,
				color: '#374151',
				lineHeight: 22,
				textAlign: 'center',
			},
			navContainer: {
				position: 'absolute',
				bottom: 1,
				left: 0,
				right: 0,
				height: 100,
				flexDirection: 'column',
				backgroundColor: 'transparent',
				padding: 3,
				paddingTop: 3,
				paddingBottom: 2,
				zIndex: 1000,
			},
			navArrowContainer: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				
				paddingHorizontal: 2,
			},
			navArrowBtn: {
				width: 50,
				height: 50,
				backgroundColor: '#f8fafc',
				borderRadius: 6,
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1,
				borderWidth: 0.5,
				borderColor: '#cbd5e1',
			},
			navArrowBtnDisabled: {
				backgroundColor: '#e5e7eb',
				opacity: 0.6,
				borderColor: '#d1d5db',
			},
			navArrowText: {
				fontSize: 14,
				fontWeight: 'bold',
				color: '#1f2937',
			},
			navArrowTextDisabled: {
				color: '#9ca3af',
			},
			navContentContainer: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'stretch',
				paddingHorizontal: 2,
				marginBottom: 1,
				gap: 2,
				zIndex: 1,
				flex: 1,
			},
			navCloseBtn: {
				width: 40,
				height: 40,
				backgroundColor: '#ef4444',
				borderRadius: 20,
				alignItems: 'center',
				justifyContent: 'center',
				elevation: 5,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.25,
				shadowRadius: 4,
			},
			navContentBox: {
				flex: 1,
				height: 50,
				backgroundColor: '#ffffff',
				borderRadius: 6,
				borderWidth: 0.5,
				borderColor: '#e5e7eb',
				borderStyle: 'solid',
				marginHorizontal: 0.5,
			},
			interactiveContentBox: {
				justifyContent: 'center',
				alignItems: 'center',
				padding: 1,
				backgroundColor: '#f8fafc',
				borderColor: '#3b82f6',
				borderStyle: 'solid',
			},
			contentBoxHint: {
				fontSize: 8,
				marginBottom: 0.5,
				textAlign: 'center',
				lineHeight: 10,
			},
			contentBoxLabel: {
				fontSize: 4,
				color: '#374151',
				textAlign: 'center',
				fontWeight: '500',
				lineHeight: 5,
				marginBottom: 0.2,
			},
			navCloseBtnContainer: {
				alignItems: 'center',
				justifyContent: 'center',
				marginTop: 5,
				zIndex: 2,
			},
			
			navCloseBtnText: {
				fontSize: 16,
				fontWeight: 'bold',
				color: '#ffffff',
			},
			noQuestionContainer: {
				flex: 1,
				justifyContent: 'center',
				alignItems: 'center',
				padding: 32,
				backgroundColor: '#ffffff',
				borderRadius: 20,
				margin: 16,
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
				elevation: 4,
			},
			noQuestionText: {
				fontSize: 18,
				color: '#ef4444',
				marginBottom: 20,
				textAlign: 'center',
				fontWeight: '500',
			},
			backBtn: {
				backgroundColor: '#2563eb',
				paddingHorizontal: 24,
				paddingVertical: 12,
				borderRadius: 12,
				shadowColor: '#2563eb',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.2,
				shadowRadius: 4,
				elevation: 2,
			},
			backBtnText: {
				color: '#ffffff',
				fontWeight: 'bold',
				fontSize: 16,
			},
			modalOverlay: {
				flex: 1,
				backgroundColor: 'rgba(0,0,0,0.3)',
				justifyContent: 'center',
				alignItems: 'center',
				paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
			},
			settingsModal: {
				backgroundColor: '#ffffff',
				borderRadius: 12,
				padding: 20,
				width: 350,
				maxHeight: '85%',
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.15,
				shadowRadius: 20,
				elevation: 10,
			},
			settingsTitle: {
				fontSize: 20,
				fontWeight: 'bold',
				textAlign: 'center',
				marginBottom: 4,
				color: '#1f2937',
			},
			settingsDivider: {
				height: 1,
				backgroundColor: '#e5e7eb',
				marginBottom: 16,
			},
			settingsContent: {
				maxHeight: 450,
				paddingHorizontal: 4,
			},
			settingsRow: {
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: 16,
				paddingVertical: 4,
			},
			settingsLabel: {
				fontSize: 14,
				color: '#374151',
				flex: 1,
				marginRight: 12,
			},
			settingsInput: {
				borderWidth: 1,
				borderColor: '#e5e7eb',
				borderRadius: 8,
				paddingHorizontal: 12,
				paddingVertical: 10,
				width: 70,
				textAlign: 'center',
				fontSize: 14,
				backgroundColor: '#ffffff',
				color: '#1f2937',
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.05,
				shadowRadius: 2,
				elevation: 1,
			},
			settingsCheckbox: {
				width: 24,
				height: 24,
				borderWidth: 1,
				borderColor: '#3b82f6',
				borderRadius: 6,
				backgroundColor: '#ffffff',
				alignItems: 'center',
				justifyContent: 'center',
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.05,
				shadowRadius: 2,
				elevation: 1,
			},
			settingsCheckboxActive: {
				backgroundColor: '#3b82f6',
			},
			settingsCheckboxText: {
				color: '#ffffff',
				fontSize: 12,
				fontWeight: 'bold',
			},
			settingsDropdown: {
				minWidth: 120,
			},
			settingsDropdownButton: {
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				borderWidth: 1,
				borderColor: '#e5e7eb',
				borderRadius: 12,
				paddingHorizontal: 16,
				paddingVertical: 12,
				backgroundColor: '#ffffff',
				minWidth: 120,
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 4,
				elevation: 2,
			},
			settingsDropdownText: {
				fontSize: 14,
				color: '#374151',
				flex: 1,
			},
			settingsDropdownArrow: {
				fontSize: 10,
				color: '#6b7280',
				marginLeft: 8,
			},
			settingsNote: {
				fontSize: 12,
				color: '#6b7280',
				textAlign: 'center',
				fontStyle: 'italic',
				marginTop: 16,
				lineHeight: 16,
			},
			settingsButtons: {
				flexDirection: 'row',
				justifyContent: 'center',
				gap: 12,
				marginTop: 20,
				paddingTop: 16,
				borderTopWidth: 1,
				borderTopColor: '#e5e7eb',
			},
			settingsApplyBtn: {
				backgroundColor: '#22c55e',
				borderRadius: 12,
				paddingVertical: 12,
				paddingHorizontal: 24,
				alignItems: 'center',
				minWidth: 100,
				shadowColor: '#22c55e',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.15,
				shadowRadius: 4,
				elevation: 3,
				borderWidth: 1,
				borderColor: '#16a34a',
			},
			settingsApplyBtnText: {
				color: '#ffffff',
				fontWeight: 'bold',
				fontSize: 14,
			},
			settingsCloseBtn: {
				backgroundColor: '#ef4444',
				borderRadius: 12,
				paddingVertical: 12,
				paddingHorizontal: 24,
				alignItems: 'center',
				minWidth: 100,
				shadowColor: '#ef4444',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.15,
				shadowRadius: 4,
				elevation: 3,
				borderWidth: 1,
				borderColor: '#dc2626',
			},
			settingsCloseBtnText: {
				color: '#ffffff',
				fontWeight: 'bold',
				fontSize: 14,
			},
			settingsResetBtn: {
				backgroundColor: '#f59e0b',
				borderRadius: 8,
				paddingVertical: 12,
				paddingHorizontal: 20,
				alignItems: 'center',
				marginTop: 16,
				marginBottom: 8,
			},
			settingsResetBtnText: {
				color: '#ffffff',
				fontWeight: 'bold',
				fontSize: 14,
			},
			confirmModal: {
				backgroundColor: '#ffffff',
				borderRadius: 16,
				padding: 18,
				width: 280,
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.12,
				shadowRadius: 32,
				elevation: 8,
				alignItems: 'center',
			},
			confirmTitle: {
				fontSize: 18,
				fontWeight: 'bold',
				marginBottom: 8,
				color: '#222222',
				textAlign: 'center',
			},
			confirmText: {
				fontSize: 14,
				color: '#222222',
				marginBottom: 12,
				textAlign: 'center',
			},
			confirmBtnRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				width: '100%',
				gap: 12,
			},
			confirmBtn: {
				backgroundColor: '#2563eb',
				paddingVertical: 12,
				paddingHorizontal: 20,
				borderRadius: 12,
				flex: 1,
				alignItems: 'center',
				shadowColor: '#2563eb',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.15,
				shadowRadius: 4,
				elevation: 3,
				borderWidth: 1,
				borderColor: '#1d4ed8',
			},
			logoutConfirmBtn: {
				backgroundColor: '#ef4444',
			},
			logoutConfirmText: {
				color: '#ffffff',
				fontWeight: 'bold',
			},
	// All Questions Modal Styles
	allQuestionsOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.8)',
	},
	allQuestionsContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
		marginTop: 50,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	allQuestionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#f9fafb',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	allQuestionsTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1a1a1a',
		textShadowColor: 'rgba(0, 0, 0, 0.1)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 1,
	},
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 12,
		backgroundColor: '#ef4444',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#ef4444',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 3,
		borderWidth: 1,
		borderColor: '#dc2626',
	},
	closeBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	allQuestionsList: {
		flex: 1,
		padding: 16,
	},
	questionCard: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		marginHorizontal: 16,
		marginBottom: 16,
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	questionHeader: {
		flexDirection: 'row',
		marginBottom: 12,
		alignItems: 'center',
	},
	questionNumber: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginRight: 12,
	},
	questionTextAll: {
		fontSize: 16,
		color: '#111827',
		flex: 1,
		lineHeight: 22,
		maxHeight: 88, // 4 lines * 22 line height
		overflow: 'hidden',
	},
	optionsListAll: {
		marginBottom: 12,
	},
	optionCardAll: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	optionTextAll: {
		fontSize: 14,
		color: '#374151',
		flex: 1,
	},
	optionCorrectAll: {
		backgroundColor: '#ecfdf5',
		borderColor: '#22c55e',
	},
	optionCorrectUserAll: {
		backgroundColor: '#dcfce7',
		borderColor: '#16a34a',
		borderWidth: 2,
	},
	optionWrongUserAll: {
		backgroundColor: '#fef2f2',
		borderColor: '#ef4444',
		borderWidth: 2,
	},
	optionCorrectTextAll: {
		color: '#15803d',
		fontWeight: '600',
	},
	optionWrongTextAll: {
		color: '#dc2626',
		fontWeight: '600',
	},
	selectedIndicator: {
		fontSize: 16,
		marginLeft: 8,
	},
	correctIndicator: {
		fontSize: 16,
		color: '#22c55e',
		fontWeight: 'bold',
		marginLeft: 8,
	},
	explanationCardAll: {
		
		padding: 12,
		marginBottom: 12,
		
	},
	explanationLabelAll: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#92400e',
		marginBottom: 4,
	},
	explanationTextAll: {
		fontSize: 14,
		color: '#78350f',
		lineHeight: 20,
	},
	questionStatusAll: {
		alignItems: 'flex-end',
	},
	statusCorrect: {
		color: '#16a34a',
		fontWeight: 'bold',
		fontSize: 12,
	},
	statusWrong: {
		color: '#dc2626',
		fontWeight: 'bold',
		fontSize: 12,
	},
	statusUnanswered: {
		color: '#6b7280',
		fontWeight: 'bold',
		fontSize: 12,
	},
	allQuestionsFooter: {
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		backgroundColor: '#f9fafb',
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 12,
	},
	statItem: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		textAlign: 'center',
	},
	backToQuizBtn: {
		backgroundColor: '#3b82f6',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 3,
		borderWidth: 1,
		borderColor: '#2563eb',
	},
	backToQuizText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	
	// Enhanced Settings Modal Styles
	settingsLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		flex: 1,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderWidth: 2,
		borderColor: '#d1d5db',
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	checkboxActive: {
		backgroundColor: '#3b82f6',
		borderColor: '#3b82f6',
	},
	checkboxText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: 'bold',
	},
	dropdownContainer: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#ffffff',
		minWidth: 120,
	},
	dropdownText: {
		fontSize: 14,
		color: '#374151',
	},
	settingsNote: {
		fontSize: 12,
		color: '#6b7280',
		fontStyle: 'italic',
		marginTop: 12,
		textAlign: 'center',
		lineHeight: 16,
	},
	applyBtn: {
		backgroundColor: '#10b981',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 6,
		marginRight: 8,
	},
	applyBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 14,
	},
	closeBtn: {
		backgroundColor: '#6b7280',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 6,
	},
	closeBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 14,
	},
	
	// Edit Question Modal Styles
	editQuestionModal: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 0,
		width: '95%',
		maxHeight: '90%',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 12,
		elevation: 10,
	},
	editQuestionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#1f2937',
		textAlign: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	editQuestionContent: {
		padding: 20,
		maxHeight: 400,
	},
	editQuestionRow: {
		marginBottom: 16,
	},
	editQuestionLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	editQuestionTextInput: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		padding: 12,
		fontSize: 14,
		backgroundColor: '#ffffff',
		minHeight: 60,
		textAlignVertical: 'top',
	},
	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	optionInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 14,
		backgroundColor: '#ffffff',
		marginRight: 8,
	},
	correctCheckbox: {
		width: 28,
		height: 28,
		borderWidth: 2,
		borderColor: '#d1d5db',
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		marginRight: 8,
	},
	correctCheckboxActive: {
		backgroundColor: '#10b981',
		borderColor: '#10b981',
	},
	correctCheckboxText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	removeOptionBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#ef4444',
		alignItems: 'center',
		justifyContent: 'center',
	},
	removeOptionText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	addOptionBtn: {
		backgroundColor: '#3b82f6',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
		alignItems: 'center',
		marginTop: 8,
	},
	addOptionText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 14,
	},
	editQuestionButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
	saveBtn: {
		backgroundColor: '#10b981',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		flex: 1,
		marginRight: 8,
		alignItems: 'center',
	},
	saveBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	cancelBtn: {
		backgroundColor: '#6b7280',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		flex: 1,
		marginLeft: 8,
		alignItems: 'center',
	},
	cancelBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	
	// Share Modal Styles
	shareModal: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 0,
		width: '90%',
		maxHeight: '80%',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 12,
		elevation: 10,
	},
	shareTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#1f2937',
		textAlign: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	shareContent: {
		padding: 20,
	},
	shareStats: {
		alignItems: 'center',
		marginBottom: 20,
	},
	shareQuizTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1f2937',
		marginBottom: 8,
		textAlign: 'center',
	},
	shareScore: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#3b82f6',
		marginBottom: 4,
	},
	sharePercentage: {
		fontSize: 16,
		color: '#6b7280',
	},
	shareButtons: {
		gap: 12,
	},
	shareResultsBtn: {
		backgroundColor: '#8b5cf6', // Purple for results (trophy-like)
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#8b5cf6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	shareResultsBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	shareDetailedBtn: {
		backgroundColor: '#10b981', // Green for detailed summary
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#10b981',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	shareDetailedBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	shareQuizBtn: {
		backgroundColor: '#06b6d4', // Cyan for sharing quiz
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#06b6d4',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	shareQuizBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	shareQuestionBtn: {
		backgroundColor: '#f59e0b', // Amber for questions
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#f59e0b',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	shareQuestionBtnText: {
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	shareModalButtons: {
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		alignItems: 'center',
	},
	
	// TTS Permission Status Styles
	settingsLabelContainer: {
		flex: 1,
	},
	settingsPermissionStatus: {
		fontSize: 12,
		marginTop: 2,
		fontWeight: '500',
	},
	permissionGranted: {
		color: '#10b981',
	},
	permissionDenied: {
		color: '#ef4444',
	},
	permissionUnknown: {
		color: '#f59e0b',
	},
	
	// Sidebar Styles
	sidebarOverlay: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	sidebarBackdrop: {
		flex: 1,
	},
	sidebar: {
		width: 320,
		backgroundColor: '#ffffff',
		height: '100%',
		elevation: 8,
		shadowColor: '#000000',
		shadowOffset: { width: -2, height: 0 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
	},
	sidebarHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#f8fafc',
	},
	sidebarTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1f2937',
	},
	sidebarCloseBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	sidebarCloseText: {
		fontSize: 16,
		color: '#6b7280',
		fontWeight: '600',
	},
	sidebarProgress: {
		padding: 16,
		backgroundColor: '#f0f9ff',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	progressText: {
		fontSize: 14,
		color: '#1e40af',
		fontWeight: '600',
		marginBottom: 4,
	},
	progressScore: {
		fontSize: 14,
		color: '#059669',
		fontWeight: '500',
	},
	questionList: {
		flex: 1,
		padding: 8,
	},
	questionItem: {
		backgroundColor: '#ffffff',
		marginBottom: 8,
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	questionItemCurrent: {
		backgroundColor: '#dbeafe',
		borderColor: '#3b82f6',
		borderWidth: 2,
	},
	questionItemAnswered: {
		backgroundColor: '#f0fdf4',
		borderColor: '#22c55e',
	},
	questionItemCorrect: {
		backgroundColor: '#ecfdf5',
		borderColor: '#10b981',
	},
	questionItemLeft: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	questionNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		fontSize: 14,
		fontWeight: '600',
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 28,
	},
	questionNumberCurrent: {
		backgroundColor: '#3b82f6',
		color: '#ffffff',
	},
	questionItemContent: {
		flex: 1,
	},
	questionPreview: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginBottom: 8,
	},
	questionPreviewCurrent: {
		color: '#1e40af',
		fontWeight: '500',
	},
	questionItemFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	questionStatus: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
	},
	questionStatusCurrent: {
		color: '#1e40af',
	},
	favoriteIcon: {
		fontSize: 14,
	},
	sidebarFooter: {
		flexDirection: 'row',
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		backgroundColor: '#f8fafc',
	},
	sidebarActionBtn: {
		flex: 1,
		backgroundColor: '#3b82f6',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginHorizontal: 4,
	},
	sidebarActionText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	
	// Image Upload Modal Styles
	imageUploadModal: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 24,
		margin: 20,
		maxHeight: '70%',
		minWidth: 300,
	},
	imageModalTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 20,
		textAlign: 'center',
	},
	imageUploadOptions: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 20,
	},
	imageOptionBtn: {
		flex: 1,
		backgroundColor: '#f0f9ff',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#0ea5e9',
	},
	imageOptionIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	imageOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#0ea5e9',
		textAlign: 'center',
	},
	imageModalCloseBtn: {
		backgroundColor: '#6b7280',
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	imageModalCloseBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	
	// YouTube Modal Styles
	youtubeModal: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 24,
		margin: 20,
		maxHeight: '80%',
		minHeight: 400,
		minWidth: 300,
	},
	youtubeModalTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 20,
		textAlign: 'center',
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	youtubeInputModal: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		marginBottom: 16,
		backgroundColor: '#f9fafb',
	},
	youtubePreviewModal: {
		marginBottom: 20,
	},
	previewLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	youtubeWebViewModal: {
		height: 180,
		borderRadius: 8,
		overflow: 'hidden',
	},
	youtubeModalButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	youtubeSaveBtn: {
		flex: 1,
		backgroundColor: '#10b981',
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	youtubeSaveBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	youtubeCancelBtn: {
		flex: 1,
		backgroundColor: '#f3f4f6',
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	youtubeCancelBtnText: {
		color: '#374151',
		fontSize: 16,
		fontWeight: '600',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	
	// Image Upload Modal Styles - Enhanced and Responsive
	imageUploadModal: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 20,
		width: isTablet ? '70%' : '95%',
		maxHeight: '85%',
		minHeight: 400,
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 10,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1f2937',
	},
	modalCloseBtn: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
		minWidth: 36,
		minHeight: 36,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalCloseBtnText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#6b7280',
	},
	imageUploadContent: {
		flex: 1,
	},
	imageUploadDescription: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 20,
	},
	
	// YouTube Modal Styles - Enhanced and Responsive
	youtubeModal: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 20,
		width: isTablet ? '70%' : '95%',
		maxHeight: '85%',
		minHeight: 450,
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 10,
	},
	youtubeContent: {
		flex: 1,
	},
	youtubeDescription: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 20,
	},
	currentImagesSection: {
		marginBottom: 20,
	},
	currentImagesLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#374151',
		marginBottom: 10,
	},
	currentImagesScroll: {
		maxHeight: 120,
	},
	currentImageItem: {
		marginRight: 10,
		position: 'relative',
	},
	currentImageThumb: {
		width: 80,
		height: 80,
		borderRadius: 10,
		backgroundColor: '#f3f4f6',
	},
	removeImageBtn: {
		position: 'absolute',
		top: -5,
		right: -5,
		backgroundColor: '#ef4444',
		borderRadius: 12,
		width: 24,
		height: 24,
		justifyContent: 'center',
		alignItems: 'center',
	},
	removeImageBtnText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: 'bold',
	},
	imagePreviewContainer: {
		backgroundColor: '#f9fafb',
		borderRadius: 15,
		padding: 20,
		marginBottom: 20,
		alignItems: 'center',
		minHeight: 200,
		justifyContent: 'center',
	},
	imagePreviewWrapper: {
		alignItems: 'center',
	},
	imagePreview: {
		width: 200,
		height: 150,
		borderRadius: 10,
		backgroundColor: '#ffffff',
		marginBottom: 10,
	},
	imagePreviewHint: {
		fontSize: 14,
		color: '#6b7280',
		fontStyle: 'italic',
	},
	imagePreviewPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	imagePreviewPlaceholderText: {
		fontSize: 48,
		color: '#d1d5db',
		marginBottom: 10,
	},
	imagePreviewPlaceholderSubtext: {
		fontSize: 16,
		color: '#9ca3af',
	},
	imageUploadButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	uploadBtn: {
		backgroundColor: '#3b82f6',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 12,
		flex: 0.48,
		alignItems: 'center',
	},
	uploadBtnText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	galleryNavigation: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 10,
		padding: 15,
	},
	galleryNavBtn: {
		backgroundColor: '#3b82f6',
		paddingVertical: 8,
		paddingHorizontal: 15,
		borderRadius: 8,
	},
	galleryNavBtnDisabled: {
		backgroundColor: '#d1d5db',
	},
	galleryNavBtnText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	galleryNavText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#374151',
	},
	modalDoneBtn: {
		backgroundColor: '#10b981',
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 10,
	},
	modalDoneBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},
	// Image Preview Full Screen Styles
	imagePreviewFullOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.9)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imagePreviewFullContainer: {
		flex: 1,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
	},
	imagePreviewFull: {
		width: '90%',
		height: '80%',
	},
	imagePreviewCloseBtn: {
		position: 'absolute',
		top: 50,
		right: 20,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		borderRadius: 25,
		width: 50,
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	imagePreviewCloseBtnText: {
		color: '#ffffff',
		fontSize: 24,
		fontWeight: 'bold',
	},
	// YouTube Modal Styles
	currentLinkContainer: {
		marginBottom: 20,
	},
	currentLinkLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#374151',
		marginBottom: 10,
	},
	currentLinkBox: {
		backgroundColor: '#f3f4f6',
		borderRadius: 10,
		padding: 15,
		borderLeftWidth: 4,
		borderLeftColor: '#ef4444',
	},
	currentLinkText: {
		fontSize: 14,
		color: '#1f2937',
		fontFamily: 'monospace',
	},
	linkInputContainer: {
		marginBottom: 20,
	},
	linkInputLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#374151',
		marginBottom: 10,
	},
	linkInput: {
		borderWidth: 2,
		borderColor: '#d1d5db',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 15,
		fontSize: 16,
		color: '#1f2937',
		backgroundColor: '#ffffff',
	},
	youtubePreviewContainer: {
		marginBottom: 20,
	},
	youtubePreviewLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#374151',
		marginBottom: 10,
	},
	youtubePreview: {
		height: 200,
		borderRadius: 10,
		backgroundColor: '#000000',
	},
	youtubeModalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		gap: 12,
	},
	saveBtn: {
		backgroundColor: '#10b981',
		paddingVertical: 14,
		paddingHorizontal: 25,
		borderRadius: 12,
		flex: 1,
		alignItems: 'center',
	},
	saveBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},
	saveBtnTextDisabled: {
		color: '#9ca3af',
	},
	cancelBtn: {
		backgroundColor: '#6b7280',
		paddingVertical: 14,
		paddingHorizontal: 25,
		borderRadius: 12,
		flex: 1,
		alignItems: 'center',
	},
	cancelBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},
	
	// Modern Image Upload Modal Styles
	modernModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		justifyContent: 'flex-end',
	},
	modernImageUploadModal: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 25,
		borderTopRightRadius: 25,
		maxHeight: '96%',
		minHeight: '80%',
		elevation: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.3,
		shadowRadius: 15,
	},
	modernModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	modalHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	modalIconContainer: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#e8f4fd',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 15,
	},
	modalHeaderIcon: {
		fontSize: 24,
	},
	modernModalTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 2,
	},
	modernModalSubtitle: {
		fontSize: 14,
		color: '#6b7280',
		fontWeight: '500',
	},
	modernCloseBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modernCloseBtnText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#6b7280',
	},
	modernModalContent: {
		flex: 1,
		paddingHorizontal: 20,
	},
	
	mainPreviewSection: {
		marginBottom: 20,
	},
	mainImagePreview: {
		borderRadius: 20,
		overflow: 'hidden',
		backgroundColor: '#f9fafb',
		minHeight: 200,
		position: 'relative',
	},
	mainPreviewImage: {
		width: '100%',
		height: 100,
		borderRadius: 20,
	},
	imageOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingVertical: 12,
		alignItems: 'center',
	},
	overlayText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	emptyImagePlaceholder: {
		backgroundColor: '#f9fafb',
		borderRadius: 20,
		minHeight: 200,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#e5e7eb',
		borderStyle: 'dashed',
	},
	placeholderIconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	placeholderIcon: {
		fontSize: 40,
	},
	placeholderTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	placeholderSubtext: {
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
	},
	actionButtonsContainer: {
		flexDirection: 'row',
		gap: 15,
		marginBottom: 25,
	},
	modernActionBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 16,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	galleryBtn: {
		backgroundColor: '#e0f2fe',
		borderWidth: 1,
		borderColor: '#0284c7',
	},
	cameraBtn: {
		backgroundColor: '#f0fdf4',
		borderWidth: 1,
		borderColor: '#16a34a',
	},
	btnIconContainer: {
		width: 45,
		height: 45,
		borderRadius: 22.5,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	btnIcon: {
		fontSize: 20,
	},
	btnTextContainer: {
		flex: 1,
	},
	btnTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 2,
	},
	btnSubtext: {
		fontSize: 13,
		color: '#6b7280',
	},
	gallerySection: {
		marginBottom: 20,
	},
	gallerySectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	horizontalGallery: {
		flexGrow: 0,
	},
	galleryContentContainer: {
		paddingHorizontal: 2,
	},
	galleryImageItem: {
		marginRight: 12,
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
		borderWidth: 2,
		borderColor: 'transparent',
	},
	selectedGalleryItem: {
		borderColor: '#3b82f6',
	},
	galleryImageThumb: {
		width: 80,
		height: 80,
		borderRadius: 10,
	},
	selectedIndicator: {
		position: 'absolute',
		top: 5,
		left: 5,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#3b82f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedIndicatorText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '700',
	},
	deleteImageBtn: {
		position: 'absolute',
		top: 5,
		right: 5,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(239, 68, 68, 0.9)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	deleteImageBtnText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '700',
	},
	modernModalFooter: {
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	modernDoneBtn: {
		backgroundColor: '#3b82f6',
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
	},
	modernDoneBtnText: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '700',
	},
	
	// Modern YouTube Modal Styles
	modernYoutubeModal: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 25,
		borderTopRightRadius: 25,
		maxHeight: '90%',
		minHeight: '70%',
		elevation: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.3,
		shadowRadius: 15,
	},
	currentVideoSection: {
		marginBottom: 20,
	},
	currentVideoTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	currentVideoCard: {
		backgroundColor: '#fef3e2',
		borderRadius: 16,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#fbbf24',
	},
	videoCardIcon: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 15,
	},
	videoCardIconText: {
		fontSize: 20,
	},
	videoCardContent: {
		flex: 1,
	},
	videoCardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 4,
	},
	videoCardUrl: {
		fontSize: 13,
		color: '#6b7280',
		fontFamily: 'monospace',
	},
	urlInputSection: {
		marginBottom: 20,
	},
	urlInputTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	modernInputContainer: {
		position: 'relative',
	},
	modernInput: {
		borderWidth: 2,
		borderColor: '#e5e7eb',
		borderRadius: 16,
		paddingVertical: 16,
		paddingHorizontal: 20,
		fontSize: 16,
		color: '#1f2937',
		backgroundColor: '#ffffff',
		minHeight: 60,
		textAlignVertical: 'top',
	},
	clearInputBtn: {
		position: 'absolute',
		top: 12,
		right: 12,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	clearInputBtnText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6b7280',
	},
	errorText: {
		fontSize: 14,
		color: '#ef4444',
		marginTop: 8,
		fontWeight: '500',
	},
	previewSection: {
		marginBottom: 20,
	},
	previewSectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	videoPreviewContainer: {
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: '#000000',
	},
	modernVideoPreview: {
		height: 220,
		borderRadius: 16,
	},
	youtubeModalActions: {
		flexDirection: 'row',
		gap: 12,
	},
	modernCancelBtn: {
		flex: 1,
		backgroundColor: '#f3f4f6',
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
	},
	modernCancelBtnText: {
		color: '#6b7280',
		fontSize: 16,
		fontWeight: '700',
	},
	modernSaveBtn: {
		flex: 2,
		backgroundColor: '#f59e0b',
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#f59e0b',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
	},
	modernSaveBtnDisabled: {
		backgroundColor: '#d1d5db',
		elevation: 0,
		shadowOpacity: 0,
	},
	modernSaveBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},
	modernSaveBtnTextDisabled: {
		color: '#9ca3af',
	},
	
	// Media Gallery Styles
	 mediaGalleryContainer: {
		position: 'absolute',
		bottom: 100,
		left: 0,
		right: 0,
		height: 130,
		paddingVertical: 8,
		paddingHorizontal: 8,
		backgroundColor: '#ffffff',
		zIndex: 500,
	},
	mediaScrollContent: {
		paddingHorizontal: 8,
		gap: 16,
		alignItems: 'center',
		backgroundColor: '#ffffff',
		height: '100%',
	},
	mediaBox: {
		width: isSmallScreen ? 80 : isTablet ? 100 : 90,
		height: isSmallScreen ? 80 : isTablet ? 100 : 90,
		borderRadius: 15,
		backgroundColor: '#ffffff',
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: '#d1d5db',
		justifyContent: 'center',
		alignItems: 'center',
		marginHorizontal: 4,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	mediaBoxHasContent: {
		borderStyle: 'solid',
		borderColor: '#10b981',
		backgroundColor: '#ecfdf5',
		elevation: 4,
		shadowOpacity: 0.15,
	},
	savedIndicator: {
		position: 'absolute',
		top: 2,
		right: 2,
		backgroundColor: 'rgba(34, 197, 94, 0.9)',
		borderRadius: 8,
		paddingHorizontal: 4,
		paddingVertical: 1,
		zIndex: 10,
	},
	savedIndicatorText: {
		fontSize: 10,
		color: 'white',
	},
	emptyMediaBox: {
		justifyContent: 'center',
		alignItems: 'center',
		flex: 1,
	},
	emptyMediaIcon: {
		fontSize: isSmallScreen ? 32 : isTablet ? 48 : 40,
		marginBottom: 8,
		color: '#9ca3af',
	},
	emptyMediaText: {
		fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
		color: '#6b7280',
		fontWeight: '600',
		textAlign: 'center',
	},
	mediaBoxImage: {
		width: '100%',
		height: '100%',
		borderRadius: 17,
	},
	mediaBoxContent: {
		width: '100%',
		height: '100%',
		position: 'relative',
		borderRadius: 17,
		overflow: 'hidden',
	},
	youtubeOverlay: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -12 }, { translateY: -12 }],
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	youtubePlayIcon: {
		fontSize: 12,
		color: '#ffffff',
	},
	websitePreview: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 8,
		backgroundColor: '#f9fafb',
		borderRadius: 13,
	},
	websiteIcon: {
		fontSize: isSmallScreen ? 16 : isTablet ? 24 : 20,
		marginBottom: 4,
	},
	websiteUrl: {
		fontSize: isSmallScreen ? 6 : isTablet ? 10 : 8,
		color: '#6b7280',
		textAlign: 'center',
		fontWeight: '500',
	},
	
	// Media Viewer Styles
	mediaViewerContent: {
		flex: 1,
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: '#000000',
	},
	mediaViewerImage: {
		width: '100%',
		height: '100%',
	},
	mediaViewerWebView: {
		flex: 1,
	},
	
	// Upload Modal Styles
	doubleClickPopup: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 25,
		borderTopRightRadius: 25,
		maxHeight: '85%',
		minHeight: '60%',
		elevation: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.3,
		shadowRadius: 15,
	},
	uploadSection: {
		marginBottom: 20,
	},
	uploadSectionLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	uploadButtonsContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 12,
	},
	uploadActionBtn: {
		flex: 1,
		backgroundColor: '#e0f2fe',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#0284c7',
	},
	uploadActionBtnText: {
		color: '#0369a1',
		fontSize: 14,
		fontWeight: '600',
	},
	uploadPreviewImage: {
		width: '100%',
		height: 120,
		borderRadius: 12,
		backgroundColor: '#f3f4f6',
	},
	uploadInput: {
		borderWidth: 2,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		fontSize: 14,
		color: '#1f2937',
		backgroundColor: '#ffffff',
	},
	uploadSubmitBtn: {
		backgroundColor: '#3b82f6',
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		marginTop: 10,
	},
	uploadSubmitBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},
	
	// Message Box Styles
	messageBoxOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	messageBoxContainer: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 24,
		margin: 20,
		alignItems: 'center',
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
	},
	messageBoxText: {
		fontSize: 16,
		color: '#1f2937',
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 24,
	},
	messageBoxBtn: {
		backgroundColor: '#3b82f6',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 25,
		elevation: 2,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
	},
	messageBoxBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default QuizTakingComponent;

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, SafeAreaView, Platform, BackHandler } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local Storage Key for favorite questions
const FAVORITE_QUESTIONS_KEY = 'quizAppFavoriteQuestions';

const ResultPage = ({ route, quizResult, onClose, onReplay, allResults = [], onLogout, onDeleteHistory }) => {
	const navigation = useNavigation();
	
	// Get quiz result from route params if available, otherwise use prop
	const result = route?.params?.quizResult || quizResult || {
		quizTitle: "Sample Quiz",
		score: 1,
		totalQuestions: 5,
		timeUsed: 33,
		timestamp: new Date().toISOString(),
		questions: [],
		wrongQuestions: [],
		skippedQuestions: [],
		quizId: "sample-quiz-id"
	};

	// Initialize state for favorite questions and quiz history
	const [favoriteQuestions, setFavoriteQuestions] = useState([]);
	const [quizHistory, setQuizHistory] = useState([]);
	
	// Handle hardware back button - navigate to UserPanel
	useFocusEffect(
		React.useCallback(() => {
			const onBackPress = () => {
				// Use the same navigation logic as handleClose
				if (onClose) {
					onClose();
				} else {
					// Always navigate to UserPanel
					navigation.reset({
						index: 0,
						routes: [{ name: 'UserPanel' }],
					});
				}
				return true;
			};
			
			const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
			return () => {
				if (subscription && subscription.remove) subscription.remove();
			};
		}, [navigation, onClose])
	);
	
	// Load favorite questions and quiz history from AsyncStorage when component mounts
	useEffect(() => {
		loadFavoriteQuestions();
		loadQuizHistory();
	}, []);
	
	// Save favorites to AsyncStorage whenever they change
	useEffect(() => {
		saveFavoriteQuestions();
	}, [favoriteQuestions]);

	// Reload history when result changes (for new quiz completions)
	useEffect(() => {
		if (result && result.id) {
			loadQuizHistory();
		}
	}, [result?.id]);

	const loadFavoriteQuestions = async () => {
		try {
			const storedFavorites = await AsyncStorage.getItem(FAVORITE_QUESTIONS_KEY);
			if (storedFavorites) {
				setFavoriteQuestions(JSON.parse(storedFavorites));
			}
		} catch (error) {
			console.error("Error loading favorite questions:", error);
		}
	};

	const saveFavoriteQuestions = async () => {
		try {
			await AsyncStorage.setItem(FAVORITE_QUESTIONS_KEY, JSON.stringify(favoriteQuestions));
		} catch (error) {
			console.error("Error saving favorite questions:", error);
		}
	};

	const loadQuizHistory = async () => {
		try {
			const results = await AsyncStorage.getItem('quizAppResults');
			if (results) {
				const parsedResults = JSON.parse(results);
				// Sort by date (newest first) and limit to recent results
				const sortedResults = parsedResults
					.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
					.slice(0, 10); // Show only last 10 results
				setQuizHistory(sortedResults);
			} else {
				setQuizHistory([]);
			}
		} catch (error) {
			console.error('Error loading quiz history:', error);
			setQuizHistory([]);
		}
	};

	// Get favorite questions for current quiz
	const quizFavorites = favoriteQuestions.filter(fav => fav.quizId === result.quizId);
	
	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			// Always navigate to UserPanel
			navigation.reset({
				index: 0,
				routes: [{ name: 'UserPanel' }],
			});
		}
	};

	const handleReplay = (type, quizData = null) => {
		const targetQuiz = quizData || result;
		console.log(`Replaying quiz (${type}):`, targetQuiz.quizTitle);
		
		// Prepare filtered questions based on replay type
		let filteredQuestions = [];
		const allQuestions = targetQuiz.questions || [];
		
		// Ensure all questions have required properties
		const validQuestions = allQuestions.filter(q => 
			q && q.question && q.options && typeof q.correctAnswer !== 'undefined'
		);
		
		switch (type) {
			case 'answered':
				// Filter questions that were answered correctly
				filteredQuestions = validQuestions.filter(q => 
					q.userAnswer !== null && q.userAnswer !== undefined && 
					q.userAnswer === q.correctAnswer
				);
				break;
			case 'skipped':
				// Filter questions that were skipped (userAnswer is null)
				filteredQuestions = validQuestions.filter(q => 
					q.userAnswer === null || q.userAnswer === undefined
				);
				break;
			case 'wrong':
				// Filter questions that were answered incorrectly
				filteredQuestions = validQuestions.filter(q => 
					q.userAnswer !== null && q.userAnswer !== undefined && 
					q.userAnswer !== q.correctAnswer
				);
				break;
			case 'favorite':
				// Filter questions that were marked as favorite
				filteredQuestions = validQuestions.filter(q => q.isFavorite === true);
				break;
			case 'all':
			default:
				// All questions
				filteredQuestions = validQuestions;
				break;
		}
		
		if (filteredQuestions.length === 0) {
			// Show alert if no questions for this type
			const message = type === 'answered' ? 'No correctly answered questions to replay!' :
							type === 'skipped' ? 'No skipped questions to replay!' :
							type === 'wrong' ? 'No wrong questions to replay!' :
							type === 'favorite' ? 'No favorite questions to replay!' :
							'No questions available to replay!';
			alert(message);
			return;
		}
		
		// Create a new quiz object for replay
		const replayQuiz = {
			id: `${targetQuiz.quizId || targetQuiz.id}_replay_${type}_${Date.now()}`,
			title: `${targetQuiz.quizTitle} - ${type.charAt(0).toUpperCase() + type.slice(1)} Questions (${filteredQuestions.length})`,
			questions: filteredQuestions.map(q => ({
				question: q.question,
				options: q.options,
				correctAnswer: q.correctAnswer,
				explanation: q.explanation || ''
			}))
		};
		
		if (onReplay) {
			// Pass data to parent component if onReplay exists
			onReplay({ 
				replayType: type,
				quiz: replayQuiz,
				originalQuiz: targetQuiz
			});
		} else {
			// Navigate to QuizScreen with the filtered questions
			navigation.navigate('QuizScreen', {
				quiz: replayQuiz,
				isReplay: true,
				originalResult: targetQuiz
			});
		}
	};

	const handleDeleteHistory = async (index) => {
		try {
			// Remove from local state
			const updatedHistory = quizHistory.filter((_, idx) => idx !== index);
			setQuizHistory(updatedHistory);
			
			// Update AsyncStorage
			const results = await AsyncStorage.getItem('quizAppResults');
			if (results) {
				const parsedResults = JSON.parse(results);
				const sortedResults = parsedResults.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
				
				// Remove the item at the specified index
				if (index < sortedResults.length) {
					sortedResults.splice(index, 1);
					await AsyncStorage.setItem('quizAppResults', JSON.stringify(sortedResults));
				}
			}
			
			// Call parent handler if provided
			if (onDeleteHistory) {
				onDeleteHistory(index);
			}
		} catch (error) {
			console.error('Error deleting quiz history item:', error);
			// Reload history in case of error
			loadQuizHistory();
		}
	};

	// Calculate stats properly from questions data
	const percentage = Math.round((result.score / Math.max(result.totalQuestions || 1, 1)) * 100);
	
	// Calculate stats from questions array if available
	let answered = result.score;
	let wrong = 0;
	let skipped = 0;
	let favorite = 0;
	
	if (result.questions && Array.isArray(result.questions)) {
		// Reset counters and calculate from actual question data
		answered = 0;
		wrong = 0;
		skipped = 0;
		favorite = 0;
		
		result.questions.forEach(q => {
			if (q.isFavorite) {
				favorite++;
			}
			
			if (q.userAnswer === null || q.userAnswer === undefined) {
				skipped++;
			} else if (q.userAnswer === q.correctAnswer) {
				answered++;
			} else {
				wrong++;
			}
		});
	} else {
		// Fallback to legacy calculation
		wrong = (result.wrongQuestions && result.wrongQuestions.length) || 
				(result.totalQuestions - result.score - (result.skippedQuestions?.length || 0));
		skipped = (result.skippedQuestions && result.skippedQuestions.length) || 
				  (result.totalQuestions - result.score - wrong);
		favorite = result.favoriteCount || 0;
	}
	
	// Calculate per-question time in seconds
	const perQuestionTime = result.totalQuestions > 0 && result.timeUsed 
		? Math.round((result.timeUsed / result.totalQuestions) * 10) / 10 
		: 0;

	// Format time used display
	const formatTimeUsed = (timeInSeconds) => {
		if (typeof timeInSeconds !== 'number') return '0:00';
		const minutes = Math.floor(timeInSeconds / 60);
		const seconds = timeInSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar 
				barStyle="light-content" 
				translucent={false}
				backgroundColor="#1e40af"
				animated={true}
				networkActivityIndicatorVisible={false}
				showHideTransition="fade"
				hidden={false}
			/>
			<ScrollView contentContainerStyle={styles.container}>
				{/* Quiz Report Card */}
				<View style={styles.reportCard}>
					
					
				
					
					{/* Header with back button */}
					<View style={styles.headerRow}>
						<TouchableOpacity onPress={handleClose} style={styles.backBtn}>
							<Text style={styles.backBtnText}>{"<"}</Text>
						</TouchableOpacity>
						<Text style={styles.header}>Quiz Report</Text>
						<View style={styles.spacer} />
					</View>

					{/* Per Question Time Header */}
					<View style={styles.timeHeader}>
						<Text style={styles.timeIcon}>⏱️</Text>
						<Text style={styles.timeText}>
							Per Question Time : <Text style={styles.timeValue}>{perQuestionTime}</Text> Sec.
						</Text>
					</View>

					{/* Results Table */}
					<View style={styles.table}>
						{/* Table Header */}
						<View style={styles.tableHeaderRow}>
							<Text style={styles.tableHeaderCell}>Question</Text>
							<Text style={styles.tableHeaderCellCenter}>No.</Text>
							<Text style={styles.tableHeaderCellCenter}>Re-Attempt</Text>
						</View>

						{/* Answered Row */}
						<View style={styles.tableRow}>
							<Text style={styles.tableCell}>Answered</Text>
							<Text style={styles.tableCellCenter}>{answered}</Text>
							<View style={styles.tableCellCenter}>
								<TouchableOpacity 
									style={styles.replayBtn} 
									onPress={() => handleReplay('answered')}
									disabled={answered === 0}
								>
									<Text style={[styles.replayIcon, answered === 0 && styles.disabledIcon]}>▶</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Skipped Row */}
						<View style={styles.tableRow}>
							<Text style={styles.tableCell}>Skipped</Text>
							<Text style={styles.tableCellCenter}>{skipped}</Text>
							<View style={styles.tableCellCenter}>
								<TouchableOpacity 
									style={styles.replayBtn} 
									onPress={() => handleReplay('skipped')}
									disabled={skipped === 0}
								>
									<Text style={[styles.replayIcon, skipped === 0 && styles.disabledIcon]}>▶</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Wrong Row */}
						<View style={styles.tableRow}>
							<Text style={styles.tableCell}>Wrong</Text>
							<Text style={styles.tableCellCenter}>{wrong}</Text>
							<View style={styles.tableCellCenter}>
								<TouchableOpacity 
									style={styles.replayBtn} 
									onPress={() => handleReplay('wrong')}
									disabled={wrong === 0}
								>
									<Text style={[styles.replayIcon, wrong === 0 && styles.disabledIcon]}>▶</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Favorite Row */}
						<View style={styles.tableRow}>
							<Text style={styles.tableCell}>Favorite</Text>
							<Text style={styles.tableCellCenter}>{favorite}</Text>
							<View style={styles.tableCellCenter}>
								<TouchableOpacity 
									style={styles.replayBtn} 
									onPress={() => handleReplay('favorite')}
									disabled={favorite === 0}
								>
									<Text style={[styles.replayIcon, favorite === 0 && styles.disabledIcon]}>▶</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Total Row */}
						<View style={[styles.tableRow, styles.totalRow]}>
							<Text style={[styles.tableCell, styles.totalText]}>Total</Text>
							<Text style={[styles.tableCellCenter, styles.totalText]}>{result.totalQuestions}</Text>
							<View style={styles.tableCellCenter}>
								<TouchableOpacity 
									style={styles.replayBtn} 
									onPress={() => handleReplay('all')}
								>
									<Text style={styles.replayIcon}>▶</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>

					{/* Celebration Message */}
					<Text style={styles.celebrate}>
						{percentage >= 90 ? '� Excellent! Outstanding performance! 🏆' :
						 percentage >= 80 ? '�🎉 Great job! Well done! 🎉' :
						 percentage >= 70 ? '👍 Good effort! Keep it up! 👍' :
						 percentage >= 60 ? '😊 Nice try! Practice makes perfect! 😊' :
						 '💪 Keep practicing! You can do better! 💪'}
					</Text>

					{/* Time Used */}
					<Text style={styles.timeUsed}>
						Time Used : {formatTimeUsed(result.timeUsed)}
					</Text>

					{/* Start New Exam Button */}
					<TouchableOpacity 
						style={styles.newExamBtn}
						onPress={() => handleReplay('all')}
					>
						<Text style={styles.newExamBtnText}>🚀 Start New Exam</Text>
					</TouchableOpacity>
				</View>

				{/* Quiz History Section */}
				<View style={styles.historySection}>
					<View style={styles.historyHeaderRow}>
						<Text style={styles.historyHeader}>Quiz History</Text>
						<TouchableOpacity 
							style={styles.refreshBtn} 
							onPress={loadQuizHistory}
						>
							<Text style={styles.refreshBtnText}>🔄</Text>
						</TouchableOpacity>
					</View>
					{Array.isArray(quizHistory) && quizHistory.length > 0 ? (
						quizHistory.map((quiz, idx) => (
								<View key={quiz.quizId || quiz.id || idx} style={styles.historyCard}>
								<View style={styles.historyInfo}>
									<Text style={styles.historyTitle}>
										{quiz.quizTitle || quiz.title || `quiz-template (${idx + 1})`}
									</Text>
									<Text style={styles.historyScore}>
										Score : {quiz.score} / {quiz.totalQuestions || (quiz.questions?.length ?? 0)}
									</Text>
									<Text style={styles.historyTimestamp}>
										{quiz.timestamp ? new Date(quiz.timestamp).toLocaleString() : 
										 quiz.date ? new Date(quiz.date).toLocaleString() : 
										 new Date().toLocaleString()}
									</Text>
									{quiz.childName && (
										<Text style={styles.historyChildName}>
											👤 {quiz.childName}
										</Text>
									)}
								</View>
								<View style={styles.historyActions}>
									<TouchableOpacity 
										style={styles.historyReplayBtn} 
										onPress={() => handleReplay('all', quiz)}
									>
										<Text style={styles.historyReplayText}>Replay</Text>
									</TouchableOpacity>
									<TouchableOpacity 
										style={styles.historyDeleteBtn} 
										onPress={() => handleDeleteHistory(idx)}
									>
										<Text style={styles.historyDeleteText}>Delete</Text>
									</TouchableOpacity>
								</View>
							</View>
						))
					) : (
						<Text style={styles.noHistory}>No quiz history available.</Text>
					)}
				</View>

				{/* Detailed Question Analysis */}
				{result.questions && result.questions.length > 0 && (
					<View style={styles.analysisSection}>
						<Text style={styles.analysisHeader}>📊 Question Analysis</Text>
						{result.questions.map((question, index) => (
							<View key={index} style={styles.questionCard}>
								<View style={styles.questionHeader}>
									<Text style={styles.questionNumber}>Q{index + 1}</Text>
									<View style={styles.questionStatus}>
										{question.userAnswer === null || question.userAnswer === undefined ? (
											<Text style={styles.statusSkipped}>SKIPPED</Text>
										) : question.userAnswer === question.correctAnswer ? (
											<Text style={styles.statusCorrect}>CORRECT</Text>
										) : (
											<Text style={styles.statusWrong}>WRONG</Text>
										)}
										{question.isFavorite && (
											<Text style={styles.statusFavorite}>⭐</Text>
										)}
									</View>
								</View>
								<Text style={styles.questionText}>{question.question}</Text>
								{question.userAnswer !== null && question.userAnswer !== undefined && (
									<Text style={styles.userAnswer}>
										Your Answer: {question.options[question.userAnswer]}
									</Text>
								)}
								<Text style={styles.correctAnswer}>
									Correct Answer: {question.options[question.correctAnswer]}
								</Text>
								{question.explanation && (
									<Text style={styles.explanation}>💡 {question.explanation}</Text>
								)}
							</View>
						))}
					</View>
				)}
			</ScrollView>
			
			{/* Bottom Action Bar */}
			<View style={styles.bottomActionBar}>
				<TouchableOpacity 
					style={styles.backToMenuBtn}
					onPress={handleClose}
				>
					<Text style={styles.backToMenuBtnText}>🏠 Back to Quiz Menu</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#65748b',
	},
	container: {
		padding: 16,
		backgroundColor: '#65748b',
		flexGrow: 1,
	},
	reportCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 20,
		marginBottom: 24,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 4,
	},
	filePathContainer: {
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#3b82f6',
	},
	filePathLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6b7280',
		marginBottom: 4,
	},
	filePathText: {
		fontSize: 13,
		color: '#374151',
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
	},
	quizTitleContainer: {
		marginBottom: 16,
		alignItems: 'center',
	},
	quizTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#1f2937',
		textAlign: 'center',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	backBtn: {
		backgroundColor: '#f3f4f6',
		padding: 8,
		borderRadius: 8,
		minWidth: 40,
		alignItems: 'center',
	},
	backBtnText: {
		fontSize: 18,
		color: '#374151',
		fontWeight: 'bold',
	},
	header: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#374151',
		textAlign: 'center',
		flex: 1,
	},
	spacer: {
		width: 40,
	},
	timeHeader: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f9fafb',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	timeIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	timeText: {
		fontSize: 14,
		color: '#374151',
		fontWeight: '500',
	},
	timeValue: {
		color: '#ef4444',
		fontWeight: 'bold',
	},
	table: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		overflow: 'hidden',
		marginBottom: 16,
	},
	tableHeaderRow: {
		flexDirection: 'row',
		backgroundColor: '#f3f4f6',
		borderBottomWidth: 1,
		borderBottomColor: '#d1d5db',
	},
	tableHeaderCell: {
		flex: 1,
		padding: 12,
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		textAlign: 'left',
		borderRightWidth: 1,
		borderRightColor: '#d1d5db',
	},
	tableHeaderCellCenter: {
		width: 100,
		padding: 12,
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		textAlign: 'center',
		borderRightWidth: 1,
		borderRightColor: '#d1d5db',
	},
	tableRow: {
		flexDirection: 'row',
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	totalRow: {
		backgroundColor: '#f9fafb',
		borderBottomWidth: 0,
	},
	tableCell: {
		flex: 1,
		padding: 12,
		fontSize: 14,
		color: '#374151',
		textAlign: 'left',
		borderRightWidth: 1,
		borderRightColor: '#d1d5db',
	},
	tableCellCenter: {
		width: 100,
		padding: 12,
		fontSize: 14,
		color: '#374151',
		textAlign: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		borderRightWidth: 1,
		borderRightColor: '#d1d5db',
	},
	totalText: {
		fontWeight: '600',
		color: '#1f2937',
	},
	replayBtn: {
		backgroundColor: '#22c55e',
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#22c55e',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 2,
	},
	replayIcon: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: 'bold',
	},
	disabledIcon: {
		color: '#cccccc',
		opacity: 0.5,
	},
	celebrate: {
		textAlign: 'center',
		color: '#d97706',
		fontSize: 14,
		marginBottom: 12,
		fontWeight: '500',
	},
	timeUsed: {
		textAlign: 'center',
		color: '#6b7280',
		fontSize: 14,
		fontWeight: '500',
	},
	newExamBtn: {
		backgroundColor: '#3b82f6',
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 24,
		marginTop: 16,
		alignItems: 'center',
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 3,
	},
	newExamBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	historySection: {
		marginBottom: 24,
	},
	historyHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	historyHeader: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#ffffff',
		flex: 1,
		textAlign: 'center',
	},
	refreshBtn: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	refreshBtnText: {
		fontSize: 16,
		color: '#ffffff',
	},
	historyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	historyInfo: {
		flex: 1,
		marginRight: 12,
	},
	historyTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 4,
	},
	historyScore: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 2,
	},
	historyTimestamp: {
		fontSize: 11,
		color: '#9ca3af',
	},
	historyChildName: {
		fontSize: 11,
		color: '#3b82f6',
		fontWeight: '500',
		marginTop: 2,
	},
	historyActions: {
		flexDirection: 'row',
		gap: 8,
	},
	historyReplayBtn: {
		backgroundColor: '#3b82f6',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	historyReplayText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
	},
	historyDeleteBtn: {
		backgroundColor: '#ef4444',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	historyDeleteText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
	},
	noHistory: {
		textAlign: 'center',
		color: '#d1d5db',
		fontSize: 14,
		fontStyle: 'italic',
		marginTop: 20,
	},
	analysisSection: {
		marginBottom: 24,
	},
	analysisHeader: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#ffffff',
		textAlign: 'center',
		marginBottom: 16,
	},
	questionCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	questionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	questionNumber: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3b82f6',
	},
	questionStatus: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusCorrect: {
		backgroundColor: '#22c55e',
		color: '#ffffff',
		fontSize: 12,
		fontWeight: 'bold',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusWrong: {
		backgroundColor: '#ef4444',
		color: '#ffffff',
		fontSize: 12,
		fontWeight: 'bold',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusSkipped: {
		backgroundColor: '#f59e0b',
		color: '#ffffff',
		fontSize: 12,
		fontWeight: 'bold',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusFavorite: {
		fontSize: 16,
	},
	questionText: {
		fontSize: 14,
		color: '#374151',
		marginBottom: 8,
		lineHeight: 20,
	},
	userAnswer: {
		fontSize: 13,
		color: '#6b7280',
		marginBottom: 4,
		fontStyle: 'italic',
	},
	correctAnswer: {
		fontSize: 13,
		color: '#22c55e',
		fontWeight: '600',
		marginBottom: 8,
	},
	explanation: {
		fontSize: 12,
		color: '#3b82f6',
		fontStyle: 'italic',
		backgroundColor: '#f0f9ff',
		padding: 8,
		borderRadius: 6,
	},
	
	// Bottom Action Bar Styles
	bottomActionBar: {
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 5,
	},
	backToMenuBtn: {
		backgroundColor: '#3b82f6',
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backToMenuBtnText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default ResultPage;

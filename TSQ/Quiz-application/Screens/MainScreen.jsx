


import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, BackHandler, SafeAreaView, Alert, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

function MainScreen() {
    const navigation = useNavigation();
    const context = useContext(AppContext);
    const { currentRole, setChildName, firebaseUser, handleFirebaseLogout } = context || {};
    const [inputName, setInputName] = useState('');
    const [askName, setAskName] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Hardware back button logic
    useEffect(() => {
        const onBackPress = () => {
            if (askName) {
                setAskName(false);
                return true;
            }
            return false;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription?.remove();
    }, [askName]);

    const handleAdminPress = () => {
        navigation.navigate('AdminPanel');
    };

    const handleChildPress = () => {
        setAskName(true);
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                        if (handleFirebaseLogout) {
                            await handleFirebaseLogout();
                        }
                        navigation.replace('FirebaseLogin');
                    }
                }
            ]
        );
    };

    const handleChildNameSubmit = async () => {
        if (inputName.trim()) {
            try {
                setIsSubmitting(true);
                
                // Save child name to context
                if (setChildName) {
                    setChildName(inputName.trim());
                }
                
                // Save child name to AsyncStorage for persistence
                await AsyncStorage.setItem('quizAppChildName', inputName.trim());
                
                console.log('Child name saved:', inputName.trim());
                
                // Navigate to UserPanel
                setAskName(false);
                setInputName('');
                navigation.navigate('UserPanel');
            } catch (error) {
                console.error('Error saving child name:', error);
                Alert.alert('Error', 'Failed to save name. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            Alert.alert('Invalid Name', 'Please enter a valid name.');
        }
    };

    if (askName) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.card}>
                    <Text style={styles.title}>Enter your name</Text>
                    <TextInput
                        value={inputName}
                        style={styles.input}
                        placeholder="Your name"
                        onChangeText={setInputName}
                        placeholderTextColor="#888888"
                        textAlign="center"
                    />
                    <TouchableOpacity
                        style={[styles.continueButton, isSubmitting && styles.continueButtonDisabled]}
                        onPress={handleChildNameSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.continueButtonText}>
                            {isSubmitting ? 'Please wait...' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar 
                barStyle="dark-content" 
                translucent={false}
                backgroundColor="#ffffff"
                animated={true}
                networkActivityIndicatorVisible={false}
                showHideTransition="fade"
                hidden={false}
            />
            <View style={styles.card}>
                {/* Firebase User Info */}
                {firebaseUser && (
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.userInfoText}>
                            👤 {firebaseUser.displayName || firebaseUser.email}
                        </Text>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                <View style={styles.avatarContainer}>
                    <Image
                        source={require('../assets/boy.png')}
                        style={styles.avatar}
                    />
                </View>
                <Text style={styles.welcome}>Welcome</Text>
                <TouchableOpacity
                    style={styles.adminButton}
                    onPress={handleAdminPress}
                >
                    <Text style={styles.buttonText}>Admin Panel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.userButton}
                    onPress={handleChildPress}
                >
                    <Text style={styles.buttonText}>User</Text>
                </TouchableOpacity>
               
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#e9efff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        paddingTop: 30,
    },
    userInfoContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: 200,
        zIndex: 10,
    },
    userInfoText: {
        fontSize: 12,
        color: '#15803d',
        fontWeight: '600',
        flex: 1,
    },
    logoutButton: {
        backgroundColor: '#ef4444',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    logoutButtonText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingVertical: 40,
        paddingHorizontal: 32,
        width: 340,
        alignItems: 'center',
        shadowColor: '#2c3e50',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 8,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e9efff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    title: {
        fontWeight: '700',
        fontSize: 24,
        color: '#1a202c',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        padding: 12,
        fontSize: 18,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d3dbed',
        marginBottom: 24,
        textAlign: 'center',
        color: '#1a202c',
        backgroundColor: '#f7faff',
    },
    continueButton: {
        width: '60%',
        backgroundColor: '#1062fe',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginHorizontal: 'auto',
        marginBottom: 0,
    },
    continueButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    continueButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 18,
    },
    welcome: {
        fontWeight: '700',
        fontSize: 32,
        color: '#1a1a1a',
        marginBottom: 32,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    adminButton: {
        width: '100%',
        backgroundColor: '#1062fe',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    userButton: {
        width: '100%',
        backgroundColor: '#07a44d',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 18,
    },
});

export default MainScreen;

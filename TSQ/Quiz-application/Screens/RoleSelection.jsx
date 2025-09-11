import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Alert,
  TextInput,
  Modal,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const RoleSelection = ({ onAdminLogin, onChildLogin, errorMessage }) => {
  const [showChildNameModal, setShowChildNameModal] = useState(false);
  const [childNameInput, setChildNameInput] = useState('');

  const handleAdminPress = () => {
    onAdminLogin();
  };

  const handleChildPress = () => {
    setShowChildNameModal(true);
  };

  const handleChildNameSubmit = () => {
    if (childNameInput.trim()) {
      onChildLogin(childNameInput.trim());
      setShowChildNameModal(false);
      setChildNameInput('');
    } else {
      Alert.alert('Error', 'Please enter your name');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        translucent={Platform.OS === 'android'}
        backgroundColor={Platform.OS === 'android' ? '#ffffff' : undefined}
        animated={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>📚</Text>
          </View>
        </View>

        {/* Welcome Text */}
        <Text style={styles.welcomeText}>Welcome to Quiz App</Text>
        <Text style={styles.subtitleText}>Choose your role to continue</Text>

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Role Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.roleButton, styles.adminButton]} 
            onPress={handleAdminPress}
            activeOpacity={0.8}
          >
            <Text style={styles.roleButtonIcon}>👨‍💼</Text>
            <Text style={styles.roleButtonText}>Admin Panel</Text>
            <Text style={styles.roleButtonSubtext}>Manage quizzes and view results</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleButton, styles.userButton]} 
            onPress={handleChildPress}
            activeOpacity={0.8}
          >
            <Text style={styles.roleButtonIcon}>🎓</Text>
            <Text style={styles.roleButtonText}>Take Quiz</Text>
            <Text style={styles.roleButtonSubtext}>Start learning and practicing</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Child Name Modal */}
      <Modal
        visible={showChildNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChildNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Your Name</Text>
            <Text style={styles.modalSubtitle}>This will help track your progress</Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Your name"
              value={childNameInput}
              onChangeText={setChildNameInput}
              autoFocus={true}
              maxLength={30}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowChildNameModal(false);
                  setChildNameInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.continueButton]} 
                onPress={handleChildNameSubmit}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    paddingTop: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 40,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fed7d7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f56565',
  },
  errorText: {
    color: '#c53030',
    textAlign: 'center',
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  roleButton: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  adminButton: {
    backgroundColor: '#4299e1',
  },
  userButton: {
    backgroundColor: '#48bb78',
  },
  roleButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleButtonSubtext: {
    fontSize: 14,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f7fafc',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#edf2f7',
  },
  continueButton: {
    backgroundColor: '#4299e1',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  continueButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default RoleSelection;

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';

interface LoadingSpinnerProps {
  visible: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ visible, message = 'Loading...' }) => {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <View style={styles.spinnerCard}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)', // Semi-transparent card-dark backdrop
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
});

export default LoadingSpinner;

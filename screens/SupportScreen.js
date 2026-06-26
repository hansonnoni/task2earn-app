// screens/SupportScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export default function SupportScreen() {
  const handleContact = () => {
    Linking.openURL('mailto:support@task2earn.app?subject=Support Request');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Need Help?</Text>
      <Text style={styles.text}>
        If you're experiencing issues or have any questions, feel free to reach out to our support team.
      </Text>

      <TouchableOpacity onPress={handleContact} style={styles.button}>
        <Text style={styles.buttonText}>Contact Support</Text>
      </TouchableOpacity>

      <Text style={styles.note}>Response time: within 24 hours</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00BFA6',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#1e1e1e',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  note: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

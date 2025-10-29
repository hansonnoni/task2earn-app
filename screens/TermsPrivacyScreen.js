// screens/TermsPrivacyScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function TermsPrivacyScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.header}>Terms & Privacy Policy</Text>

      <Text style={styles.sectionTitle}>1. Introduction</Text>
      <Text style={styles.text}>
        By using Task2Earn, you agree to comply with our terms and privacy policy.
      </Text>

      <Text style={styles.sectionTitle}>2. Data Collection</Text>
      <Text style={styles.text}>
        We collect basic user data such as email, completed tasks, and referral activities for service improvement only.
      </Text>

      <Text style={styles.sectionTitle}>3. Use of App</Text>
      <Text style={styles.text}>
        Users are expected to use the app ethically. Any form of cheating or manipulation will result in a ban.
      </Text>

      <Text style={styles.sectionTitle}>4. Withdrawal Policy</Text>
      <Text style={styles.text}>
        Withdrawals are processed after task verification. Users must provide valid payment details.
      </Text>

      <Text style={styles.sectionTitle}>5. Contact</Text>
      <Text style={styles.text}>
        For support, contact support@task2earn.com.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#FFD700',
    fontSize: 16,
  },
  header: {
    fontSize: 26,
    color: '#00BFA6',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
    marginTop: 20,
  },
  text: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 22,
  },
});

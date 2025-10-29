// screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleReset = () => {
    Alert.alert('Reset Settings', 'Are you sure you want to reset all settings?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => console.log('Settings reset') },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Settings</Text>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={(value) => setNotificationsEnabled(value)}
          thumbColor={notificationsEnabled ? '#4CAF50' : '#f4f3f4'}
          trackColor={{ false: '#767577', true: '#81C784' }}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={(value) => setDarkMode(value)}
          thumbColor={darkMode ? '#2196F3' : '#f4f3f4'}
          trackColor={{ false: '#767577', true: '#64B5F6' }}
        />
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetText}>Reset to Default</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 20,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 30,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
  },
  resetButton: {
    marginTop: 30,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 10,
  },
  resetText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});

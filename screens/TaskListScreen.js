// screens/TaskListScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';

const TaskListScreen = () => {
  const navigation = useNavigation();

  const categories = [
    {
      name: 'Social Tasks',
      key: 'social',
      icon: 'thumbs-up',
      screen: 'SocialTasks',
      color: '#3b82f6',
    },
    {
      name: 'Spotify Tasks',
      key: 'spotify',
      icon: 'spotify',
      screen: 'SpotifyTasks',
      color: '#1DB954',
    },
    {
      name: 'YouTube Tasks',
      key: 'youtube',
      icon: 'youtube',
      screen: 'YouTubeTasks',
      color: '#FF0000',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select Task Category</Text>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.key}
          style={[styles.card, { borderColor: cat.color }]}
          onPress={() => navigation.navigate(cat.screen)}
        >
          <View style={styles.cardContent}>
            <FontAwesome5 name={cat.icon} size={24} color={cat.color} style={{ marginRight: 12 }} />
            <Text style={[styles.cardText, { color: cat.color }]}>{cat.name}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#FFD700', marginBottom: 30, textAlign: 'center' },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardText: { fontSize: 18, fontWeight: '600' },
});

export default TaskListScreen;

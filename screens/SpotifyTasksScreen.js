import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../supabase';
import { FontAwesome5 } from '@expo/vector-icons';

const SpotifyTasksScreen = ({ route }) => {
  const navigation = useNavigation();
  const user = route?.params?.user || null;
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('Loading Spotify tasks...');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spotify_tasks')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      setFilteredTasks(data || []);
      if (!data || data.length === 0) setMessage('ℹ️ No Spotify tasks available.');
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handlePress = (task) => {
    navigation.navigate('TaskDetails', { task, user, taskCategory: 'spotify' });
  };

  useEffect(() => {
    if (!search.trim()) setFilteredTasks(tasks);
    else {
      const query = search.toLowerCase();
      setFilteredTasks(
        tasks.filter(
          (task) =>
            task.track_name?.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [search, tasks]);

  const renderTask = ({ item, index }) => (
    <Animated.View entering={FadeInUp.delay(index * 80).springify().damping(15)}>
      <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.track_name}</Text>
            <Text style={styles.taskId}>#TSK{String(item.id).slice(-4).padStart(4, '0')}</Text>
          </View>
          <FontAwesome5 name="spotify" size={18} color="#1DB954" />
        </View>
        <Text style={styles.description}>Streams required: {item.streams_required}</Text>
        <View style={styles.rewardBox}>
          <FontAwesome5 name="gift" size={16} color="#22c55e" />
          <Text style={styles.rewardText}>{item.reward} coins</Text>
        </View>
        <Text style={styles.timeLimit}>⏱ {item.time_limit} seconds</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#FFD700" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search Spotify tasks..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
        ListEmptyComponent={!loading && <Text style={styles.text}>{message}</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  searchInput: { backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 10, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  card: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, color: '#00FFFF', fontWeight: 'bold' },
  taskId: { fontSize: 12, color: '#888', marginTop: 2 },
  description: { fontSize: 15, color: '#ccc', marginBottom: 10 },
  rewardBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 8, borderRadius: 8, marginTop: 6 },
  rewardText: { marginLeft: 6, fontSize: 15, fontWeight: '600', color: '#22c55e' },
  timeLimit: { marginTop: 4, fontSize: 12, color: '#FFD700' },
});

export default SpotifyTasksScreen;

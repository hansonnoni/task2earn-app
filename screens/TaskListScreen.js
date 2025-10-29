// screens/TaskListScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../supabase';
import { getTaskRewardDisplay } from '../utils/taskHelpers';
import { FontAwesome5 } from '@expo/vector-icons';

const TaskListScreen = ({ route }) => {
  const navigation = useNavigation();
  const passedUser = route?.params?.user;

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(passedUser || null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading tasks...');

  // --- Refresh user when screen gains focus ---
  useFocusEffect(
    React.useCallback(() => {
      const fetchUser = async () => {
        try {
          const userId = user?.id || (await supabase.auth.getUser()).data.user.id;
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          if (!error && data) setUser(data);
        } catch (err) {
          console.error('[TaskList] fetchUser error:', err);
        }
      };
      fetchUser();
    }, [user])
  );

  // --- Fetch tasks for user's country ---
  const fetchTasks = async () => {
    setLoading(true);
    setMessage('Loading tasks...');
    try {
      const userId = user?.id || (await supabase.auth.getUser()).data.user.id;
      if (!userId) throw new Error('No logged in user found.');

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('country_id, tier')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userRow);

      const countryId = userRow?.country_id;
      if (!countryId) {
        setMessage('⚠️ No country set in your profile. Please update your profile.');
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          reward,
          type,
          earn_multiplier,
          country_id,
          countries (currency_symbol)
        `)
        .eq('country_id', countryId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      if (!tasksData || tasksData.length === 0) {
        setMessage('ℹ️ No tasks available for your country yet.');
        setTasks([]);
        setFilteredTasks([]);
      } else {
        setTasks(tasksData);
        setFilteredTasks(tasksData);
        setMessage('');
      }
    } catch (err) {
      console.error('[TaskList] fetch error:', err);
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

  // --- Search filter ---
  useEffect(() => {
    if (!search.trim()) {
      setFilteredTasks(tasks);
    } else {
      const query = search.toLowerCase();
      const filtered = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
      );
      setFilteredTasks(filtered);
    }
  }, [search, tasks]);

  // --- Pull to refresh ---
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // --- Handle task press ---
  const handleTaskPress = (task) => {
    const userTier = user?.tier?.toLowerCase();
    const taskType = task?.type?.toLowerCase();

    if (taskType === 'premium' && userTier === 'free') {
      Alert.alert(
        'Upgrade Required',
        'This task is for premium members only. Upgrade to access it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => navigation.navigate('UpgradeScreen') },
        ]
      );
      return;
    }

    navigation.navigate('TaskDetails', { taskId: task.id, user, setUser });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>{message}</Text>
      </View>
    );
  }

  // --- Render each task ---
  const renderTask = ({ item, index }) => {
    const { displayText, multiplier } = getTaskRewardDisplay(item, user);
    const isPremium = item.type === 'premium';
    const isFreeUser = user?.tier === 'free';

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 80).springify().damping(15)}
      >
        <TouchableOpacity
          style={[
            styles.card,
            isPremium ? { borderColor: '#FFD700', borderWidth: 2 } : {},
          ]}
          onPress={() => handleTaskPress(item)}
        >
          {/* Title + Task ID + Badge */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.taskId}>#TSK{String(item.id).slice(-4).padStart(4, '0')}</Text>
            </View>
            {isPremium && (
              <View style={styles.badge}>
                <FontAwesome5 name="crown" size={12} color="#FFD700" />
                <Text style={styles.badgeText}>Premium</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>

          {/* Reward */}
          <View style={styles.rewardBox}>
            <FontAwesome5 name="gift" size={16} color="#22c55e" />
            <Text style={styles.rewardText}>
              {item.countries?.currency_symbol}
              {displayText} coins
            </Text>
          </View>

          {/* Premium Hint */}
          {isPremium && isFreeUser && (
            <Text style={styles.upgradeHint}>
              💡 Upgrade to Premium to earn ×{multiplier}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search tasks..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.headerRow}>
  <Text style={styles.header}>Available Tasks</Text>
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={styles.backButton}
  >
    <FontAwesome5 name="arrow-right" size={16} color="#FFD700" />
    <Text style={styles.backText}>Back</Text>
  </TouchableOpacity>
</View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
        ListEmptyComponent={!loading && <Text style={styles.text}>{message}</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  
  // 🔹 Header Row & Back Button
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  backText: {
    color: '#FFD700',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },

  // 🔹 Existing styles
  header: { fontSize: 22, color: '#FFD700', fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 20 },
  searchInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, color: '#00FFFF', fontWeight: 'bold' },
  taskId: { fontSize: 12, color: '#888', marginTop: 2 },
  description: { fontSize: 15, color: '#ccc', marginBottom: 10 },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  rewardText: { marginLeft: 6, fontSize: 15, fontWeight: '600', color: '#22c55e' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { marginLeft: 4, fontSize: 12, fontWeight: '600', color: '#FFD700' },
  upgradeHint: { marginTop: 6, fontSize: 12, color: '#FFD700', fontStyle: 'italic' },
});

export default TaskListScreen;


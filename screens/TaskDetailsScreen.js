// screens/TaskDetailsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../supabase';
import { FontAwesome5 } from '@expo/vector-icons';

const TaskDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId, user: passedUser } = route.params;

  const [user, setUser] = useState(passedUser || null);
  const [task, setTask] = useState(null);
  const [proof, setProof] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Fetch user if not passed ---
  const fetchUser = async () => {
    try {
      if (!user) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user.id;
        const { data: userRow, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        setUser(userRow);
        return userRow;
      }
      return user;
    } catch (err) {
      console.error('[TaskDetails] fetchUser error:', err);
      Alert.alert('Error', 'Could not fetch user info.');
      navigation.goBack();
    }
  };

  // --- Fetch task ---
  const fetchTask = async (currentUser) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, countries(currency_symbol)')
        .eq('id', taskId)
        .single();

      if (error || !data) throw new Error('Task not found.');
      setTask(data);
      setCountdown(Number(data?.time_limit ?? 300));

      // Premium check
      if (data.type === 'premium' && currentUser?.tier === 'free') {
        Alert.alert(
          'Premium Task',
          'This task is for premium users only. Upgrade to access it.',
          [{ text: 'Upgrade Now', onPress: () => navigation.replace('UpgradeScreen', { taskId }) }]
        );
      }
    } catch (err) {
      console.error('[TaskDetails] fetchTask error:', err);
      Alert.alert('Error', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const currentUser = await fetchUser();
      if (currentUser) await fetchTask(currentUser);
    };
    init();
  }, [taskId]);

  // --- Countdown timer ---
  useEffect(() => {
    if (!task || submitted || countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [task, countdown, submitted]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = async () => {
    if (!proof.trim()) {
      Alert.alert('Proof Required', 'Please provide proof of task completion.');
      return;
    }
    try {
      setSubmitted(true);
      // Example: save submission
      // await supabase.from('task_submissions').insert([{ task_id: task.id, user_id: user.id, proof }]);
      Alert.alert('Success', 'Task submitted for review.');
    } catch (err) {
      console.error('[TaskDetails] submit error:', err);
      Alert.alert('Error', 'Could not submit task. Try again.');
      setSubmitted(false);
    }
  };

  if (loading || !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>Loading task...</Text>
      </View>
    );
  }

  const displayReward = user?.tier === 'premium' ? task.reward * (task.earn_multiplier || 1) : task.reward;
  const isPremium = task.type === 'premium';
  const isFreeUser = user?.tier === 'free';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>{task.title}</Text>
        {isPremium && (
          <View style={styles.badge}>
            <FontAwesome5 name="crown" size={14} color="#FFD700" />
            <Text style={styles.badgeText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.label}>📋 Instructions</Text>
        <Text style={styles.text}>{task.description}</Text>
      </View>

      {/* Reward */}
      <View style={styles.section}>
        <Text style={styles.label}>🎁 Reward</Text>
        <View style={styles.rewardBox}>
          <FontAwesome5 name="gift" size={16} color="#22c55e" />
          <Text style={styles.rewardText}>
            {task.countries?.currency_symbol}
            {displayReward} coins
          </Text>
        </View>
        {isPremium && isFreeUser && (
          <Text style={styles.upgradeHint}>💡 Upgrade to Premium to earn ×{task.earn_multiplier}</Text>
        )}
      </View>

      {/* Countdown */}
      <View style={styles.section}>
        <Text style={styles.label}>⏳ Countdown Timer</Text>
        <Text style={styles.timer}>{formatTime(countdown)}</Text>
      </View>

      {/* Proof */}
      <View style={styles.section}>
        <Text style={styles.label}>📝 Proof of Completion</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste proof here..."
          placeholderTextColor="#aaa"
          multiline
          value={proof}
          onChangeText={setProof}
          editable={!(isPremium && isFreeUser)}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, submitted || (isPremium && isFreeUser) ? styles.disabledButton : {}]}
        onPress={handleSubmit}
        disabled={submitted || (isPremium && isFreeUser)}
      >
        <Text style={styles.buttonText}>
          {submitted ? 'Submitted' : 'Submit Task'}
        </Text>
      </TouchableOpacity>

      {submitted && <Text style={styles.success}>✅ Task submitted successfully!</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 },
  header: { fontSize: 22, color: '#FFD700', fontWeight: 'bold', flex: 1 },
  section: { marginBottom: 20 },
  label: { color: '#00FFFF', fontSize: 16, marginBottom: 8, fontWeight: '600' },
  text: { color: '#fff', fontSize: 15, lineHeight: 22 },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  rewardText: { marginLeft: 6, fontSize: 16, fontWeight: '600', color: '#22c55e' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { marginLeft: 4, fontSize: 12, fontWeight: '600', color: '#FFD700' },
  upgradeHint: { marginTop: 6, fontSize: 13, color: '#FFD700', fontStyle: 'italic' },
  timer: { fontSize: 32, fontWeight: 'bold', color: '#00FF00' },
  input: {
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    backgroundColor: '#1e1e1e',
  },
  button: { backgroundColor: '#FFD700', padding: 16, borderRadius: 10, alignItems: 'center' },
  disabledButton: { backgroundColor: '#777' },
  buttonText: { color: '#121212', fontSize: 16, fontWeight: 'bold' },
  success: { marginTop: 20, color: '#00FF00', fontSize: 16, textAlign: 'center' },
});

export default TaskDetailsScreen;

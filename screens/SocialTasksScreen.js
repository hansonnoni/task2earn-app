// screens/SocialTasksScreen.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../supabase';
import { getTaskRewardDisplay } from '../utils/taskHelpers';
import { FontAwesome5 } from '@expo/vector-icons';

// --- Platform Icons ---
const PLATFORM_ICONS = {
  facebook: { name: 'facebook', color: '#1877F2' },
  instagram: { name: 'instagram', color: '#E1306C' },
  tiktok: { name: 'music', color: '#000' },
  x: { name: 'twitter', color: '#1DA1F2' },
  twitter: { name: 'twitter', color: '#1DA1F2' },
  default: { name: 'globe', color: '#999' },
};

// --- Hook: Fetch user once ---
function useCurrentUser() {
  const [user, setUser] = useState(null);
  const fetchingRef = useRef(false);

  const fetchUser = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await supabase.auth.getUser();
      const supaUser = res?.data?.user || null;
      if (!supaUser) {
        setUser(null);
        return null;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supaUser.id)
        .single();

      if (error) {
        console.error('[useCurrentUser] profileError', error);
        setUser(null);
        return null;
      }

      setUser(profile);
      return profile;
    } catch (err) {
      console.error('[useCurrentUser] fetch error', err);
      setUser(null);
      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const refresh = useCallback(() => fetchUser(), [fetchUser]);

  return { user, setUser, fetchUser, refresh };
}

// --- Highlight Function ---
const highlightText = (text, query) => {
  if (!query) return <Text style={styles.normalText}>{text}</Text>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <Text key={i} style={styles.highlightText}>{part}</Text>
    ) : (
      <Text key={i} style={styles.normalText}>{part}</Text>
    )
  );
};


const SocialTasksScreen = ({ route }) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const passedUser = route?.params?.user || null;

  const { user, setUser, fetchUser, refresh } = useCurrentUser();

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading tasks...');
  
  const onRefresh = async () => {
  await fetchTasksForCountry(user?.country_id, user);
  setRefreshing(false);
};
  useEffect(() => {
    if (passedUser) setUser(passedUser);
  }, [passedUser, setUser]);

  // Fetch tasks when screen focused
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setMessage('Loading user...');
      try {
        const profile = await fetchUser();
        if (!mounted) return;
        if (profile) {
          setMessage('Loading tasks...');
          await fetchTasksForCountry(profile.country_id, profile);
        } else {
          setMessage('❌ No logged-in user found.');
          setTasks([]);
          setFilteredTasks([]);
        }
      } catch (err) {
        console.error('[SocialTasksScreen] init error', err);
        setMessage(`❌ Error: ${err.message || err}`);
        setTasks([]);
        setFilteredTasks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (isFocused) load();
    return () => {
      mounted = false;
    };
  }, [isFocused, fetchUser]);

  const fetchTasksForCountry = async (countryId, existingUser = null) => {
  setLoading(true);
  setMessage('Loading tasks...');
  try {
    const profile = existingUser;
    if (!profile && !existingUser) {
      setMessage('❌ No logged-in user found.');
      setTasks([]);
      setFilteredTasks([]);
      return;
    }

    const country_to_use =
      countryId || existingUser?.country_id || (existingUser === null ? null : existingUser.country_id);

    if (!country_to_use) {
      setMessage('⚠️ No country set in your profile. Please update your profile.');
      setTasks([]);
      setFilteredTasks([]);
      setLoading(false);
      return;
    }

    // 🆕 NEW: Get submitted or approved task IDs for this user
    const { data: submittedTasks, error: submissionError } = await supabase
      .from('social_submissions')
      .select('task_id')
      .eq('user_id', existingUser?.id || profile.id)
      .in('status', [
  'submitted',
  'approved',
  'rejected_permanently'
]); // 🔥 rejected removed

    if (submissionError) throw submissionError;

    const hiddenTaskIds = submittedTasks?.map((t) => t.task_id) || [];

    // 🆕 Fetch rejected tasks separately
const { data: rejectedTasks } = await supabase
  .from('social_submissions')
  .select('task_id')
  .eq('user_id', existingUser?.id || profile.id)
  .eq('status', 'rejected');

const rejectedIds = rejectedTasks?.map(t => t.task_id) || [];


    // 🆕 UPDATED: Build base query
    let query = supabase
      .from('social_tasks')
      .select(`
        id, title, description, reward, type, platform,
        action_type, url, country_id, task_category,
        time_limit, verification_type, approved, created_at,
        countries (currency_symbol)
      `)
      .eq('country_id', country_to_use)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    // 🆕 Safely exclude tasks user already submitted or approved
    if (hiddenTaskIds.length > 0) {
  const formattedIds = hiddenTaskIds
    .map(id => `"${id}"`)
    .join(',');

  query = query.not('id', 'in', `(${formattedIds})`);
}


    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      setMessage('ℹ️ No available tasks right now!');
      setTasks([]);
      setFilteredTasks([]);
    } else {
      // 🆕 Mark rejected tasks
const updatedTasks = data.map(task => ({
  ...task,
  wasRejected: rejectedIds.includes(task.id),
}));

setTasks(updatedTasks);
setFilteredTasks(updatedTasks);

      setMessage('');
    }
  } catch (err) {
    console.error('[SocialTasksScreen] fetch error:', err);
    setMessage(`❌ Error: ${err.message || err}`);
    setTasks([]);
    setFilteredTasks([]);
  } finally {
    setLoading(false);
  }
};


  // Search filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredTasks(tasks);
      return;
    }
    const q = search.toLowerCase();

    setFilteredTasks(
      tasks.filter((t) => {
        const idShort = `t2e-${String(t.id).replace(/-/g, '').slice(-4)}`;
        return (
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.platform || '').toLowerCase().includes(q) ||
          idShort.includes(q) ||
          (t.id || '').toLowerCase().includes(q)
        );
      })
    );
  }, [search, tasks]);

  const isUserFree = () => (user?.tier || '').toLowerCase() === 'free';
  const isTaskPremium = (task) => (task?.type || '').toLowerCase() === 'premium';

  const handleTaskPress = (task) => {
    if (isTaskPremium(task) && isUserFree()) {
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

    navigation.navigate('SocialTaskDetails', { taskId: task.id, task, user, setUser });
  };

  const keyExtractor = (item) => String(item.id);

  const renderTask = ({ item, index }) => {
    const { displayText } = getTaskRewardDisplay(item, user);
    const premium = isTaskPremium(item);
    const freeUser = isUserFree();
    const platformMeta = PLATFORM_ICONS[item.platform?.toLowerCase()] || PLATFORM_ICONS.default;
    const shortId = `T2E-${String(item.id).replace(/-/g, '').slice(-4)}`;
    const currency = item.countries?.currency_symbol || '₦';

    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify().damping(15)}>
        <TouchableOpacity
          style={[styles.card, premium ? { borderColor: '#FFD700', borderWidth: 2 } : {}]}
          onPress={() => handleTaskPress(item)}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{highlightText(item.title, search)}</Text>
              <Text style={styles.taskId}>{highlightText(shortId, search)}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name={platformMeta.name} size={18} color={platformMeta.color} style={{ marginRight: 8 }} />
              {premium ? (
                <View style={styles.badge}>
                  <FontAwesome5 name="crown" size={12} color="#FFD700" />
                  <Text style={styles.badgeText}>Premium</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: '#0b1220' }]}>
                  <Text style={[styles.badgeText, { color: '#9ae6b4' }]}>Free</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.description}>{highlightText(item.description, search)}</Text>
          {item.wasRejected && (
  <Text style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
    ⚠️ Previously Rejected – Please correct and resubmit
  </Text>
)}


          <View style={styles.rewardBox}>
            <Text style={styles.rewardText}>
              {currency}
              {displayText}
            </Text>
          </View>

          {premium && freeUser && <Text style={styles.upgradeHint}>💡 Upgrade to Premium to earn more</Text>}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={styles.smallText}>{item.platform || 'Platform unknown'}</Text>
            <Text style={styles.smallText}>{item.verification_type || ''}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search tasks..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.headerRow}>
        <Text style={styles.header}>Available Tasks</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-right" size={16} color="#FFD700" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={keyExtractor}
        renderItem={renderTask}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
        ListEmptyComponent={!loading && <Text style={styles.text}>{message}</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  backText: { color: '#FFD700', marginLeft: 6, fontWeight: '600', fontSize: 14 },
  header: { fontSize: 22, color: '#FFD700', fontWeight: 'bold' },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 20 },
  searchInput: { backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 10, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  card: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  taskId: { fontSize: 12, color: '#888', marginTop: 2 },
  description: { fontSize: 15, color: '#ccc', marginBottom: 10 },
  rewardBox: { backgroundColor: '#0f172a', padding: 8, borderRadius: 8, marginTop: 6 },
  rewardText: { fontSize: 15, fontWeight: '600', color: '#22c55e' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { marginLeft: 4, fontSize: 12, fontWeight: '600', color: '#FFD700' },
  upgradeHint: { marginTop: 6, fontSize: 12, color: '#FFD700', fontStyle: 'italic' },
  smallText: { fontSize: 12, color: '#888' },
  normalText: { color: '#ccc' },
  highlightText: { color: '#FFD700', fontWeight: 'bold' },
});

export default SocialTasksScreen;

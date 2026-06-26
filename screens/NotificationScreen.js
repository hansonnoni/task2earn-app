import React, { useState, useCallback, useEffect, useRef } from 'react'; // 🔹 UPDATED: added useRef
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ToastAndroid, // 🔹 ADDED
  Platform,     // 🔹 ADDED
  Alert         // 🔹 ADDED
} from 'react-native';
import { supabase } from '../supabase';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null); // 🔹 ADDED
  const scrollViewRef = useRef(null); // 🔹 ADDED

  // 🔹 ADDED: Show toast or alert
  const showNotificationToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert('Notification', message);
    }
  };

  // Fetch notifications from user_notifications with linked notification + country
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      const uid = user?.user?.id;
      if (!uid) return;

      setUserId(uid);

      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          id,
          is_read,
          created_at,
          notifications!inner(
            title,
            body,
            type,
            tier,
            country_id,
            countries!inner(name)
          )
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: true }); // 🔹 UPDATED: ascending to scroll to newest at bottom

      if (error) {
        console.log('Fetch error:', error);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.log('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 UPDATED: Scroll to bottom whenever notifications update
  useEffect(() => {
    if (scrollViewRef.current && notifications.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [notifications]);

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.log('Mark read error:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();

      // 🔹 ADDED: Realtime subscription
      let subscription;
      if (userId) {
        subscription = supabase
          .channel('public:user_notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log('New notification:', payload.new);
              fetchNotifications(); // refetch notifications
              showNotificationToast('📌 You have a new notification!'); // 🔹 ADDED
            }
          )
          .subscribe();
      }

      return () => {
        if (subscription) supabase.removeChannel(subscription);
      };
    }, [userId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  return (
    <ScrollView
      ref={scrollViewRef} // 🔹 ADDED
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
      }
    >
      <Text style={styles.title}>🔔 Notifications</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 30 }} />
      ) : notifications.length === 0 ? (
        <Text style={styles.message}>You currently have no notifications.</Text>
      ) : (
        notifications.map((note) => {
          const notif = note.notifications || {};
          const countryName = notif.countries?.name || 'All Countries';
          const tier = notif.tier || 'All Tiers';
          const typeBadge = notif.type === 'general' ? '🌐 General' : '👤 Personal';

          return (
            <TouchableOpacity
              key={note.id}
              style={[styles.notificationCard, note.is_read ? styles.read : styles.unread]}
              onPress={() => markAsRead(note.id)}
            >
              <View style={styles.header}>
                <Text style={styles.noteTitle}>{notif.title || 'No Title'}</Text>
                <Text style={styles.typeBadge}>{typeBadge}</Text>
              </View>
              <Text style={styles.noteBody}>
  {notif.body?.split(/(T2E-\w{4})/g).map((part, idx) =>
    part.startsWith('T2E-') ? (
      <Text
        key={idx}
        style={styles.taskId}
        onPress={() => {
          Clipboard.setString(part);

          if (Platform.OS === 'android') {
            ToastAndroid.show('Task ID copied!', ToastAndroid.SHORT);
          } else {
            Alert.alert('Copied', 'Task ID copied!');
          }
        }}
      >
        {part}
      </Text>
    ) : (
      <Text key={idx}>{part}</Text>
    )
  )}
</Text>


              <Text style={styles.noteMeta}>
                {countryName} | {tier} | {new Date(note.created_at).toLocaleString()}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1e1e1e',
    padding: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 15,
  },
  message: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 30,
  },
  notificationCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  unread: {
    backgroundColor: '#333',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  read: {
    backgroundColor: '#252525',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  typeBadge: {
    fontSize: 12,
    color: '#3f3919',
    fontWeight: '600',
  },
  noteBody: {
    color: '#ccc',
    marginTop: 5,
  },
  noteMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'right',
  },
  taskId: {
  color: '#FFD700',      // golden color
  fontWeight: 'bold',
  textDecorationLine: 'underline', // optional for visual cue
}
});

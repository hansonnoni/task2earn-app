// screens/DashboardScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  const [balance, setBalance] = useState(null);
  const [currency, setCurrency] = useState('');
  const blurAnim = useRef(new Animated.Value(1)).current; // 1 = blurred, 0 = visible

  const backgroundColor = darkMode ? '#000' : '#fff';
  const cardColor = darkMode ? '#1c1c1c' : '#f0f0f0';
  const textColor = darkMode ? '#fff' : '#000';

  const scrollRef = useRef(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.log('Session fetch error:', sessionError.message);
        setUser(null);
        setLoading(false);
        return;
      }
      const currentUser = sessionData?.session?.user || null;
      setUser(currentUser);

      // 🔹 Fetch balance + currency for this user
      if (currentUser?.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('balance, currency_symbol')
            .eq('id', currentUser.id)
            .single();

          if (!error && data) {
            setBalance(data.balance);
            setCurrency(data.currency_symbol || '');
          } else {
            // fallback defaults
            setBalance(0);
            setCurrency('');
          }
        } catch (err) {
          console.error('Error fetching user balance:', err);
          setBalance(0);
          setCurrency('');
        }
      } else {
        setBalance(0);
        setCurrency('');
      }
    } catch (err) {
      console.error('Unexpected session load error:', err);
      setUser(null);
      setBalance(0);
      setCurrency('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    loadSession();
  }, [loadSession]);

  useFocusEffect(
    useCallback(() => {
      loadSession();
      setShowBalance(false);
      blurAnim.setValue(1); // always start hidden
    }, [loadSession])
  );


  const toggleBalance = () => {
    Animated.timing(blurAnim, {
      toValue: showBalance ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
    setShowBalance(!showBalance);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (user && !user.email_confirmed_at) {
    return (
      <View style={[styles.centered, { backgroundColor, padding: 20 }]}>
        <Text style={{ color: '#FFD700', fontSize: 18, textAlign: 'center', marginBottom: 12 }}>
          ⚠️ Please verify your email to access your dashboard
        </Text>
        <Text style={{ color: textColor, textAlign: 'center', marginBottom: 18 }}>
          We sent a verification link to your email. After verifying, tap the button below to refresh.
        </Text>

        <TouchableOpacity
          style={[styles.verifyButton, { backgroundColor: '#FFD700' }]}
          onPress={loadSession}
        >
          <Text style={{ fontWeight: 'bold', color: '#000' }}>I have verified my email</Text>
        </TouchableOpacity>

      </View>
    );
  }

  const getInitials = (email) => {
    if (!email) return '';
    const namePart = email.split('@')[0];
    return namePart
      .split(/[\.\-_]/)
      .map((word) => word[0].toUpperCase())
      .join('');
  };

  // Helper to render balance nicely (keeps formatting simple)
  const renderFormattedBalance = (amt) => {
    if (amt === null || amt === undefined) return '0';
    // keep as-is if string already formatted; otherwise try to convert
    const num = Number(amt);
    if (Number.isNaN(num)) return String(amt);
    // format with thousands separator, no decimals if integer
    const rounded = Math.round(num * 100) / 100;
    return rounded % 1 === 0 ? rounded.toLocaleString() : rounded.toLocaleString();
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.container, { backgroundColor }]}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.title, { color: textColor }]}>
          Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </Text>

        {/* Logout */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
        
              Toast.show({ type: 'success', text1: 'Logout Successful' });
              // ✅ No navigation.reset — AppNavigator will switch to Login automatically
            } catch (err) {
              Toast.show({ type: 'error', text1: err.message || 'Logout failed' });
            }
          }}
        >
          <Ionicons name="log-out-outline" size={26} color="#FFD700" />
        </TouchableOpacity>
      </View>

      {/* Wallet Balance */}
      {user?.email_confirmed_at && (
        <View style={styles.walletContainer}>
          <Text style={[styles.walletLabel, { color: textColor }]}>Wallet Balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={[styles.walletCard, { backgroundColor: darkMode ? '#111' : '#eee' }]}>
              {/* Animated Blur Overlay */}
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurAnim }]}>
                <BlurView
                  intensity={100} // thick blur
                  tint={darkMode ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              {/* Actual Balance */}
              <Animated.Text
                style={[
                  styles.amount,
                  {
                    color: textColor,
                    opacity: blurAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0], // fade out when blurred
                    }),
                  },
                ]}
              >
                {currency}{renderFormattedBalance(balance ?? 0)}
              </Animated.Text>

              {/* Blurred Dots */}
              <Animated.Text
                style={[
                  styles.amount,
                  {
                    color: textColor,
                    position: 'absolute',
                    opacity: blurAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1], // fade in dots when blurred
                    }),
                  },
                ]}
              >
                •••••
              </Animated.Text>
            </Animated.View>

            {/* Eye Icon */}
            <Ionicons
              name={showBalance ? 'eye' : 'eye-off'}
              size={26}
              color={textColor}
              style={{ marginLeft: 10 }}
              onPress={toggleBalance}
            />
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TaskList')}>
          <Ionicons name="list-circle" size={30} color="#4CAF50" />
          <Text style={[styles.actionText, { color: textColor }]}>Start Task</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Withdraw')}>
          <MaterialIcons name="attach-money" size={30} color="#FFD700" />
          <Text style={[styles.actionText, { color: textColor }]}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Submission')}>
          <Ionicons name="checkmark-done-circle" size={30} color="#4CAF50" />
          <Text style={[styles.actionText, { color: textColor }]}>Submit Task Proof</Text>
        </TouchableOpacity>
      
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Invite')}>
          <MaterialIcons name="person-add-alt-1" size={30} color="#00BCD4" />
          <Text style={[styles.actionText, { color: textColor }]}>Invite 2 Earn</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Wallet')}>
          <Ionicons name="wallet" size={30} color="#FFA500" />
          <Text style={[styles.actionText, { color: textColor }]}>Wallet 💼</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings" size={30} color="#888" />
          <Text style={[styles.actionText, { color: textColor }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-circle" size={30} color="#03A9F4" />
          <Text style={[styles.actionText, { color: textColor }]}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TermsPrivacy')}>
          <Ionicons name="document-text" size={30} color="#bbb" />
          <Text style={[styles.actionText, { color: textColor }]}>Terms & Privacy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Support')}>
          <Ionicons name="help-circle" size={30} color="#9C27B0" />
          <Text style={[styles.actionText, { color: textColor }]}>Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 50,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  logout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  walletContainer: {
    marginVertical: 15,
  },
  walletLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  walletCard: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 15,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 5,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  card: {
    borderRadius: 10,
    padding: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  actionBtn: {
    alignItems: 'center',
    width: '30%',
    marginVertical: 10,
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  verifyButton: {
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
  },
});

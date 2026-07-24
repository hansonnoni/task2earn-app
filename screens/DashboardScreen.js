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
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen'; // ✅ UPDATED
import { moderateScale } from 'react-native-size-matters'; // ✅ UPDATED

export default function DashboardScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [currency, setCurrency] = useState('');
  const blurAnim = useRef(new Animated.Value(1)).current; // 1 = blurred, 0 = visible
  const [profileExists, setProfileExists] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);


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

      if (currentUser?.id) {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileData) setProfileExists(true);
    else setProfileExists(false);

  } catch (err) {
    console.error('Error checking profile:', err);
    setProfileExists(false);
  } finally {
    setProfileLoading(false);
  }
}


      // 🔹 Fetch balance + currency for this user
      if (currentUser?.id) {
        try {
          const { data, error } = await supabase
  .from('users')
  .select('available_balance, pending_balance, currency_symbol')
  .eq('id', currentUser.id)
  .single();

if (!error && data) {
  setBalance({
    available: data.available_balance ?? 0,
    pending: data.pending_balance ?? 0,
  });
  setCurrency(data.currency_symbol || '');
} else {
  setBalance({ available: 0, pending: 0 });
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

  useEffect(() => {
  if (!user?.id) return;

  const subscription = supabase
    .channel('profile-updates')               // channel name can be anything
    .on(
      'postgres_changes',                     // listen to database changes
      {
        event: 'INSERT',                      // or 'UPDATE'
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        console.log('Profile created/updated:', payload);
        setProfileExists(true);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, [user?.id]);



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

        
      </View>

      {/* Wallet Balance */}
      {user?.email_confirmed_at && (
        <View style={styles.walletContainer}>
          <Text style={[styles.walletLabel, { color: textColor }]}>Available Balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={[styles.walletCard, { backgroundColor: darkMode ? '#111' : '#eee' }]}>
  {/* Animated Blur Overlay */}
  <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurAnim }]}>
    <BlurView
      intensity={100}
      tint={darkMode ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    />
  </Animated.View>

  {/* Sensitive balances container */}
  <View style={{ alignItems: 'center' }}>
    {/* Available Balance */}
    <Animated.Text
      style={[styles.amount, { color: textColor, opacity: blurAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
    >
      {currency}{renderFormattedBalance(balance?.available ?? 0)}
    </Animated.Text>

    {/* Total Balance (Secondary) */}
    <Animated.Text
      style={{
        fontSize: 14,
        color: textColor,
        opacity: blurAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        marginTop: 4,
      }}
    >
      Total: {currency}{renderFormattedBalance((balance?.available ?? 0) + (balance?.pending ?? 0))}
      {balance?.pending > 0 ? ` (Pending: ${currency}${renderFormattedBalance(balance?.pending)})` : ''}
    </Animated.Text>
  </View>

  {/* Blurred Dots for hide/show */}
  <Animated.Text
    style={[styles.amount, {
      color: textColor,
      position: 'absolute',
      top: '30%', // aligns over both balances
      opacity: blurAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    }]}
  >
    •••••
  </Animated.Text>
</Animated.View>


<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}></View>
            {/* Eye Icon */}
            <Ionicons
              name={showBalance ? 'eye' : 'eye-off'}
              size={26}
              color={textColor}
              style={{ marginRight: 20 }}
              onPress={toggleBalance}
            />

            {/* Logout */}
        <TouchableOpacity 
          style={{ marginRight: 20 }} // optional spacing from screen edge
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
        </View>
      )}

      {/* Profile Completion Overlay */}
{!profileExists && !profileLoading && (
  <View style={styles.profileOverlay}>
    <View style={styles.profileBox}>
      <Ionicons
        name="person-circle-outline"
        size={60}
        color="#FFD700"
        style={{ marginBottom: 10 }}
      />

      <Text style={styles.profileTitle}>
        Complete Your Profile
      </Text>

      <Text style={styles.profileText}>
        You need to finish setting up your profile before you can start tasks,
        withdraw earnings, or access other features.
      </Text>

      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.profileBtnText}>Go to Profile</Text>
      </TouchableOpacity>
    </View>
  </View>
)}



      {/* Quick Actions */}
      <View style={styles.quickActions}>

        <TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate("CreateCampaign")}
  disabled={!profileExists}
>
  <Ionicons
    name="add-circle"
    size={30}
    color="#FFD700"
  />

  <Text
    style={[
      styles.actionText,
      { color: textColor }
    ]}
  >
    Create Campaign
  </Text>
</TouchableOpacity>

        <TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('TaskList')}
  disabled={!profileExists}
>
  <Ionicons name="list-circle" size={30} color="#4CAF50" />
  <Text style={[styles.actionText, { color: textColor }]}>Join Campaigns</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('MyCampaigns')}
  disabled={!profileExists}
>
  <Ionicons name="list" size={30} color="#1c1d1c" />
  <Text style={[styles.actionText, { color: textColor }]}>My Campaigns</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Withdraw')}
  disabled={!profileExists}
>
  <MaterialIcons name="attach-money" size={30} color="#FFD700" />
  <Text style={[styles.actionText, { color: textColor }]}>Withdraw</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Submission')}
  disabled={!profileExists}
>
  <Ionicons name="checkmark-done-circle" size={30} color="#4CAF50" />
  <Text style={[styles.actionText, { color: textColor }]}>My Campaign Submissions</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Invite')}
  disabled={!profileExists}
>
  <MaterialIcons name="person-add-alt-1" size={30} color="#00BCD4" />
  <Text style={[styles.actionText, { color: textColor }]}>Invite 2 Earn</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Wallet')}
  disabled={!profileExists}
>
  <Ionicons name="wallet" size={30} color="#FFA500" />
  <Text style={[styles.actionText, { color: textColor }]}>Wallet 💼</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Settings')}
  disabled={!profileExists}
>
  <Ionicons name="settings" size={30} color="#888" />
  <Text style={[styles.actionText, { color: textColor }]}>Settings</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Notifications')}
  disabled={!profileExists}
>
  <Ionicons name="notifications-circle" size={30} color="#03A9F4" />
  <Text style={[styles.actionText, { color: textColor }]}>Notifications</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('TermsPrivacy')}
  disabled={!profileExists}
>
  <Ionicons name="document-text" size={30} color="#bbb" />
  <Text style={[styles.actionText, { color: textColor }]}>Terms & Privacy</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('Support')}
  disabled={!profileExists}
>
  <Ionicons name="help-circle" size={30} color="#9C27B0" />
  <Text style={[styles.actionText, { color: textColor }]}>Support</Text>
</TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: hp('6%'), // add some space from the top
    paddingHorizontal: wp('5%'),
    paddingBottom: hp('5%'),
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: 'bold',
    marginBottom: hp('2%'),
  },
  logout: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('2%'),
  },
  walletContainer: {
    marginVertical: hp('2%'),
  },
  walletLabel: {
    fontSize: moderateScale(14),
    marginBottom: hp('0.5%'),
  },
  walletCard: {
    borderRadius: wp('3%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    minWidth: wp('40%'),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: wp('2%'),
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  card: {
    borderRadius: wp('2%'),
    padding: wp('1%'),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    flex: 1,
  },
  cardTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    marginBottom: hp('0.5%'),
  },
  amount: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('2%'),
    flexWrap: 'wrap',
  },
  actionBtn: {
    alignItems: 'center',
    width: '30%',
    marginVertical: hp('1%'),
  },
  actionText: {
    marginTop: hp('0.5%'),
    fontSize: moderateScale(12),
    textAlign: 'center',
  },
  verifyButton: {
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
  },

  // ✅ Profile Overlay
  profileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: wp('4%'),
  },
  profileBox: {
    backgroundColor: '#1c1c1c', // use darkMode toggle in code if needed
    borderRadius: wp('3%'),
    padding: wp('5%'),
    alignItems: 'center',
  },
  profileTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    marginBottom: hp('1%'),
    textAlign: 'center',
    color: '#FFD700',
  },
  profileText: {
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginBottom: hp('2%'),
    color: '#fff',
  },
  profileBtn: {
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2%'),
    backgroundColor: '#FFD700',
  },
  profileBtnText: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#000',
  },
});

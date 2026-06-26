// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,   // 👈 add this
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import CountryPicker from '@realtril/react-native-country-picker-modal';
import Toast from 'react-native-toast-message';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import { moderateScale } from 'react-native-size-matters';
import * as Clipboard from 'expo-clipboard';
WebBrowser.maybeCompleteAuthSession();


export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    phone_number: '',
    tier: 'Free',
    created_at: null,
    country: '',     
    country_id: null,
    referral_code: '',
    referralsCount: 0, 
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProfileNotification, setShowProfileNotification] = useState(false);


  const [fieldsLocked, setFieldsLocked] = useState(false);
  const [countryLocked, setCountryLocked] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const copyReferralCode = async () => {
  await Clipboard.setStringAsync(profile.referral_code);

  if (Platform.OS === 'android') {
    ToastAndroid.show('Referral code copied!', ToastAndroid.SHORT);
  } else {
    Alert.alert('Copied', 'Referral code copied to clipboard');
  }
};


  const loadProfile = async () => {
  try {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('Session fetch error:', sessionError.message);
      setLoading(false);
      return;
    }

    const user = sessionData?.session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: p, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const generatedUsername = (user.email || '').split('@')[0] || '';

    if (error) {
      Alert.alert('Error loading profile', error.message);
      setLoading(false);
      return;
    }

    if (!p) {
  // New user → insert default profile
  const referralCodeUsed = user.user_metadata?.referred_by || null;

  let referredBy = null;
  if (referralCodeUsed) {
    const { data: referrer } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", referralCodeUsed)
      .maybeSingle();

    if (referrer) {
      referredBy = referrer.id;
    }
  }

  const { error: insertError } = await supabase.from("users").insert({
    id: user.id,
    email: user.email || '',
    tier: 'Free',
    username: generatedUsername,
    referral_code: generateReferralCode(), // auto-generate
    referred_by: referredBy, // ✅ save who referred
  });

  if (insertError) {
    Alert.alert('Insert Error', insertError.message);
    setLoading(false);
    return;
  }

  // ✅ Increment referrer’s count if valid
  if (referredBy) {
    const { data: rpcData, error: rpcError } = await supabase.rpc("increment_referrals", {
      referred_by_user_id: referredBy,
    });

    if (rpcError) {
      console.log("❌ RPC Error:", rpcError.message);
    } else {
      console.log("✅ New referrals_count:", rpcData);
    }
  }

  // fetch again after insert
  await loadProfile();
  return;
}

    // Existing profile (p)
    if (!p.country_id) {
  setShowProfileNotification(true);
} else {
  setShowProfileNotification(false);
}


    // Update username if missing/outdated
    if (p.username !== generatedUsername) {
      await supabase.from('users').update({ username: generatedUsername }).eq('id', user.id);
    }

    // Ensure referral code exists
    if (!p.referral_code) {
      const newCode = generateReferralCode();
      await supabase.from('users').update({ referral_code: newCode }).eq('id', user.id);
      p.referral_code = newCode;
    }

    // Resolve country name if country_id is set
    let resolvedCountryName = '';
    if (p.country_id) {
      const { data: cData, error: cErr } = await supabase
        .from('countries')
        .select('name')
        .eq('id', p.country_id)
        .maybeSingle();
      if (!cErr && cData) resolvedCountryName = cData.name || '';
    }

    setProfile({
      username: p.username || generatedUsername,
      email: p.email || user.email || '',
      phone_number: p.phone_number || '',
      tier: p.tier || 'Free',
      currency_symbol: p.currency_symbol || '',
      created_at: p.created_at || null,
      country: resolvedCountryName,
      country_id: p.country_id || null,
      referral_code: p.referral_code || '',

      // other stats
      referralsCount: Number(p.referrals_count || 0),
    });

    if (p.country_id) setCountryLocked(true);

    setLoading(false);
  } catch (err) {
    console.error('Unexpected error in loadProfile:', err?.message || err);
    setLoading(false);
  }
};

  const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    Toast.show({ type: 'success', text1: 'Logged out successfully' });

    // 🚫 Don't do navigation.reset()
    // AppNavigator automatically switches to AuthStack → LoginScreen
  } catch (error) {
    Toast.show({ type: 'error', text1: error.message || 'Logout failed' });
  }
};

const saveProfile = async () => {
  if (countryLocked) return;

  if (!profile.country && !profile.country_id) {
    Alert.alert('Missing info', 'Please select your country.');
    return;
  }

  setSaving(true);

  try {
    // Resolve country ID if only country name is provided
    let countryId = profile.country_id;
    if (!countryId && profile.country) {
      const { data: countryData, error: countryError } = await supabase
        .from('countries')
        .select('id')
        .ilike('name', profile.country.trim())
        .maybeSingle();

      if (countryError) throw countryError;
      if (!countryData) {
        Alert.alert('Invalid country', 'Please enter a valid country name.');
        setSaving(false);
        return;
      }
      countryId = countryData.id;
    }

    // Prepare payload
    const payload = {
      id: userId,
      username: profile.username,
      phone_number: profile.phone_number,
      email: profile.email,
      tier: profile.tier,
      currency_symbol: profile.currency_symbol,
      country_id: countryId,
      referral_code: profile.referral_code,
      referrals_count: profile.referrals_count,
    };

    const { error } = await supabase.from('users').upsert(payload);
    if (error) throw error;

    // Lock fields and hide notification
    setFieldsLocked(true);
    setCountryLocked(true);
    setShowProfileNotification(false);

    // Show top toast notification
    Toast.show({
      type: 'success',
      text1: "Click 'Start Task' button to Earning",
      position: 'top',
      visibilityTime: 6000,
      topOffset: 50,
      autoHide: true,
      props: { backgroundColor: '#FFD700', textColor: '#000' },
    });

    // Reload profile
    loadProfile();
  } catch (err) {
    Alert.alert('Save failed', err.message || String(err));
  } finally {
    setSaving(false);
  }
};


  const handlePasswordReset = async () => {
    if (!profile.email) {
      Alert.alert('No email', 'Your account email is missing.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    if (error) {
      Alert.alert('Reset failed', error.message);
    } else {
      Alert.alert('Check your inbox', 'We sent a password reset link to your email.');
    }
  };

  const getInitials = (email) => {
    if (!email) return '?';
    const base = email.split('@')[0] || email;
    return base.slice(0, 2).toUpperCase();
  };

  const formatJoined = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const money = (n) => {
    const sym = profile.currency_symbol || '';
    const value = Number.isFinite(n) ? n : Number(n || 0);
    return `${sym}${(value ?? 0).toFixed(2)}`;
  };

  
  

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView
  style={styles.container}
  contentContainerStyle={styles.contentContainer}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>

      <Text style={styles.title}>{profile.username}</Text>

      <View style={styles.avatarPlaceholder}>
  <Text style={styles.initials}>{getInitials(profile.email)}</Text>

  {/* Show Upgrade badge only if not Premium */}
  {profile.tier !== 'Premium' && (
    <TouchableOpacity
  style={styles.upgradeBadgeSmall}
  onPress={() => navigation.navigate('UpgradeScreen')}
>
  <Text style={styles.upgradeBadgeText}>Unlock Premium Tasks Access </Text>
</TouchableOpacity>

  )}
</View>


      <Text style={styles.badge}>
        {profile.tier === 'Premium' ? '🌟 Premium User' : '🆓 Free User'}
      </Text>

      

      <View style={styles.infoRow}>
        <Text style={styles.infoItem}>
          📅 Joined: <Text style={styles.infoValue}>{formatJoined(profile.created_at)}</Text>
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoItem}>
          🌍 Country: <Text style={styles.infoValue}>{profile.country || '—'}</Text>
        </Text>
      </View>

      <View style={styles.section}></View>

      <TextInput
        placeholder="Username"
        placeholderTextColor="#888"
        style={[styles.input, { backgroundColor: '#333' }]}
        value={profile.username}
        editable={false}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        style={[styles.input, { backgroundColor: '#333' }]}
        value={profile.email}
        editable={false}
      />

      {showProfileNotification && (
     <View style={styles.profileNotice}>
      <Text style={styles.profileNoticeText}>
        ⚠️ Select your Country to see Tasks available in your Region
      </Text>
     </View>
   )}

      {/* Country picker trigger */}
      <TouchableOpacity
        style={[styles.input, { justifyContent: 'center' }]}
        onPress={() => !countryLocked && setShowCountryPicker(true)}
      >
        <Text style={{ color: profile.country ? '#fff' : '#333' }}>
          {profile.country || 'Select Your Country'}
        </Text>
      </TouchableOpacity>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
          <View style={{ margin: 20, backgroundColor: '#1e1e1e', borderRadius: 10, padding: 10 }}>
            <CountryPicker
              onSelect={(c) => {
                setProfile(prev => ({ ...prev, country: c.name }));
                setShowCountryPicker(false);
              }}
              withFilter
              withFlag
              withAlphaFilter
              withCallingCode
              withEmoji
              onClose={() => setShowCountryPicker(false)}
            />
          </View>
        </View>
      </Modal>

     <TouchableOpacity
  style={styles.saveButton}
  onPress={saveProfile}
  disabled={saving || countryLocked}
>
  {saving ? (
    <ActivityIndicator color="#000" />
  ) : (
    <Text style={styles.saveText}>
      {profile.country_id ? '✅ Profile Updated' : 'Save Profile'}
    </Text>
  )}
</TouchableOpacity>


   <TouchableOpacity
  style={styles.connectButton}
  onPress={() => navigation.navigate('Performance')}
>
  <Text style={styles.connectText}>Performance Zone</Text>
</TouchableOpacity>

 <TouchableOpacity
  style={styles.connectButton}
  onPress={() => navigation.navigate('SpotifyConnect')}
>
  <Text style={styles.connectText}>Connect Spotify Account</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.connectButton}
  onPress={() => navigation.navigate('TiktokConnect')}
>
  <Text style={styles.connectText}>Connect Tiktok Account</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.connectButton}
  onPress={() => navigation.navigate('GoogleYouTubeConnect')}
>
  <Text style={styles.connectText}>Connect Google + YouTube Account</Text>
</TouchableOpacity>


      {/* Referral Zone*/}
      <Text style={styles.sectionHeading}>Referral Zone</Text>
      <View style={styles.statsContainer}>

        {/* Referral Code Card */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>🔗 Referral Code</Text>
          <TouchableOpacity onPress={copyReferralCode}>
            <Text style={[styles.statValue, { textAlign: 'center' }]}>{profile.referral_code}</Text>
          </TouchableOpacity>
          <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            Tap to copy
          </Text>
        </View>
      </View>

    {/* Account & Settings */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Account</Text>

  {/* Change / Reset Password */}
  <TouchableOpacity style={styles.menuItem} onPress={handlePasswordReset}>
    <Ionicons name="key-outline" size={20} color="#FFD700" />
    <Text style={styles.menuText}>Change / Reset Password</Text>
  </TouchableOpacity>

  {/* Notification Preferences */}
  <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
    <Ionicons name="notifications-outline" size={20} color="#FFD700" />
    <Text style={styles.menuText}>Notification Preferences</Text>
  </TouchableOpacity>

  {/* Logout */}
  <TouchableOpacity 
    style={styles.menuItem} 
    onPress={async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Logout Successful' });
      } catch (err) {
        Toast.show({ type: 'error', text1: err.message || 'Logout failed' });
      }
    }}
  >
    <MaterialIcons name="logout" size={24} color="gold" />
    <Text style={[styles.menuText, { color: 'gold' }]}>Logout</Text>
  </TouchableOpacity>

  {/* Delete Account */}
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => {
      Alert.alert(
        "Contact Support",
        "Please contact support to delete your account."
      );
    }}
  >
    <MaterialIcons name="delete-outline" size={22} color="red" />
    <Text style={[styles.menuText, { color: 'red' }]}>Delete Account</Text>
  </TouchableOpacity>
</View>

</ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: wp('6%'),
  },

  contentContainer: {
    paddingTop: hp('2%'),
    paddingBottom: hp('8%'),
  },

  title: {
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    color: '#00FFB7',
    marginBottom: hp('2%'),
    marginTop: hp('1%'),
  },

  input: {
    backgroundColor: '#000',
    borderRadius: wp('3%'),
    paddingVertical: hp('1.6%'),
    paddingHorizontal: wp('4%'),
    marginBottom: hp('1.8%'),
    color: '#fff',
    fontSize: moderateScale(14),
  },

  saveButton: {
    backgroundColor: '#ffd700',
    borderRadius: wp('3%'),
    paddingVertical: hp('1.8%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp('4%'),
  },

  saveText: {
    fontSize: moderateScale(14),
    color: '#000',
    fontWeight: 'bold',
  },

  avatarPlaceholder: {
    width: wp('28%'),
    height: wp('28%'),
    borderRadius: wp('14%'),
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
    position: 'relative',
  },

  initials: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#FFD700',
  },

  upgradeBadgeSmall: {
    position: 'absolute',
    top: -hp('1%'),
    right: -wp('2%'),
    backgroundColor: '#FFD700',
    borderRadius: wp('2%'),
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
  },

  upgradeBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: '#000',
  },

  badge: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: hp('1%'),
    fontSize: moderateScale(14),
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('1.2%'),
  },

  infoItem: {
    color: '#ccc',
    fontSize: moderateScale(13),
  },

  infoValue: {
    color: '#fff',
  },

  card: {
    backgroundColor: '#222',
    borderRadius: wp('4%'),
    padding: wp('4%'),
    marginBottom: hp('2%'),
  },

  cardTitle: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: hp('1%'),
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1.8%'),
    borderBottomWidth: 0.5,
    borderColor: '#444',
  },

  menuText: {
    fontSize: moderateScale(15),
    marginLeft: wp('3%'),
    color: '#fff',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: hp('3%'),
  },

  statCard: {
    width: '48%',
    backgroundColor: '#1e1e1e',
    borderRadius: wp('4%'),
    padding: wp('4%'),
    marginBottom: hp('2%'),
    elevation: 3,
  },

  statLabel: {
    fontSize: moderateScale(13),
    color: '#aaa',
  },

  statValue: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: hp('0.8%'),
    textAlign: 'center',
  },

  sectionHeading: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#fff',
    marginTop: hp('3%'),
    marginBottom: hp('1.5%'),
  },

  connectButton: {
    backgroundColor: '#222',
    paddingVertical: hp('2%'),
    borderRadius: wp('3%'),
    marginVertical: hp('1%'),
    alignItems: 'center',
  },

  connectText: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },

  profileNotice: {
    backgroundColor: '#FFD70022',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    padding: wp('3%'),
    marginBottom: hp('1.5%'),
    borderRadius: wp('3%'),
  },

  profileNoticeText: {
    color: '#ff0000',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
});


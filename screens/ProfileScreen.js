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
  Clipboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri, startAsync } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { encode as btoa } from 'base-64';
import { supabase } from '../supabase';
import PhoneInput from 'react-native-phone-number-input';
import CountryPicker from '@realtril/react-native-country-picker-modal';
import Toast from 'react-native-toast-message';
WebBrowser.maybeCompleteAuthSession();


export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    phone_number: '',
    tier: 'Free',
    currency_symbol: '',
    balance: 0,
    created_at: null,
    country: '',     
    country_id: null,
    referral_code: '', // new
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProfileNotification, setShowProfileNotification] = useState(false);


  // Social media states
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUsername, setFacebookUsername] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');

  // Loading states for each platform
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [savingTiktok, setSavingTiktok] = useState(false);
  const [savingTwitter, setSavingTwitter] = useState(false);

  const [instagramSaved, setInstagramSaved] = useState(false);
  const [facebookSaved, setFacebookSaved] = useState(false);
  const [tiktokSaved, setTiktokSaved] = useState(false);
  const [twitterSaved, setTwitterSaved] = useState(false);


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

  const copyReferralCode = () => {
    Clipboard.setString(profile.referral_code);
    Alert.alert('Copied', 'Referral code copied to clipboard');
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
    if (!p.phone_number || !p.country_id) {
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
      balance: typeof p.balance === 'number' ? p.balance : Number(p.balance || 0),
      created_at: p.created_at || null,
      country: resolvedCountryName,
      country_id: p.country_id || null,
      referral_code: p.referral_code || '',

      // other stats
      totalEarned: Number(p.total_earned || 0),
      pendingWithdrawals: Number(p.pending_withdrawals || 0),
      completedWithdrawals: Number(p.completed_withdrawals || 0),
      tasksCompleted: Number(p.tasks_completed || 0),
      referralsCount: Number(p.referrals_count || 0),
    });

    // Initialize social media states
    setInstagramUsername(p.instagram_username || '');
    setInstagramUrl(p.instagram_url || '');
    setFacebookUsername(p.facebook_username || '');
    setFacebookUrl(p.facebook_url || '');
    setTiktokUsername(p.tiktok_username || '');
    setTiktokUrl(p.tiktok_url || '');
    setTwitterUsername(p.twitter_username || '');
    setTwitterUrl(p.twitter_url || '');

    // Mark saved states (so saved buttons stay green & locked)
    setInstagramSaved(!!p.instagram_username && !!p.instagram_url);
    setFacebookSaved(!!p.facebook_username && !!p.facebook_url);
    setTiktokSaved(!!p.tiktok_username && !!p.tiktok_url);
    setTwitterSaved(!!p.twitter_username && !!p.twitter_url);



    if (p.phone_number) setFieldsLocked(true);
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

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("users")
                .update({ is_deleted: true })
                .eq("id", userId);

              if (error) {
                Alert.alert("Error", error.message);
                return;
              }

              await supabase.auth.signOut();
              await AsyncStorage.removeItem("user");

              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });

              Alert.alert("Deleted", "Your account has been deleted.");
            } catch (err) {
              Alert.alert("Error", err.message || "Something went wrong.");
            }
          },
        },
      ]
    );
  };

const saveProfile = async () => {
  if (fieldsLocked && countryLocked) return;

  if (!profile.phone_number) {
    Alert.alert('Missing info', 'Please enter your phone number.');
    return;
  }

  if (!profile.country && !profile.country_id) {
    Alert.alert('Missing info', 'Please enter your country.');
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
      balance: profile.balance,
      country_id: countryId,
      referral_code: profile.referral_code,
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

  const saveInstagram = async () => {
  setSavingInstagram(true);
  try {
    const { error } = await supabase
      .from('users')
      .update({
        instagram_username: instagramUsername,
        instagram_url: instagramUrl,
      })
      .eq('id', userId);

    if (error) throw error;

    setInstagramSaved(true); // ✅ Mark as saved
    Toast.show({ type: 'success', text1: 'Instagram saved successfully!' });
  } catch (err) {
    Alert.alert('Save failed', err.message || String(err));
  } finally {
    setSavingInstagram(false);
  }
};

const saveFacebook = async () => {
  setSavingFacebook(true);
  try {
    const { error } = await supabase
      .from('users')
      .update({
        facebook_username: facebookUsername,
        facebook_url: facebookUrl,
      })
      .eq('id', userId);

    if (error) throw error;

    setFacebookSaved(true); // ✅
    Toast.show({ type: 'success', text1: 'Facebook saved successfully!' });
  } catch (err) {
    Alert.alert('Save failed', err.message || String(err));
  } finally {
    setSavingFacebook(false);
  }
};

const saveTiktok = async () => {
  setSavingTiktok(true);
  try {
    const { error } = await supabase
      .from('users')
      .update({
        tiktok_username: tiktokUsername,
        tiktok_url: tiktokUrl,
      })
      .eq('id', userId);

    if (error) throw error;

    setTiktokSaved(true); // ✅
    Toast.show({ type: 'success', text1: 'TikTok saved successfully!' });
  } catch (err) {
    Alert.alert('Save failed', err.message || String(err));
  } finally {
    setSavingTiktok(false);
  }
};

const saveTwitter = async () => {
  setSavingTwitter(true);
  try {
    const { error } = await supabase
      .from('users')
      .update({
        twitter_username: twitterUsername,
        twitter_url: twitterUrl,
      })
      .eq('id', userId);

    if (error) throw error;

    setTwitterSaved(true); // ✅
    Toast.show({ type: 'success', text1: 'Twitter saved successfully!' });
  } catch (err) {
    Alert.alert('Save failed', err.message || String(err));
  } finally {
    setSavingTwitter(false);
  }
};


  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{profile.username}</Text>

      <View style={styles.avatarPlaceholder}>
  <Text style={styles.initials}>{getInitials(profile.email)}</Text>

  {/* Show Upgrade badge only if not Premium */}
  {profile.tier !== 'Premium' && (
    <TouchableOpacity
      style={styles.upgradeBadgeSmall}
      onPress={() => Alert.alert('Upgrade', 'Upgrade to Premium coming soon!')}
    >
      <Text style={styles.upgradeBadgeText}>Upgrade</Text>
    </TouchableOpacity>
  )}
</View>


      <Text style={styles.badge}>
        {profile.tier === 'Premium' ? '🌟 Premium User' : '🆓 Free User'}
      </Text>

      {showProfileNotification && (
     <View style={styles.profileNotice}>
      <Text style={styles.profileNoticeText}>
        ⚠️ Select your Country and input Phone Number to Start Tasks and Earning
      </Text>
     </View>
   )}

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

      {/* Phone Input */}
      <PhoneInput
        defaultCode="NG"
        layout="first"
        containerStyle={{ marginBottom: 15, backgroundColor: '#222', borderRadius: 10 }}
        textContainerStyle={{ backgroundColor: '#222' }}
        textInputStyle={{ color: '#fff' }}
        value={profile.phone_number}
        onChangeText={(text) => setProfile(prev => ({ ...prev, phone_number: text }))}
        editable={!fieldsLocked}
      />

      {/* Country picker trigger */}
      <TouchableOpacity
        style={[styles.input, { justifyContent: 'center' }]}
        onPress={() => !countryLocked && setShowCountryPicker(true)}
      >
        <Text style={{ color: profile.country ? '#fff' : '#888' }}>
          {profile.country || 'Select Country'}
        </Text>
      </TouchableOpacity>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center' }}>
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
        disabled={saving || (fieldsLocked && countryLocked)}
      >
        {saving ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.saveText}>
            {fieldsLocked && countryLocked ? '✅ Profile Updated' : 'Save Profile'}
          </Text>
        )}
      </TouchableOpacity>


      {/* 🔹 Social Media Connection Heading Section */}
<View style={{ marginVertical: 20, paddingHorizontal: 16 }}>
  <Text style={{
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700', // gold
    marginBottom: 6,
  }}>
    Connect Your Social
  </Text>

  <Text style={{
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  }}>
    Link your social media handles to qualify for social tasks and earn rewards.
  </Text>

  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 10,
    borderRadius: 10,
  }}>
    <Ionicons name="shield-checkmark-outline" size={18} color="#FFD700" />
    <Text style={{
      fontSize: 12,
      color: '#aaa',
      marginLeft: 8,
      flex: 1,
      lineHeight: 18,
    }}>
      We never access or control your social media accounts. Task2Earn only verifies your connected handles to confirm task participation.
    </Text>
  </View>
</View>

    {/* Instagram */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Instagram</Text>
  <TextInput
    placeholder="Username"
    placeholderTextColor="#888"
    style={[styles.input, instagramSaved && { backgroundColor: '#222', color: '#777' }]}
    value={instagramUsername}
    onChangeText={setInstagramUsername}
    editable={!instagramSaved}
  />
  <TextInput
    placeholder="Profile URL"
    placeholderTextColor="#888"
    style={[styles.input, instagramSaved && { backgroundColor: '#222', color: '#777' }]}
    value={instagramUrl}
    onChangeText={setInstagramUrl}
    editable={!instagramSaved}
  />

  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <TouchableOpacity
      style={[
        styles.saveButton,
        instagramSaved && { backgroundColor: '#FFD700' },
      ]}
      onPress={!instagramSaved ? saveInstagram : null}
      disabled={savingInstagram || instagramSaved}
    >
      {savingInstagram ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.saveText}>
          {instagramSaved ? 'Saved' : 'Save Instagram'}
        </Text>
      )}
    </TouchableOpacity>

    {instagramSaved && (
      <TouchableOpacity
        onPress={() => navigation.navigate('Support')}
        style={{ marginLeft: 8 }}
      >
        <Text style={{ fontSize: 12, color: '#aaa' }}>I want to change my handle</Text>
      </TouchableOpacity>
    )}
  </View>
</View>

{/* Facebook */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Facebook</Text>
  <TextInput
    placeholder="Username"
    placeholderTextColor="#888"
    style={[styles.input, facebookSaved && { backgroundColor: '#222', color: '#777' }]}
    value={facebookUsername}
    onChangeText={setFacebookUsername}
    editable={!facebookSaved}
  />
  <TextInput
    placeholder="Profile URL"
    placeholderTextColor="#888"
    style={[styles.input, facebookSaved && { backgroundColor: '#222', color: '#777' }]}
    value={facebookUrl}
    onChangeText={setFacebookUrl}
    editable={!facebookSaved}
  />

  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <TouchableOpacity
      style={[
        styles.saveButton,
        facebookSaved && { backgroundColor: '#FFD700' },
      ]}
      onPress={!facebookSaved ? saveFacebook : null}
      disabled={savingFacebook || facebookSaved}
    >
      {savingFacebook ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.saveText}>
          {facebookSaved ? 'Saved' : 'Save Facebook'}
        </Text>
      )}
    </TouchableOpacity>

    {facebookSaved && (
      <TouchableOpacity
        onPress={() => navigation.navigate('Support')}
        style={{ marginLeft: 8 }}
      >
        <Text style={{ fontSize: 12, color: '#aaa' }}>I want to change my handle</Text>
      </TouchableOpacity>
    )}
  </View>
</View>

{/* TikTok */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>TikTok</Text>
  <TextInput
    placeholder="Username"
    placeholderTextColor="#888"
    style={[styles.input, tiktokSaved && { backgroundColor: '#222', color: '#777' }]}
    value={tiktokUsername}
    onChangeText={setTiktokUsername}
    editable={!tiktokSaved}
  />
  <TextInput
    placeholder="Profile URL"
    placeholderTextColor="#888"
    style={[styles.input, tiktokSaved && { backgroundColor: '#222', color: '#777' }]}
    value={tiktokUrl}
    onChangeText={setTiktokUrl}
    editable={!tiktokSaved}
  />

  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <TouchableOpacity
      style={[
        styles.saveButton,
        tiktokSaved && { backgroundColor: '#FFD700' },
      ]}
      onPress={!tiktokSaved ? saveTiktok : null}
      disabled={savingTiktok || tiktokSaved}
    >
      {savingTiktok ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.saveText}>
          {tiktokSaved ? 'Saved' : 'Save TikTok'}
        </Text>
      )}
    </TouchableOpacity>

    {tiktokSaved && (
      <TouchableOpacity
        onPress={() => navigation.navigate('Support')}
        style={{ marginLeft: 8 }}
      >
        <Text style={{ fontSize: 12, color: '#aaa' }}>I want to change my handle</Text>
      </TouchableOpacity>
    )}
  </View>
</View>

{/* Twitter */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Twitter</Text>
  <TextInput
    placeholder="Username"
    placeholderTextColor="#888"
    style={[styles.input, twitterSaved && { backgroundColor: '#222', color: '#777' }]}
    value={twitterUsername}
    onChangeText={setTwitterUsername}
    editable={!twitterSaved}
  />
  <TextInput
    placeholder="Profile URL"
    placeholderTextColor="#888"
    style={[styles.input, twitterSaved && { backgroundColor: '#222', color: '#777' }]}
    value={twitterUrl}
    onChangeText={setTwitterUrl}
    editable={!twitterSaved}
  />

  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <TouchableOpacity
      style={[
        styles.saveButton,
        twitterSaved && { backgroundColor: '#FFD700' },
      ]}
      onPress={!twitterSaved ? saveTwitter : null}
      disabled={savingTwitter || twitterSaved}
    >
      {savingTwitter ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.saveText}>
          {twitterSaved ? 'Saved' : 'Save Twitter'}
        </Text>
      )}
    </TouchableOpacity>

    {twitterSaved && (
      <TouchableOpacity
        onPress={() => navigation.navigate('Support')}
        style={{ marginLeft: 8 }}
      >
        <Text style={{ fontSize: 12, color: '#aaa' }}>I want to change my handle</Text>
      </TouchableOpacity>
    )}
  </View>
</View>


      {/* Wallet & Performance */}
      <Text style={styles.sectionHeading}>Wallet & Performance</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>💸 Balance</Text>
          <Text style={styles.statValue}>{profile.balance}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>💰 Total Earned</Text>
          <Text style={styles.statValue}>{profile.totalEarned}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>⏳ Pending Withdrawals</Text>
          <Text style={styles.statValue}>{profile.pendingWithdrawals}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>✅ Completed Withdrawals</Text>
          <Text style={styles.statValue}>{profile.completedWithdrawals}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>📋 Tasks Completed</Text>
          <Text style={styles.statValue}>{profile.tasksCompleted}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>👥 Referrals Count</Text>
          <Text style={styles.statValue}>{profile.referralsCount}</Text>
        </View>

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

    {/* Settings */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Settings</Text>

  <TouchableOpacity style={styles.menuItem} onPress={handlePasswordReset}>
    <Ionicons name="key-outline" size={20} color="#FFD700" />
    <Text style={styles.menuText}>Change / Reset Password</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
    <Ionicons name="settings-outline" size={20} color="#FFD700" />
    <Text style={styles.menuText}>App Settings</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => navigation.navigate('Notifications')}
  >
    <Ionicons name="notifications-outline" size={20} color="#FFD700" />
    <Text style={styles.menuText}>Notification Preferences</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => navigation.navigate('Withdraw')}
  >
    <Ionicons name="card-outline" size={20} color="#FFD700" />
    <Text style={styles.menuText}>Withdrawal Methods</Text>
  </TouchableOpacity>
</View>

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
  <MaterialIcons name="logout" size={24} color="gold" />
  <Text style={[styles.menuText, { color: 'gold' }]}>Logout</Text>
</TouchableOpacity>

<View style={{ height: 24 }} />

<View style={[styles.card, { marginTop: 22 }]}>
  <TouchableOpacity
    style={styles.menuItem}
    onPress={handleDeleteAccount}
  >
    <MaterialIcons name="delete-outline" size={22} color="red" />
    <Text style={[styles.menuText, { color: 'red' }]}>Delete Account</Text>
  </TouchableOpacity>
</View>

</ScrollView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#00FFB7', marginBottom: 20, marginTop: 15 },
  input: { backgroundColor: '#000', color: 'white', marginBottom: 15, padding: 12, borderRadius: 10 },
  saveButton: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 30 },
  saveText: { color: '#000', fontWeight: 'bold' },

  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#444',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative',
  },
  initials: { fontSize: 28, fontWeight: 'bold', color: '#FFD700' },

  upgradeBadgeSmall: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  upgradeBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#000' },

  badge: { color: '#FFD700', fontWeight: 'bold', marginBottom: 10 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoItem: { color: '#ccc' },
  infoValue: { color: '#fff' },

 card: {
  backgroundColor: '#111',
  borderRadius: 12,
  padding: 10,
  marginVertical: 6,
},

input: {
  backgroundColor: '#000',
  borderRadius: 8,
  padding: 8,
  marginTop: 4,
  marginBottom: 6,
  color: '#fff',
  fontSize: 13,
},

saveButton: {
  backgroundColor: '#555',
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 12,
  alignItems: 'center',
  justifyContent: 'center',
},

saveText: {
  fontSize: 13,
  color: '#fff',
},

  card: { backgroundColor: '#222', borderRadius: 12, padding: 8, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardLine: { color: '#ccc', marginBottom: 6 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15,
    borderBottomWidth: 0.5, borderColor: '#444',
  },
  menuText: { fontSize: 18, marginLeft: 10, color: '#fff' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e' },
  
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  statLabel: {
    fontSize: 14,
    color: '#aaa',
  },

  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 5,
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 10,
  },

    profileNotice: {
    backgroundColor: '#FFD70022', // faint gold background
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  profileNoticeText: {
    color: '#ff0000ff',
    fontSize: 14,
    fontWeight: '600',
  },
});

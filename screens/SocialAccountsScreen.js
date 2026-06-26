// screens/SocialAccountsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();

export default function SocialAccountsScreen() {
  const navigation = useNavigation();

  // Loading and user states
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({});

  // Social media states
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUsername, setFacebookUsername] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');

  // Saving/loading states
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [savingTiktok, setSavingTiktok] = useState(false);
  const [savingTwitter, setSavingTwitter] = useState(false);

  // Saved flags
  const [instagramSaved, setInstagramSaved] = useState(false);
  const [facebookSaved, setFacebookSaved] = useState(false);
  const [tiktokSaved, setTiktokSaved] = useState(false);
  const [twitterSaved, setTwitterSaved] = useState(false);

  useEffect(() => {
    loadSocialAccounts();
  }, []);

  // Load social accounts
  const loadSocialAccounts = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) throw userError || new Error('No user logged in');
      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select(`
          username,
          instagram_username, instagram_url,
          facebook_username, facebook_url,
          tiktok_username, tiktok_url,
          twitter_username, twitter_url
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Set states
      setInstagramUsername(profileData.instagram_username || '');
      setInstagramUrl(profileData.instagram_url || '');
      setFacebookUsername(profileData.facebook_username || '');
      setFacebookUrl(profileData.facebook_url || '');
      setTiktokUsername(profileData.tiktok_username || '');
      setTiktokUrl(profileData.tiktok_url || '');
      setTwitterUsername(profileData.twitter_username || '');
      setTwitterUrl(profileData.twitter_url || '');

      // Saved flags
      setInstagramSaved(!!profileData.instagram_username && !!profileData.instagram_url);
      setFacebookSaved(!!profileData.facebook_username && !!profileData.facebook_url);
      setTiktokSaved(!!profileData.tiktok_username && !!profileData.tiktok_url);
      setTwitterSaved(!!profileData.twitter_username && !!profileData.twitter_url);
    } catch (err) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Save functions
  const saveSocial = async (platform) => {
    if (!userId) return;
    let updateData = {};
    let setSaved;
    let setSaving;

    switch (platform) {
      case 'instagram':
        setSaving = setSavingInstagram;
        setSaved = setInstagramSaved;
        updateData = { instagram_username: instagramUsername, instagram_url: instagramUrl };
        break;
      case 'facebook':
        setSaving = setSavingFacebook;
        setSaved = setFacebookSaved;
        updateData = { facebook_username: facebookUsername, facebook_url: facebookUrl };
        break;
      case 'tiktok':
        setSaving = setSavingTiktok;
        setSaved = setTiktokSaved;
        updateData = { tiktok_username: tiktokUsername, tiktok_url: tiktokUrl };
        break;
      case 'twitter':
        setSaving = setSavingTwitter;
        setSaved = setTwitterSaved;
        updateData = { twitter_username: twitterUsername, twitter_url: twitterUrl };
        break;
      default:
        return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('users').update(updateData).eq('id', userId);
      if (error) throw error;

      setSaved(true);
      Toast.show({ type: 'success', text1: `${platform.charAt(0).toUpperCase() + platform.slice(1)} saved successfully!` });
    } catch (err) {
      Alert.alert('Save failed', err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  const renderSocialCard = (platform, username, url, setUsername, setUrl, saved, saving) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</Text>
      <TextInput
        placeholder="Username"
        placeholderTextColor="#888"
        style={[styles.input, saved && { backgroundColor: '#222', color: '#777' }]}
        value={username}
        onChangeText={setUsername}
        editable={!saved}
      />
      <TextInput
        placeholder="Profile URL"
        placeholderTextColor="#888"
        style={[styles.input, saved && { backgroundColor: '#222', color: '#777' }]}
        value={url}
        onChangeText={setUrl}
        editable={!saved}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          style={[styles.saveButton, saved && { backgroundColor: '#FFD700' }]}
          onPress={!saved ? () => saveSocial(platform) : null}
          disabled={saving || saved}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{saved ? 'Saved' : `Save ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}</Text>}
        </TouchableOpacity>

        {saved && (
          <TouchableOpacity
            onPress={() => {
              switch (platform) {
                case 'instagram': setInstagramSaved(false); break;
                case 'facebook': setFacebookSaved(false); break;
                case 'tiktok': setTiktokSaved(false); break;
                case 'twitter': setTwitterSaved(false); break;
              }
            }}
            style={{ marginLeft: 8 }}
          >
            <Text style={{ fontSize: 12, color: '#aaa' }}>Change handle</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{profile.username || 'Your Profile'}</Text>

      {/* Info Section */}
      <View style={{ marginVertical: 20, paddingHorizontal: 16 }}>
        <Text style={styles.heading}>Connect Your Social</Text>
        <Text style={styles.subText}>Link your social media handles to qualify for social tasks and earn rewards.</Text>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#FFD700" />
          <Text style={styles.infoBoxText}>
            We never access or control your social media accounts. Task2Earn only verifies your connected handles to confirm task participation.
          </Text>
        </View>
      </View>

      {/* Social Cards */}
      {renderSocialCard('instagram', instagramUsername, instagramUrl, setInstagramUsername, setInstagramUrl, instagramSaved, savingInstagram)}
      {renderSocialCard('facebook', facebookUsername, facebookUrl, setFacebookUsername, setFacebookUrl, facebookSaved, savingFacebook)}
      {renderSocialCard('tiktok', tiktokUsername, tiktokUrl, setTiktokUsername, setTiktokUrl, tiktokSaved, savingTiktok)}
      {renderSocialCard('twitter', twitterUsername, twitterUrl, setTwitterUsername, setTwitterUrl, twitterSaved, savingTwitter)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#00FFB7', marginBottom: 20, marginTop: 15 },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginBottom: 6 },
  subText: { fontSize: 14, color: '#ccc', marginBottom: 8 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', padding: 10, borderRadius: 10 },
  infoBoxText: { fontSize: 12, color: '#aaa', marginLeft: 8, flex: 1, lineHeight: 18 },

  input: { backgroundColor: '#000', color: '#fff', marginBottom: 8, padding: 12, borderRadius: 10, fontSize: 14 },
  saveButton: { backgroundColor: '#555', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  saveText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#222', borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

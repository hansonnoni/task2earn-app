import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

// 🔹 Spotify credentials
const SPOTIFY_CLIENT_ID = '5138f924a6a84c68b9ff9ea79df75561';
const SPOTIFY_SCOPES = 'user-read-email user-read-private user-read-recently-played';
const SPOTIFY_REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });

// 🔹 YouTube credentials
const GOOGLE_CLIENT_ID = '805293391061-f4v6vg8d490g3havr67ceetdib7i4e9f.apps.googleusercontent.com';
const YOUTUBE_SCOPES = 'https://www.googleapis.com/auth/youtube.readonly';
const YOUTUBE_REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });

export default function ConnectAccountsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyDisplayName, setSpotifyDisplayName] = useState('');
  const [connectingSpotify, setConnectingSpotify] = useState(false);

  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeDisplayName, setYoutubeDisplayName] = useState('');
  const [connectingYoutube, setConnectingYoutube] = useState(false);

  // ✅ Fetch authenticated user directly from Supabase
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data?.user) setUserId(data.user.id);
      } catch (err) {
        console.error('Error getting user:', err.message);
        Alert.alert('Error', 'Unable to load user session.');
      } finally {
        setLoadingUser(false);
      }
    };
    getUser();
  }, []);

  // --- Spotify PKCE flow ---
  const discovery = AuthSession.useAutoDiscovery('https://accounts.spotify.com');
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SPOTIFY_SCOPES.split(' '),
      redirectUri: SPOTIFY_REDIRECT_URI,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    },
    discovery
  );

  // ✅ Handle Spotify response
  useEffect(() => {
    const handleSpotifyResponse = async () => {
      if (response?.type === 'success' && response.params?.code && userId) {
        try {
          setConnectingSpotify(true);
          const { code } = response.params;
          const redirectUri = SPOTIFY_REDIRECT_URI;

          const exchangeResponse = await fetch(
            'https://pfixukibsdgasmvehutm.supabase.co/functions/v1/spotify-exchange',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, redirect_uri: redirectUri }),
            }
          );

          const tokenData = await exchangeResponse.json();

          if (tokenData.access_token) {
            const profileResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const spotifyProfile = await profileResponse.json();

            const { error } = await supabase
              .from('users')
              .update({
                spotify_connected: true,
                spotify_display_name: spotifyProfile.display_name,
                spotify_user_id: spotifyProfile.id,
                spotify_access_token: tokenData.access_token,
                spotify_refresh_token: tokenData.refresh_token,
              })
              .eq('id', userId);

            if (error) throw error;

            setSpotifyConnected(true);
            setSpotifyDisplayName(spotifyProfile.display_name);
            Alert.alert('✅ Connected!', `Logged in as ${spotifyProfile.display_name}`);
          } else {
            Alert.alert('Error', 'Spotify token exchange failed.');
          }
        } catch (error) {
          console.error('Spotify connection error:', error);
          Alert.alert('Error', 'Spotify connection failed.');
        } finally {
          setConnectingSpotify(false);
        }
      }
    };
    handleSpotifyResponse();
  }, [response, userId]);

  // --- YouTube connect flow ---
  const connectYouTube = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setConnectingYoutube(true);
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        YOUTUBE_REDIRECT_URI
      )}&response_type=token&scope=${YOUTUBE_SCOPES}`;

      const result = await AuthSession.startAsync({ authUrl });

      if (result.type === 'success' && result.params?.access_token) {
        const accessToken = result.params.access_token;

        const userInfo = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(res => res.json());

        const channel = userInfo.items?.[0];
        if (!channel) throw new Error('Unable to fetch channel info.');

        const { error } = await supabase
          .from('users')
          .update({
            youtube_connected: true,
            youtube_channel_id: channel.id,
            youtube_display_name: channel.snippet.title,
            youtube_access_token: accessToken,
          })
          .eq('id', userId);

        if (error) throw error;

        setYoutubeConnected(true);
        setYoutubeDisplayName(channel.snippet.title);
        Alert.alert('✅ Success', 'YouTube connected successfully!');
      } else {
        console.log('YouTube login cancelled or failed:', result);
      }
    } catch (error) {
      console.error('YouTube connection error:', error);
      Alert.alert('Error', 'YouTube connection failed.');
    } finally {
      setConnectingYoutube(false);
    }
  };

  if (loadingUser) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={{ color: '#ccc', marginTop: 10 }}>Loading user session...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      {/* --- Spotify Section --- */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1DB954', marginBottom: 8 }}>
        Connect Your Spotify Account
      </Text>

      {/* 🟢 Added Spotify Info Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>
          Link your Spotify profile to verify your music streaming tasks and earn rewards.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1c1c1e',
            padding: 10,
            borderRadius: 10,
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#1DB954" />
          <Text
            style={{
              fontSize: 12,
              color: '#aaa',
              marginLeft: 8,
              flex: 1,
              lineHeight: 18,
            }}
          >
            We never access or control your Spotify account. Task2Earn only verifies your connected
            Spotify profile to confirm your streams for task participation.
          </Text>
        </View>
      </View>

      {spotifyConnected ? (
        <TouchableOpacity
          style={{ backgroundColor: '#333', padding: 14, borderRadius: 10, marginBottom: 20 }}
          disabled
        >
          <Text style={{ color: '#0f0', textAlign: 'center' }}>
            ✅ Connected as {spotifyDisplayName}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={{
            backgroundColor: connectingSpotify ? 'gray' : '#1DB954',
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
          }}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={connectingSpotify}
        >
          {connectingSpotify ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
              Connect Spotify
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* --- YouTube Section --- */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FF0000', marginBottom: 8 }}>
        Connect Your YouTube Channel
      </Text>

      {/* 🔴 Added YouTube Info Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>
          Link your YouTube channel to verify video engagement tasks and qualify for creator-related rewards.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1c1c1e',
            padding: 10,
            borderRadius: 10,
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#FF0000" />
          <Text
            style={{
              fontSize: 12,
              color: '#aaa',
              marginLeft: 8,
              flex: 1,
              lineHeight: 18,
            }}
          >
            We never access or control your YouTube account. Task2Earn only confirms your connected
            channel to verify your activity for task validation.
          </Text>
        </View>
      </View>

      {youtubeConnected ? (
        <TouchableOpacity
          style={{ backgroundColor: '#333', padding: 14, borderRadius: 10 }}
          disabled
        >
          <Text style={{ color: '#0f0', textAlign: 'center' }}>
            ✅ Connected as {youtubeDisplayName}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={{
            backgroundColor: connectingYoutube ? 'gray' : '#FF0000',
            padding: 14,
            borderRadius: 10,
          }}
          onPress={connectYouTube}
          disabled={connectingYoutube}
        >
          {connectingYoutube ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
              Connect YouTube
            </Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

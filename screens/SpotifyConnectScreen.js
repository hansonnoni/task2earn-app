// SpotifyConnectScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { encode as btoa } from 'base-64';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase'; // your Supabase client

// Spotify client info
const SPOTIFY_CLIENT_ID = '5138f924a6a84c68b9ff9ea79df75561';
const SPOTIFY_REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });

// Spotify scopes
const SPOTIFY_SCOPES =
  'user-read-email user-read-private playlist-read-private streaming';

export default function SpotifyConnectScreen() {
  // --- Spotify states ---
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyDisplayName, setSpotifyDisplayName] = useState('');
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const [userId, setUserId] = useState(null);

  // --- Load current Supabase user on mount ---
  useEffect(() => {
    const fetchUser = async () => {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : supabase.auth.user();
      if (!user) {
        Alert.alert('Error', 'No logged-in user found.');
        return;
      }
      setUserId(user.id);

      // fetch profile data
      const { data, error } = await supabase
        .from('users')
        .select('spotify_connected, spotify_display_name')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setSpotifyConnected(data.spotify_connected);
        setSpotifyDisplayName(data.spotify_display_name);
      }
    };

    fetchUser();
  }, []);

  // --- PKCE helpers ---
  async function generateCodeVerifier() {
    const randomBytes = await Crypto.getRandomBytesAsync(64);
    let s = btoa(String.fromCharCode(...randomBytes));
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function generateCodeChallenge(verifier) {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // --- Spotify Auth ---
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

  // --- Handle Spotify Response ---
  useEffect(() => {
    const handleSpotifyResponse = async () => {
      if (response?.type === 'success' && response.params?.code) {
        if (!userId) return;

        try {
          setConnectingSpotify(true);
          const { code } = response.params;

          const exchangeResponse = await fetch(
            'https://pfixukibsdgasmvehutm.supabase.co/functions/v1/spotify-exchange',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, redirect_uri: SPOTIFY_REDIRECT_URI }),
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.title}>Connect Your Spotify Account</Text>
        <Text style={styles.subtitle}>
          Link your Spotify profile to verify your music streaming tasks and earn rewards.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#1DB954" />
          <Text style={styles.infoText}>
            We never access or control your Spotify account. Task2Earn only verifies your
            connected Spotify profile to confirm your streams for task participation.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spotify</Text>

        {spotifyConnected ? (
          <>
            <Text style={{ color: '#0f0', marginBottom: 5 }}>
              Connected as {spotifyDisplayName}
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: 'gray' }]} disabled>
              <Text style={styles.buttonText}>Connected ✅</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: !request || connectingSpotify ? 'gray' : '#1DB954' },
            ]}
            onPress={() => promptAsync({ useProxy: true })}
            disabled={!request || connectingSpotify}
          >
            {connectingSpotify ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect Spotify</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1DB954', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#ccc', marginBottom: 8 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 10,
    borderRadius: 10,
  },
  infoText: { fontSize: 12, color: '#aaa', marginLeft: 8, flex: 1, lineHeight: 18 },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

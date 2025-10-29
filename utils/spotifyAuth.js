// utils/spotifyAuth.js
import * as AuthSession from 'expo-auth-session';
import { generateCodeVerifier, generateCodeChallenge } from './spotifyPkce'; // import from your file

const SPOTIFY_CLIENT_ID = '5138f924a6a84c68b9ff9ea79df75561';
const redirectUri = 'https://auth.expo.io/@task2earn/Task2Earn';
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-recently-played'
];

export async function connectSpotify() {
  try {
    // Step 1: Generate verifier & challenge using your existing helper
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Step 2: Build the Spotify authorization URL
    const authUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${SPOTIFY_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code_challenge_method=S256` +
      `&code_challenge=${codeChallenge}` +
      `&scope=${encodeURIComponent(SPOTIFY_SCOPES.join(' '))}`;

    console.log('🟡 Opening Spotify login page...');
    const result = await startAsync({ authUrl });

    // Step 3: Handle Spotify redirect
    if (result.type === 'success' && result.params?.code) {
      console.log('✅ Spotify authorization code:', result.params.code);

      // Step 4: Exchange authorization code for access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: 'authorization_code',
          code: result.params.code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        console.log('🎵 Connected to Spotify successfully!');
        console.log('🔑 Access Token:', tokenData.access_token);
        return tokenData;
      } else {
        console.error('❌ Failed to get access token:', tokenData);
      }
    } else {
      console.log('⚠️ Spotify connection was cancelled or failed:', result);
    }
  } catch (error) {
    console.error('🔥 Error connecting to Spotify:', error);
  }
}

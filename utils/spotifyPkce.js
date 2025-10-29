import React, { useState } from 'react';
import { Button } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/spotifyPkce';

const SPOTIFY_CLIENT_ID = '5138f924a6a84c68b9ff9ea79df75561';
const SPOTIFY_SCOPES = ['user-read-email', 'user-read-private'];
const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

export default function SpotifyConnectButton() {
  const [token, setToken] = useState(null);

  const connectSpotify = async () => {
    try {
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const discovery = {
        authorizationEndpoint: 'https://accounts.spotify.com/authorize',
        tokenEndpoint: 'https://accounts.spotify.com/api/token',
      };

      const request = new AuthSession.AuthRequest({
        clientId: SPOTIFY_CLIENT_ID,
        scopes: SPOTIFY_SCOPES,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: { code_challenge: codeChallenge, code_challenge_method: 'S256' },
      });

      await request.prepareAsync(discovery);

      const result = await AuthSession.performAsync({ request });

      if (result.type === 'success' && result.params.code) {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: SPOTIFY_CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: { code_verifier: codeVerifier },
          },
          discovery
        );

        console.log('✅ Spotify token:', tokenResponse.accessToken);
        setToken(tokenResponse.accessToken);
      } else {
        console.log('⚠️ Spotify login cancelled or failed', result);
      }
    } catch (error) {
      console.error('🔥 Spotify connection error:', error);
    }
  };

  return <Button title="Connect Spotify" onPress={connectSpotify} />;
}

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import AppNavigator from './navigator';
import Toast from 'react-native-toast-message';
import { UserProvider } from './context/UserContext';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  useEffect(() => {
    // 👇 Generate and log your redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      useProxy: true, // use true if you run on Expo Go
    });
    console.log('✅ Expo Redirect URI:', redirectUri);
  }, []);

  return (
    <UserProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <Toast />
      </View>
    </UserProvider>
  );
}

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import AppNavigator from './navigator';
import Toast from 'react-native-toast-message';
import { UserProvider } from './context/UserContext';

WebBrowser.maybeCompleteAuthSession();
const linking = {
  prefixes: ['task2earn://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

export default function App() {
  useEffect(() => {
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
  });

  console.log('✅ Expo Redirect URI:', redirectUri);

  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('🔥 Deep Link Received:', url);
  });

  return () => {
    subscription.remove();
  };
}, []);

  return (
    <UserProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
        <Toast />
      </View>
    </UserProvider>
  );
}
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Clear stale sessions on mount
  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('token');
      } catch (err) {
        console.warn('SignOut cleanup error:', err?.message);
      }
    })();
  }, []);

  // Email/Password login
  const handleLogin = async () => {
    if (!email || !password) {
      return Toast.show({ type: 'error', text1: 'Please fill all fields' });
    }

    setIsLoading(true);
    try {
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('email not confirmed')) {
          Toast.show({ type: 'info', text1: 'Please confirm your email first' });
          navigation.navigate('EmailConfirmation', { email, fromSignup: false });
          return;
        }
        if (msg.includes('invalid') || msg.includes('not found') || msg.includes('user')) {
          Toast.show({ type: 'error', text1: 'No account found for that email.' });
          return;
        }
        throw error;
      }

      if (!data?.session || !data?.user) {
        Toast.show({ type: 'error', text1: 'Login failed. Account may not exist.' });
        return;
      }

      if (rememberMe && data.session.access_token) {
        await AsyncStorage.setItem('token', data.session.access_token);
      }

      Toast.show({ type: 'success', text1: 'Login successful' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const redirectUrl = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success') {
          Toast.show({ type: 'success', text1: 'Google login successful' });
        }
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Google login failed' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.welcome}>Welcome Back!</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#aaa" />
        </TouchableOpacity>
      </View>

      <View style={styles.rememberMe}>
        <Text style={styles.rememberMeText}>Remember Me</Text>
        <Switch
          value={rememberMe}
          onValueChange={setRememberMe}
          thumbColor={rememberMe ? '#ce990a' : '#555'}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <View style={styles.googleButtonContent}>
            <Image source={require('../assets/google-logo.png')} style={styles.googleLogo} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.toggleText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

      {/* ✅ Terms & Privacy navigates to its own screen */}
      <TouchableOpacity onPress={() => navigation.navigate('TermsPrivacy')} activeOpacity={0.7}>
        <Text style={styles.termsText}>
          By logging in, you agree to our Terms & Privacy Policy
        </Text>
      </TouchableOpacity>

      {/* ✅ Forgot Password navigates to a dedicated screen */}
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 25, justifyContent: 'center' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginTop: -55, marginBottom: 25 },
  welcome: { fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: 24, marginTop: -25, fontWeight: '600' },
  input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  inputPassword: { flex: 1, paddingVertical: 12, color: '#fff' },
  rememberMe: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rememberMeText: { fontSize: 14, color: '#ccc' },
  button: { backgroundColor: '#ce990a', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#000', fontWeight: '600', fontSize: 16 },
  googleButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  googleButtonContent: { flexDirection: 'row', alignItems: 'center' },
  googleLogo: { width: 20, height: 20, marginRight: 10 },
  googleButtonText: { color: '#000', fontWeight: '600', fontSize: 16 },
  toggleText: { color: '#aaa', textAlign: 'center', marginBottom: 18 },
  termsText: { color: '#ce990a', textAlign: 'center', fontSize: 14, marginBottom: 20, textDecorationLine: 'underline' },
  forgotText: { textAlign: 'center', color: '#aaa', fontSize: 14, textDecorationLine: 'underline', marginBottom: 16 },
});

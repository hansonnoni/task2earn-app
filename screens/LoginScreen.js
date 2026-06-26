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
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ UPDATED (Rule 5)

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen'; // ✅ UPDATED (Rule 2)

import { moderateScale } from 'react-native-size-matters'; // ✅ UPDATED (Rule 4)



async function callLoginEdgeFunction(userId) {
  try {
    let ip = '0.0.0.0';
    try {
      ip = await Network.getIpAddressAsync();
    } catch {}

    const deviceId =
      Application.androidId ??
      `${Device.osName}-${Device.modelName}-${Device.deviceYearClass}`;

    const res = await supabase.functions.invoke('user-login', {
      body: {
        userId,
        ip,
        deviceId,
        deviceType: Device.deviceType === 1 ? 'phone' : 'unknown',
        osName: Device.osName ?? 'android',
        osVersion: String(Device.osVersion ?? ''),
        appVersion: Application.nativeApplicationVersion ?? '1.0.0',
        countrySelected: 'NG', // ✅ REQUIRED
      },
    });

    if (res.error) {
      console.warn('Edge invoke error:', res.error.message);
    } else {
      console.log('✅ User session recorded:', res.data);
    }
  } catch (e) {
    console.warn('Edge function failed:', e.message);
  }
}



WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  
  // Email/Password login
  const handleLogin = async () => {
    if (!email || !password) {
      return Toast.show({ type: 'error', text1: 'Please fill all fields' });
    }

    setIsLoading(true);
    try {


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

      // ✅ RECORD USER SESSION + FRAUD DATA
      await callLoginEdgeFunction(data.user.id);

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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: wp('6%'), // ✅ UPDATED
    justifyContent: 'center',
  },

  logo: {
    width: wp('30%'), // ✅ UPDATED
    height: wp('30%'), // ✅ UPDATED
    alignSelf: 'center',
    marginTop: -hp('6%'), // ✅ UPDATED
    marginBottom: hp('3%'), // ✅ UPDATED
  },

  welcome: {
    fontSize: moderateScale(22), // ✅ UPDATED
    color: '#fff',
    textAlign: 'center',
    marginBottom: hp('3%'), // ✅ UPDATED
    marginTop: -hp('2%'), // ✅ UPDATED
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingVertical: hp('1.8%'), // ✅ UPDATED
    paddingHorizontal: wp('4%'), // ✅ UPDATED
    borderRadius: wp('2%'), // ✅ UPDATED
    marginBottom: hp('1.5%'), // ✅ UPDATED
    fontSize: moderateScale(14), // ✅ UPDATED
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: wp('2%'), // ✅ UPDATED
    paddingHorizontal: wp('4%'), // ✅ UPDATED
    marginBottom: hp('1.5%'), // ✅ UPDATED
  },

  inputPassword: {
    flex: 1,
    paddingVertical: hp('1.8%'), // ✅ UPDATED
    color: '#fff',
    fontSize: moderateScale(14), // ✅ UPDATED
  },

  rememberMe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('1.5%'), // ✅ UPDATED
    alignItems: 'center', // ✅ UPDATED
  },

  rememberMeText: {
    fontSize: moderateScale(13), // ✅ UPDATED
    color: '#ccc',
  },

  button: {
    backgroundColor: '#ce990a',
    paddingVertical: hp('2%'), // ✅ UPDATED
    borderRadius: wp('2%'), // ✅ UPDATED
    alignItems: 'center',
    marginBottom: hp('2%'), // ✅ UPDATED
  },

  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: moderateScale(16), // ✅ UPDATED
  },

  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: hp('2%'), // ✅ UPDATED
    borderRadius: wp('2%'), // ✅ UPDATED
    alignItems: 'center',
    marginBottom: hp('2%'), // ✅ UPDATED
  },

  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  googleLogo: {
    width: wp('5%'), // ✅ UPDATED
    height: wp('5%'), // ✅ UPDATED
    marginRight: wp('3%'), // ✅ UPDATED
  },

  googleButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: moderateScale(15), // ✅ UPDATED
  },

  toggleText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: hp('2%'), // ✅ UPDATED
    fontSize: moderateScale(13), // ✅ UPDATED
  },

  termsText: {
    color: '#ce990a',
    textAlign: 'center',
    fontSize: moderateScale(12), // ✅ UPDATED
    marginBottom: hp('2.5%'), // ✅ UPDATED
    textDecorationLine: 'underline',
  },

  forgotText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: moderateScale(12), // ✅ UPDATED
    textDecorationLine: 'underline',
    marginBottom: hp('2%'), // ✅ UPDATED
  },
});

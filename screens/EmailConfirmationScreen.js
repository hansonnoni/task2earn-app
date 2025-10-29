// screens/EmailConfirmationScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import Toast from 'react-native-toast-message';

const RESEND_KEY = 'resendCooldownEnd';

export default function EmailConfirmationScreen({ route }) {
  const navigation = useNavigation();
  const email = route?.params?.email ?? '';
  const fromSignup = route?.params?.fromSignup ?? false;

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  // 🧠 Restore persistent resend cooldown
  useEffect(() => {
    const restoreCooldown = async () => {
      try {
        const saved = await AsyncStorage.getItem(RESEND_KEY);
        if (saved) {
          const endTime = parseInt(saved, 10);
          const remaining = Math.floor((endTime - Date.now()) / 1000);
          if (remaining > 0) startCountdownFrom(endTime);
          else await AsyncStorage.removeItem(RESEND_KEY);
        } else if (fromSignup) {
          // 🕒 Start initial 60s cooldown right after signup
          await startCooldown(60);
        }
      } catch (err) {
        console.error('restoreCooldown error:', err);
      }
    };
    restoreCooldown();
    return () => clearTimer();
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startCountdownFrom = (endTime) => {
    clearTimer();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setCooldown(remaining);
      if (remaining <= 0) {
        clearTimer();
        AsyncStorage.removeItem(RESEND_KEY).catch(() => {});
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  };

  const startCooldown = async (seconds = 60) => {
    try {
      const endTime = Date.now() + seconds * 1000;
      await AsyncStorage.setItem(RESEND_KEY, endTime.toString());
      startCountdownFrom(endTime);
    } catch (err) {
      console.error('startCooldown error:', err);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No email found. Please try again.',
      });
      return;
    }

    if (cooldown > 0) {
      Toast.show({
        type: 'info',
        text1: 'Please wait',
        text2: `You can resend after ${cooldown}s.`,
      });
      return;
    }

    try {
      setResending(true);
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        if (error.message.includes('60 seconds')) {
          Toast.show({
            type: 'info',
            text1: 'Please wait',
            text2: 'You can only request a new link after 60 seconds.',
          });
          await startCooldown(60);
          return;
        }
        throw error;
      }

      Toast.show({
        type: 'success',
        text1: 'Confirmation link sent',
        text2: 'Check your inbox or spam folder.',
      });

      await startCooldown(60);
    } catch (err) {
      console.error('Resend error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Try again later',
      });
    } finally {
      setResending(false);
    }
  };

  const handleConfirmed = () => {
    Toast.show({
      type: 'info',
      text1: 'If your email is confirmed, please log in now.',
    });

    setTimeout(() => {
      clearTimer();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm your email</Text>

      {fromSignup ? (
        // 🟢 Signup flow
        <>
          <Text style={styles.subtitle}>We sent a confirmation link to:</Text>
          <Text style={styles.email}>{email}</Text>

          {/* No resend visible, countdown happens silently */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConfirmed}
          >
            <Text style={styles.primaryButtonText}>I have confirmed</Text>
          </TouchableOpacity>

          <Text style={styles.helper}>
            After clicking the link in your email,
            {'\n'}tap "I have confirmed" to return to Login.
          </Text>
        </>
      ) : (
        // 🔵 Login flow
        <>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (resending || cooldown > 0) && styles.disabledButton,
            ]}
            onPress={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend Confirmation Link'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConfirmed}
          >
            <Text style={styles.primaryButtonText}>I have confirmed</Text>
          </TouchableOpacity>

          <Text style={styles.helper}>
            After clicking the link in your email,
            {'\n'}tap "I have confirmed" to return to Login.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 6,
  },
  email: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '700',
  },
  helper: {
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

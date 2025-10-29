// screens/SignupScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Dimensions, Image,
} from 'react-native';
import { supabase } from '../supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const onboardingSlides = [
  { title: 'Earn Daily 😑', description: 'Complete simple tasks 💸 like following, sharing, and streaming to earn money!💰' },
  { title: 'Instant Withdrawal 💸', description: 'Withdraw your earnings from wallet💲to Bank Account 🏦 once you reach the limit.' },
  { title: 'Invite & Earn 💰', description: 'Refer your friends and earn bonuses for each successful sign-up.' },
];

export default function SignupScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState({});
  const scrollViewRef = useRef(null);
  const autoScrollInterval = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // ✅ ADDED SECTION — to fix deleted user session issue
  // ----------------------------------------------------
  useEffect(() => {
  const resetAuth = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('token');
  };
  resetAuth();
}, []);

  // ----------------------------------------------------

  const startAutoScroll = () => {
    autoScrollInterval.current = setInterval(() => {
      if (!isUserScrolling && scrollViewRef.current) {
        let nextIndex = currentSlide + 1;
        if (nextIndex >= onboardingSlides.length) nextIndex = 0;
        scrollViewRef.current.scrollTo({ x: nextIndex * Dimensions.get('window').width, animated: true });
        setCurrentSlide(nextIndex);
      }
    }, 3000);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
  };

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [currentSlide, isUserScrolling]);

  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
    setCurrentSlide(index);
  };

  const handleScrollBeginDrag = () => setIsUserScrolling(true);
  const handleScrollEndDrag = () => setIsUserScrolling(false);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm your password';
    if (password && confirmPassword && password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 📌 Email/Password Signup
const handleSignup = async () => {
  if (!validate()) return;

  setIsLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          referred_by: referralCode || 'system-default', // ✅ Custom metadata
        },
        emailRedirectTo: 'https://yourapp.com/auth/callback', // optional web redirect for confirmation link
      },
    });

      // 🟡 Handle already registered but unconfirmed case
    if (error) {
  if (error.message.toLowerCase().includes('user already registered')) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser?.email_confirmed_at) {
      Toast.show({
        type: 'info',
        text1: 'Email already registered and confirmed.',
      });
      navigation.replace('Login');
    } else {
      Toast.show({
        type: 'info',
        text1: 'Email already registered but not confirmed.',
        text2: 'Please check your email or resend confirmation link.',
      });
      navigation.replace('EmailConfirmation', { email, password, fromSignup: true });
    }
    setIsLoading(false);
    return;
  }
  throw error;
}

    // 🟢 Success — confirmation email sent automatically by Supabase
    Toast.show({
      type: 'success',
      text1: 'Signup successful!',
      text2: 'Please check your email to confirm your account.',
    });

    // Redirect user to email confirmation screen
    navigation.replace('EmailConfirmation', { email, fromSignup: true });
  } catch (err) {
    Toast.show({
      type: 'error',
      text1: err.message || 'Signup failed',
    });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        ref={scrollViewRef}
        style={styles.carousel}
      >
        {onboardingSlides.map((slide, index) => (
          <View style={styles.slide} key={index}>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {onboardingSlides.map((_, i) => (
          <View key={i} style={[styles.dot, currentSlide === i && styles.activeDot]} />
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

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
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#aaa" />
        </TouchableOpacity>
      </View>
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

      {/* Referral Code Input */}
      <TextInput
        style={styles.input}
        placeholder="Referral Code (Optional)"
        placeholderTextColor="#aaa"
        value={referralCode}
        onChangeText={setReferralCode}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('TermsPrivacy')}>
        <Text style={styles.termsText}>
          By signing up, you agree to our <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.toggleText}>Already have an account? Login</Text>
      </TouchableOpacity>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 25, paddingTop: 8 },
  logo: { width: 120, height: 120, alignSelf: 'center', marginTop: -15, marginBottom: 0 },
  carousel: { height: 140, marginBottom: -25 },
  slide: { width: Dimensions.get('window').width - 25, justifyContent: 'center', alignItems: 'center', padding: 12 },
  slideTitle: { color: '#ce990a', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  slideDescription: { color: '#fff', fontSize: 14, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#555', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#ce990a' },
  input: { backgroundColor: '#1a1a1a', color: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 5 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: 5, paddingHorizontal: 12 },
  inputPassword: { flex: 1, color: '#fff', paddingVertical: 10 },
  button: { backgroundColor: '#ce990a', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16, marginTop: 10 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  termsText: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 15 },
  termsLink: { color: '#ce990a', fontWeight: 'bold' },
  toggleText: { color: '#ce990a', textAlign: 'center', fontWeight: 'bold', marginBottom: 80 },
  errorText: { color: 'red', fontSize: 15, marginBottom: 5, marginLeft: 4 },
});

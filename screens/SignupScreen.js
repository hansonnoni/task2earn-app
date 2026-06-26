// screens/SignupScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ UPDATED
import { supabase } from '../supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ UPDATED
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen'; // ✅ UPDATED
import { moderateScale } from 'react-native-size-matters'; // ✅ UPDATED

const SCREEN_WIDTH = Dimensions.get('window').width; // ✅ UPDATED

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
  useEffect(() => {
    const resetAuth = async () => {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('token');
    };
    resetAuth();
  }, []);

  const startAutoScroll = () => {
    autoScrollInterval.current = setInterval(() => {
      if (!isUserScrolling && scrollViewRef.current) {
        let nextIndex = currentSlide + 1;
        if (nextIndex >= onboardingSlides.length) nextIndex = 0;
        scrollViewRef.current.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true }); // ✅ UPDATED
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
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH); // ✅ UPDATED
    setCurrentSlide(index);
  };

  const handleScrollBeginDrag = () => setIsUserScrolling(true);
  const handleScrollEndDrag = () => setIsUserScrolling(false);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm your password';
    if (password && confirmPassword && password !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { referred_by: referralCode || 'system-default' },
          emailRedirectTo: 'https://yourapp.com/auth/callback',
        },
      });

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

      Toast.show({
        type: 'success',
        text1: 'Signup successful!',
        text2: 'Please check your email to confirm your account.',
      });

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
    <SafeAreaView style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />

      <View style={{ alignItems: 'center' }}>
  <ScrollView
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    onScroll={handleScroll}
    onScrollBeginDrag={handleScrollBeginDrag}
    onScrollEndDrag={handleScrollEndDrag}
    ref={scrollViewRef}
  >
    {onboardingSlides.map((slide, index) => (
      <View style={styles.slide} key={index}>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideDescription}>{slide.description}</Text>
      </View>
    ))}
  </ScrollView>
</View>


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
    </SafeAreaView> 
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: wp('6%'), // ✅ UPDATED
    paddingTop: hp('1%'), // ✅ UPDATED
  },

  logo: {
    width: wp('28%'), // ✅ UPDATED
    height: wp('28%'), // ✅ UPDATED
    alignSelf: 'center',
    marginTop: -hp('2%'), // ✅ UPDATED
  },

  carousel: {
  height: hp('20%'), // increase height a bit for vertical centering
  marginBottom: hp('0%'), // remove negative margin
},

  slide: {
  width: wp('88%'), // ✅ slightly smaller than full width to allow padding
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: wp('6%'), // ✅ horizontal padding
  paddingVertical: hp('2%'), // ✅ vertical padding
},


  slideTitle: {
    color: '#ce990a',
    fontSize: moderateScale(20), // ✅ UPDATED
    fontWeight: 'bold',
    marginBottom: hp('1%'), // ✅ UPDATED
    textAlign: 'center',
  },

  slideDescription: {
  color: '#fff',
  fontSize: moderateScale(14),
  textAlign: 'center',
  flexWrap: 'wrap', // ✅ ensure text wraps
},

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: hp('2%'), // ✅ UPDATED
  },

  dot: {
    width: wp('2%'), // ✅ UPDATED
    height: wp('2%'), // ✅ UPDATED
    borderRadius: wp('1%'), // ✅ UPDATED
    backgroundColor: '#555',
    marginHorizontal: wp('1%'), // ✅ UPDATED
  },

  activeDot: {
    backgroundColor: '#ce990a',
  },

  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: wp('4%'), // ✅ UPDATED
    paddingVertical: hp('1.6%'), // ✅ UPDATED
    borderRadius: wp('2%'), // ✅ UPDATED
    marginBottom: hp('0.8%'), // ✅ UPDATED
    fontSize: moderateScale(14), // ✅ UPDATED
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: wp('2%'), // ✅ UPDATED
    marginBottom: hp('0.8%'), // ✅ UPDATED
    paddingHorizontal: wp('4%'), // ✅ UPDATED
  },

  inputPassword: {
    flex: 1,
    color: '#fff',
    paddingVertical: hp('1.6%'), // ✅ UPDATED
    fontSize: moderateScale(14), // ✅ UPDATED
  },

  button: {
    backgroundColor: '#ce990a',
    paddingVertical: hp('2%'), // ✅ UPDATED
    borderRadius: wp('2%'), // ✅ UPDATED
    alignItems: 'center',
    marginBottom: hp('2%'), // ✅ UPDATED
    marginTop: hp('1%'), // ✅ UPDATED
  },

  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: moderateScale(16), // ✅ UPDATED
  },

  termsText: {
    color: '#fff',
    fontSize: moderateScale(13), // ✅ UPDATED
    textAlign: 'center',
    marginBottom: hp('2%'), // ✅ UPDATED
  },

  termsLink: {
    color: '#ce990a',
    fontWeight: 'bold',
  },

  toggleText: {
    color: '#ce990a',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: hp('8%'), // ✅ UPDATED
    fontSize: moderateScale(14), // ✅ UPDATED
  },

  errorText: {
    color: 'red',
    fontSize: moderateScale(12), // ✅ UPDATED
    marginBottom: hp('0.5%'), // ✅ UPDATED
    marginLeft: wp('1%'), // ✅ UPDATED
  },
});

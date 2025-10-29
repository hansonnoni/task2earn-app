import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { supabase } from '../supabase';

export default function SplashScreen({ navigation }) {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
  // Animate fade out immediately
  Animated.timing(opacityAnim, {
    toValue: 0,
    duration: 4000,
    useNativeDriver: true,
  }).start();

  // Check session and navigate safely after 4s (matches animation)
  const checkSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (navigation && navigation.replace) { // safe check
        if (session) {
          navigation.replace('MainApp');
        } else {
          navigation.replace('Login');
        }
      }
    } catch (error) {
      console.log('SplashScreen navigation error:', error);
    }
  };

  const timer = setTimeout(() => {
    checkSession();
  }, 4000);

  return () => clearTimeout(timer); // cleanup on unmount
}, [navigation, opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/task2earn-logo.png')}
        style={[styles.logo, { opacity: opacityAnim }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // solid black background
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 300,
  },
});

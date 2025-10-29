// screens/WalletScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

export default function WalletScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localBalance, setLocalBalance] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);

      const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn('User fetch warning:', userError?.message || 'No active session');
        setLoading(false);
        setUserProfile(null);
        return;
      }

      // fetch balance + currency info directly from users table
      const { data, error } = await supabase
        .from('users')
        .select('balance, currency_symbol, exchange_rate_to_usd, task_multiplier')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        setUserProfile(null);
      } else if (data) {
        setUserProfile(data);

        // Convert balance (which you store in USD internally) to local currency
        const local = (data.balance || 0) * (data.exchange_rate_to_usd || 1) * (data.task_multiplier || 1);
        setLocalBalance(local.toFixed(2));
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          Wallet info unavailable. Please verify your email.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.balanceLabel}>Wallet Balance</Text>
      <Text style={styles.balanceAmount}>
        {userProfile.currency_symbol || ''}{localBalance || '0'}
      </Text>

      <TouchableOpacity
        style={styles.withdrawButton}
        onPress={() => navigation.navigate('Withdraw')}
      >
        <Text style={styles.withdrawText}>Withdraw Funds</Text>
      </TouchableOpacity>

      {/* 🚀 New Payment Method button */}
      <TouchableOpacity
        style={styles.paymentMethodButton}
        onPress={() => navigation.navigate('PaymentMethods')}
      >
        <Text style={styles.withdrawText}>Set Payment Method</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 20,
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 18,
    color: '#ADD8E6',
    textAlign: 'center',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 30,
  },
  withdrawButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  withdrawText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  paymentMethodButton: {
    backgroundColor: '#32CD32', // green button
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
});

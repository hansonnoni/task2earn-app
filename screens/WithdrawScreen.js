// screens/WithdrawScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../supabase';

export default function WithdrawScreen({ navigation }) {
  const [balance, setBalance] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null); // default payment method
  const [successWithdraw, setSuccessWithdraw] = useState(null); // new success state

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn('No active session:', userError?.message);
        setLoading(false);
        return;
      }

      // Fetch user balance & currency
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('balance, currency_symbol, exchange_rate_to_usd, task_multiplier')
        .eq('id', user.id)
        .single();

      if (userDataError) console.error('Error fetching balance:', userDataError.message);
      else if (userData) {
        const local = (userData.balance || 0) * (userData.exchange_rate_to_usd || 1) * (userData.task_multiplier || 1);
        setBalance(parseFloat(local.toFixed(2)));
        setCurrencySymbol(userData.currency_symbol || '$');
      }

      // Fetch default payment method
      const { data: methods, error: methodError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (methodError) console.warn('No default payment method:', methodError.message);
      else if (methods) setMethod(methods);

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleWithdraw = () => {
    const amountNum = parseFloat(amount);

    if (!amount || !method) {
      return alert('Please enter an amount and set a default payment method.');
    } 
    if (isNaN(amountNum) || amountNum <= 0) {
      return alert('Enter a valid withdrawal amount.');
    } 
    if (amountNum > balance) {
      return alert('You don’t have enough balance.');
    }

    // TODO: save withdrawal request to Supabase withdrawals table

    // Update balance locally and show success view
    const newBalance = parseFloat((balance - amountNum).toFixed(2));
    setBalance(newBalance);
    setSuccessWithdraw({
      amount: amountNum,
      method: method.method.toUpperCase(),
      newBalance,
    });

    // Clear input
    setAmount('');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Wallet Balance</Text>
      <Text style={styles.balance}>{currencySymbol}{balance}</Text>

      <Text style={styles.label}>Amount to Withdraw</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {method ? (
        <View style={styles.methodContainer}>
          <Text style={styles.label}>Payment Method ({method.method.toUpperCase()})</Text>
          {method.method === 'bank' && (
            <>
              <TextInput style={styles.input} value={method.extra?.bank_name || ''} editable={false} />
              <TextInput style={styles.input} value={method.extra?.account_name || ''} editable={false} />
              <TextInput style={styles.input} value={method.identifier} editable={false} />
            </>
          )}
          {method.method === 'paypal' && <TextInput style={styles.input} value={method.identifier} editable={false} />}
          {method.method === 'crypto' && (
            <>
              <TextInput style={styles.input} value={method.extra?.crypto_type || ''} editable={false} />
              <TextInput style={styles.input} value={method.identifier} editable={false} />
            </>
          )}
          {method.method === 'airtime' && <TextInput style={styles.input} value={method.identifier} editable={false} />}
        </View>
      ) : (
        <Text style={{ color: '#FFD700', marginVertical: 10 }}>
          No default payment method set. Please set it first in Payment Methods screen.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, !method && { backgroundColor: '#666' }]}
        onPress={handleWithdraw}
        disabled={!method}
      >
        <Text style={styles.buttonText}>Withdraw</Text>
      </TouchableOpacity>

      {successWithdraw && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✅ {currencySymbol}{successWithdraw.amount} withdrawn via {successWithdraw.method}
          </Text>
          <Text style={styles.successText}>New Balance: {currencySymbol}{successWithdraw.newBalance}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSuccessWithdraw(null)}>
            <Text style={{ color: '#000', fontWeight: 'bold' }}>OK</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e', padding: 20, paddingTop: 60 },
  header: { fontSize: 20, color: '#fff', marginBottom: 8 },
  balance: { fontSize: 28, fontWeight: 'bold', color: '#00C853', marginBottom: 24 },
  label: { color: '#bbb', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#2c2c2c', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 16 },
  methodContainer: { marginBottom: 20 },
  button: { backgroundColor: '#00C853', padding: 15, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#000', fontWeight: 'bold', textAlign: 'center' },
  successBox: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  successText: { color: '#000', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  closeBtn: {
    backgroundColor: '#00C853',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});

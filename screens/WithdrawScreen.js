// screens/WithdrawScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../supabase';

export default function WithdrawScreen() {
  const [availableBalance, setAvailableBalance] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);

  const [withdrawals, setWithdrawals] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const PAGE_SIZE = 10;
  const SUPABASE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;

  /* ---------------- FETCH USER DATA ---------------- */
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // User balance
    const { data: userData } = await supabase
      .from('users')
      .select('available_balance, currency_symbol')
      .eq('id', user.id)
      .single();

    setAvailableBalance(userData?.available_balance || 0);
    setCurrencySymbol(userData?.currency_symbol || '$');

    // Default payment method
    const { data: methodData } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    setMethod(methodData || null);
  }, []);

  /* ---------------- FETCH WITHDRAWAL HISTORY ---------------- */
  const fetchWithdrawals = useCallback(async (reset = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const userId = user.id;

    if (reset) {
      setHistoryLoading(true);
      setPage(0);
    } else {
      setHistoryLoading(true);
    }

    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('withdrawals')
      .select('id, amount, currency, status, created_at, paid_at, processor_ref')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Withdrawal history error:', error);
      setHistoryLoading(false);
      return;
    }

    if (reset) {
      setWithdrawals(data || []);
    } else {
      setWithdrawals(prev => [...prev, ...(data || [])]);
    }

    setHasMore(data?.length === PAGE_SIZE);
    setHistoryLoading(false);
    setLoading(false);
  }, [page]);

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    fetchUserData();
    fetchWithdrawals(true);
  }, []);

  useEffect(() => {
    if (page === 0) return; // already fetched on initial load
    fetchWithdrawals();
  }, [page]);

  /* ---------------- PULL-TO-REFRESH ---------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchWithdrawals(true);
    setRefreshing(false);
  };

  /* ---------------- WITHDRAW ---------------- */
const handleWithdraw = async () => {
  const amountNum = parseFloat(amount);

  // Validation
  if (!method || !amountNum) {
    if (Platform.OS === 'web') {
      window.alert('Enter amount and select payment method');
    } else {
      Alert.alert('Error', 'Enter amount and select payment method');
    }
    return;
  }

  if (amountNum > availableBalance) {
    if (Platform.OS === 'web') {
      window.alert('Insufficient balance');
    } else {
      Alert.alert('Error', 'Insufficient balance');
    }
    return;
  }

  try {
    setSubmitting(true);

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User session not found');
    }

    console.log('Sending withdrawal request...');

    // Call Edge Function
    const res = await fetch(
      `${SUPABASE_FUNCTION_URL}/request_withdrawal`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountNum,
          payment_method_id: method.id,
        }),
      }
    );

    // Parse response safely
    let data = {};

    try {
      data = await res.json();
    } catch (e) {
      console.log('Response is not JSON');
    }

    console.log('Withdrawal response:', data);

    // Handle error response
    if (!res.ok) {
      throw new Error(
        data?.error || 'Withdrawal request failed'
      );
    }

    // SUCCESS
    if (Platform.OS === 'web') {
      window.alert(
        `Withdrawal Submitted\nStatus: ${String(
          data.status || 'pending'
        ).toUpperCase()}`
      );
    } else {
      Alert.alert(
        'Withdrawal Submitted',
        `Status: ${String(
          data.status || 'pending'
        ).toUpperCase()}`
      );
    }

    // Reset form
    setAmount('');

    // Refresh data
    await fetchUserData();
    await fetchWithdrawals(true);

  } catch (err) {
    console.error('Withdrawal error:', err);

    if (Platform.OS === 'web') {
      window.alert(
        err.message || 'Withdrawal failed'
      );
    } else {
      Alert.alert(
        'Withdrawal Failed',
        err.message || 'Withdrawal failed'
      );
    }

  } finally {
    setSubmitting(false);
  }
};

  /* ---------------- RENDER WITHDRAWAL ITEM ---------------- */
  const renderItem = ({ item: w }) => (
    <View key={w.id} style={styles.historyItem}>
      <Text style={styles.historyAmount}>
        {currencySymbol}{w.amount}
      </Text>

      <Text style={[styles.status, styles[`status_${w.status}`]]}>
        {w.status.toUpperCase()}
      </Text>

      <Text style={styles.date}>
        {new Date(w.created_at).toLocaleDateString()}
      </Text>

      {w.status === 'paid' && (
        <Text style={styles.ref}>
          Ref: {w.processor_ref}
        </Text>
      )}
    </View>
  );

  /* ---------------- LOAD MORE ---------------- */
  const loadMore = () => {
    if (hasMore && !historyLoading) {
      setPage(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!method && (
        <Text style={styles.noMethodNotice}>
          ⚠ You must set a payment method before withdrawing, go to Wallet to set payment method.
        </Text>
      )}

      <Text style={styles.header}>Available Balance</Text>
      <Text style={styles.balance}>{currencySymbol}{availableBalance}</Text>

      <Text style={styles.label}>Withdraw Amount</Text>
      <TextInput
        style={[styles.input, !method && { backgroundColor: '#3a3a3a' }]}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        editable={!!method}
      />

      <TouchableOpacity
        style={[styles.button, (!method || submitting) && { opacity: 0.6 }]}
        onPress={handleWithdraw}
        disabled={!method || submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Withdraw</Text>}
      </TouchableOpacity>

      <Text style={styles.historyTitle}>Withdrawal History</Text>

      {withdrawals.length === 0 && !historyLoading ? (
        <Text style={styles.empty}>No withdrawals yet</Text>
      ) : (
        <FlatList
          data={withdrawals}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListFooterComponent={historyLoading ? <ActivityIndicator color="#00C853" style={{ marginVertical: 12 }} /> : null}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e', padding: 20, paddingTop: 60 },
  noMethodNotice: { color: '#FFC107', marginBottom: 10, textAlign: 'center' },
  header: { color: '#fff', fontSize: 18 },
  balance: { color: '#00C853', fontSize: 30, marginBottom: 20 },
  label: { color: '#bbb', marginBottom: 6 },
  input: { backgroundColor: '#2c2c2c', color: '#fff', padding: 12, borderRadius: 8 },
  button: { backgroundColor: '#00C853', padding: 15, borderRadius: 8, marginTop: 15 },
  buttonText: { textAlign: 'center', fontWeight: 'bold' },

  historyTitle: { color: '#fff', fontSize: 18, marginTop: 30, marginBottom: 10 },
  empty: { color: '#888', textAlign: 'center' },

  historyItem: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },

  historyAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  date: { color: '#888', fontSize: 12 },

  status: { fontWeight: 'bold', marginTop: 4 },
  status_pending: { color: '#FFC107' },
  status_held: { color: '#FFC107' },
  status_approved: { color: '#03A9F4' },
  status_paid: { color: '#00E676' },
  status_rejected: { color: '#FF5252' },

  ref: { color: '#aaa', fontSize: 12 }
});
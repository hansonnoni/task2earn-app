// screens/WalletScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { supabase } from '../supabase';
import CountdownTimer from '../components/CountdownTimer';

export default function WalletScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [localAvailable, setLocalAvailable] = useState("0.00");
  const [localPending, setLocalPending] = useState("0.00");
  const [localTotal, setLocalTotal] = useState("0.00");

  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('credited'); // Credited or Pending
  const PAGE_SIZE = 20; // Load 20 transactions per page

  // ==============================
  // Fetch wallet and transactions
  // ==============================
  const fetchWalletAndTransactions = async ({ reset = false, pageNum = 0 }) => {
    if (logsLoading) return;
    setLogsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const userId = user.id;

    // Wallet data (only fetch for first page or reset)
    if (reset || pageNum === 0) {
      const { data: walletData } = await supabase
        .from('users')
        .select(`pending_balance, available_balance, currency_symbol`)
        .eq('id', userId)
        .single();

      if (walletData) {
        setUserProfile(walletData);
        const avail = Number(walletData.available_balance || 0);
const pend = Number(walletData.pending_balance || 0);

setLocalAvailable(avail.toFixed(2));
setLocalPending(pend.toFixed(2));
setLocalTotal((avail + pend).toFixed(2));
      }
    }

    // Transactions with pagination
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: txData } = await supabase
      .from('wallet_transactions')
      .select(`*, social_submissions!inner(task_id, pending_release_at)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (reset) {
      setTransactions(txData || []);
    } else {
      setTransactions(prev => [...prev, ...(txData || [])]);
    }

    setHasMore(txData?.length === PAGE_SIZE);
    setLogsLoading(false);
    setLoading(false);
  };

  // ==============================
  // Pull-to-refresh
  // ==============================
  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await fetchWalletAndTransactions({ reset: true, pageNum: 0 });
    setRefreshing(false);
  };

  // ==============================
  // Infinite scroll
  // ==============================
  const loadMore = async () => {
    if (!hasMore || logsLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchWalletAndTransactions({ pageNum: nextPage });
  };

  // ==============================
  // Fetch on tab change
  // ==============================
  useEffect(() => {
    setPage(0);
    fetchWalletAndTransactions({ reset: true, pageNum: 0 });
  }, [activeTab]);

  // ==============================
  // Real-time updates
  // ==============================
  useEffect(() => {
    let walletChannel = null;
    let logsChannel = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;

      // Wallet updates
      walletChannel = supabase
        .channel('wallet-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
          payload => {
            const updated = payload.new;
            setLocalAvailable(Number(updated.available_balance || 0).toFixed(2));
setLocalPending(Number(updated.pending_balance || 0).toFixed(2));
setLocalTotal((Number(updated.available_balance || 0) + Number(updated.pending_balance || 0)).toFixed(2));
          }
        )
        .subscribe();

      // Transaction insert
      logsChannel = supabase
        .channel('wallet-logs')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
          payload => setTransactions(prev => [payload.new, ...prev])
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (walletChannel) supabase.removeChannel(walletChannel);
      if (logsChannel) supabase.removeChannel(logsChannel);
    };
  }, []);

  // ==============================
  // Render transaction item
  // ==============================
  const renderItem = ({ item: tx }) => {
    const formattedAmount = Number(tx.amount || 0).toFixed(2);
    const taskUUID = tx.social_submissions?.task_id || "";
    const last4 = taskUUID.slice(-4);
    const displayTaskId = last4 ? `T2E-${last4}` : "N/A";

    return (
      <View style={styles.logItem}>
        <Text style={styles.logType}>{userProfile.currency_symbol}{formattedAmount}</Text>
        <Text style={styles.taskId}>Task ID: {displayTaskId}</Text>
        <Text style={styles.logNote}>{tx.note || tx.type}</Text>
        {activeTab === 'pending' && tx.social_submissions?.pending_release_at && (
          <CountdownTimer until={tx.social_submissions.pending_release_at} style={{ color: '#FFD700', marginTop: 4 }} />
        )}
        <Text style={styles.logDate}>{new Date(tx.created_at).toLocaleString()}</Text>
      </View>
    );
  };

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
        <Text style={{ color: '#fff', textAlign: 'center' }}>Wallet info unavailable.</Text>
      </View>
    );
  }

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'credited') return tx.type === 'pending_release';
    if (activeTab === 'pending') return tx.type === 'pending_credit';
    return false;
  });

  return (
    <View style={styles.container}>
      {/* WALLET HEADER */}
      <View style={styles.balanceContainer}>
        <View style={styles.totalBalanceWrapper}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{userProfile.currency_symbol}{localTotal}</Text>
        </View>

        <View style={styles.sideBalances}>
          <View style={styles.balanceBox}>
            <Text style={styles.sectionLabel}>Available Balance</Text>
            <Text style={styles.sectionAmount}>{userProfile.currency_symbol}{localAvailable}</Text>
          </View>

          <View style={styles.balanceBox}>
            <Text style={styles.sectionLabel}>Pending Balance</Text>
            <Text style={styles.sectionAmount}>{userProfile.currency_symbol}{localPending}</Text>
          </View>
        </View>
      </View>

      {/* BUTTONS */}
      <TouchableOpacity style={styles.withdrawButton} onPress={() => navigation.navigate('Withdraw')}>
        <Text style={styles.withdrawText}>Withdraw Funds</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.paymentMethodButton} onPress={() => navigation.navigate('PaymentMethods')}>
        <Text style={styles.withdrawText}>Set Payment Method</Text>
      </TouchableOpacity>

      {/* TAB SWITCHER */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'credited' && styles.activeTab]} onPress={() => setActiveTab('credited')}>
          <Text style={styles.tabText}>Credited</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={styles.tabText}>Pending</Text>
        </TouchableOpacity>
      </View>

      {/* TRANSACTIONS LIST */}
      {filteredTransactions.length === 0 && logsLoading ? (
        <ActivityIndicator color="#FFD700" />
      ) : filteredTransactions.length === 0 ? (
        <Text style={{ color: '#888', marginTop: 20 }}>No transactions found.</Text>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
          style={{ backgroundColor: '#1e1e1e' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListFooterComponent={hasMore ? <ActivityIndicator color="#FFD700" style={{ marginVertical: 12 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },

  // Wallet header
  balanceContainer: { marginTop: 20, marginBottom: 30 },
  totalBalanceWrapper: { alignItems: 'center', marginBottom: 30 },
  sideBalances: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  balanceBox: { flex: 1, alignItems: 'flex-end', marginHorizontal: 5 },

  balanceLabel: { fontSize: 18, color: '#ADD8E6', textAlign: 'center' },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#FFD700', textAlign: 'center' },
  sectionLabel: { fontSize: 16, color: '#ADD8E6', marginBottom: 5 },
  sectionAmount: { fontSize: 26, fontWeight: 'bold', color: '#FFD700' },

  // Buttons
  withdrawButton: { backgroundColor: '#2196F3', paddingVertical: 14, borderRadius: 10, marginTop: 10, marginHorizontal: 20 },
  paymentMethodButton: { backgroundColor: '#32CD32', paddingVertical: 14, borderRadius: 10, marginTop: 10, marginHorizontal: 20 },
  withdrawText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },

  // Tabs
  tabContainer: { flexDirection: 'row', marginTop: 40, marginBottom: 20, backgroundColor: '#2b2b2b', borderRadius: 10 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#FFD700', borderRadius: 10 },
  tabText: { color: '#fff', fontWeight: 'bold' },

  // Transaction log
  logItem: { backgroundColor: '#2b2b2b', padding: 12, borderRadius: 10, marginTop: 12 },
  logType: { fontSize: 16, color: '#FFD700', fontWeight: 'bold' },
  taskId: { color: '#ADD8E6', fontSize: 12, marginTop: 4 },
  logNote: { color: '#ccc' },
  logDate: { color: '#888', fontSize: 12, marginTop: 4 },
});
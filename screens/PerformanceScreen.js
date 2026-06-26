// screens/PerformanceScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { supabase } from "../supabase"; // adjust if your path differs
import { useFocusEffect } from "@react-navigation/native";

export default function PerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [performance, setPerformance] = useState(null);

  // Fetch user performance from Supabase
  const fetchPerformance = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("Supabase Auth Error:", userError);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(`
          total_earned,
          pending_withdrawals,
          completed_withdrawals,
          tasks_completed,
          referrals_count,
          currency_symbol
        `)
        .eq("id", user.id)
        .single();

      if (error) {
        console.log("Performance Fetch Error:", error);
        return;
      }

      setPerformance(data);
    } catch (err) {
      console.log("Unexpected Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPerformance();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPerformance();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!performance) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ fontSize: 16 }}>No performance data available</Text>
      </View>
    );
  }

  // Helper to format numbers
  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString();
  };

  const currency = performance.currency_symbol || "₦";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Performance Overview</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Total Earned</Text>
        <Text style={styles.value}>
          {currency} {formatAmount(performance.total_earned)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Pending Withdrawals</Text>
        <Text style={styles.value}>
          {currency} {formatAmount(performance.pending_withdrawals)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Completed Withdrawals</Text>
        <Text style={styles.value}>
          {currency} {formatAmount(performance.completed_withdrawals)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Tasks Completed</Text>
        <Text style={styles.value}>
          {formatAmount(performance.tasks_completed)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Referrals</Text>
        <Text style={styles.value}>
          {formatAmount(performance.referrals_count)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#000",
    flexGrow: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#FFD700",
  },
  card: {
    backgroundColor: "#ad9f9f",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
    color: "#FFD700",
  },
});
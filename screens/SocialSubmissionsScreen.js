import React, { useCallback, useState } from "react"; // 🔥 UPDATED (removed useRef)
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl, // 🔥 UPDATED (removed ScrollView, Animated, Dimensions)
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase";

// ❌ REMOVED SCREEN_WIDTH
const PAGE_SIZE = 20;

const SocialSubmissionsScreen = ({ navigation }) => {
  const [submissions, setSubmissions] = useState([]);
  const [currency, setCurrency] = useState("₦");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Submitted");

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // 🔥 NEW

  // ❌ REMOVED tabUnderline
  // ❌ REMOVED tabScrollRef

  const tabs = [
    { label: "Submitted" },
    { label: "Approved" },
    { label: "Rejected" },
  ];

  const getStatusStyle = (status) => {
  switch (status) {
    case "approved":
      return styles.approvedBadge;

    case "rejected":
      return styles.rejectedBadge;

    case "rejected_permanently":
      return styles.permanentRejectedBadge;

    default:
      return styles.pendingBadge;
  }
};

  const getCurrentUser = async () => {
    const { data: authData } = await supabase.auth.getUser();
    return authData?.user || null;
  };

  const fetchSubmissions = async ({ reset = false, pageNum = 0 } = {}) => {
    if (loadingMore) return;
    if (!hasMore && !reset) return;

    try {
      if (reset) {
        setLoading(true);
        setPage(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("social_submissions")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newData = data || [];

      if (reset) {
        setSubmissions(newData);
      } else {
        setSubmissions(prev => [...prev, ...newData]);
      }

      setHasMore(newData.length === PAGE_SIZE);
    } catch (err) {
      console.error("Pagination Error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSubmissions({ reset: true, pageNum: 0 });
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubmissions({ reset: true, pageNum: 0 });
    }, [])
  );

  const displayedList = submissions.filter((item) => {
  if (activeTab === "Submitted") {
    return (
      item.status === "pending" ||
      item.status === "submitted"
    );
  }

  if (activeTab === "Approved") {
    return item.status === "approved";
  }

  if (activeTab === "Rejected") {
    return (
      item.status === "rejected" ||
      item.status === "rejected_permanently"
    );
  }

  return false;
});

const renderItem = ({ item }) => {
  const isExpanded = expandedId === item.id;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.itemBox}
      onPress={() =>
        setExpandedId(isExpanded ? null : item.id) // 🔥 toggle
      }
    >
      {/* 🔥 ALWAYS VISIBLE */}
      <View style={styles.taskHeader}>
        <Text style={styles.taskId}>
          T2E-{String(item.task_id).slice(-4)}
        </Text>

        <Text style={styles.expandIcon}>
          {isExpanded ? "▲" : "▼"}
        </Text>
      </View>

      {/* 🔥 COLLAPSIBLE CONTENT */}
      {isExpanded && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Platform:</Text>
          <Text style={styles.value}>{item.platform}</Text>

          <Text style={styles.label}>Action:</Text>
          <Text style={styles.value}>{item.action_type}</Text>

          <Text style={styles.label}>Reward:</Text>
          <Text style={[styles.value, styles.gold]}>
            {currency}{item.reward}
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                getStatusStyle(item.status),
              ]}
            >
              <Text style={styles.statusText}>
  {item.status === "rejected_permanently"
    ? "FINAL REJECTION"
    : item.status?.toUpperCase()}
</Text>
            </View>
          </View>

          <Text style={styles.label}>Date & Time:</Text>
          <Text style={styles.value}>
            {new Date(item.created_at).toLocaleString()}
          </Text>

          <Text style={styles.label}>Attempt:</Text>
          <Text style={styles.value}>
            {item.attempt_number ?? 1}
          </Text>

          {(item.status === "rejected" ||
  item.status === "rejected_permanently") &&
  item.rejection_reason && (
              <>
                <Text style={styles.label}>
                  Rejection Reason:
                </Text>
                <Text
                  style={[
                    styles.value,
                    { color: "#ff6b6b" },
                  ]}
                >
                  {item.rejection_reason}
                </Text>
              </>
            )}

            {item.status === "rejected_permanently" && (
  <Text
    style={{
      color: "#ff9999",
      marginTop: 10,
      fontWeight: "bold",
    }}
  >
    ❌ This task can no longer be retried.
  </Text>
)}

          {item.notes && (
            <>
              <Text style={styles.label}>
                Admin Notes:
              </Text>
              <Text style={styles.value}>
                {item.notes}
              </Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Social Task Submissions</Text>

      {/* 🔥 UPDATED: Colored Pill Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;

          let backgroundColor = "#2a2a2a";
          if (tab.label === "Submitted")
            backgroundColor = isActive ? "#FFB300" : "#3a3000";
          if (tab.label === "Approved")
            backgroundColor = isActive ? "#00C853" : "#003d1f";
          if (tab.label === "Rejected")
            backgroundColor = isActive ? "#D50000" : "#3d0000";

          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tabButton, { backgroundColor }]} // 🔥 UPDATED
              onPress={() => setActiveTab(tab.label)} // 🔥 UPDATED
            >
              <Text style={styles.tabText}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={displayedList}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onEndReached={() => {
          if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchSubmissions({ pageNum: nextPage });
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color="#FFD700"
              style={{ marginVertical: 20 }}
            />
          ) : null
        }
        ListEmptyComponent={
          <Text style={{ color: "#ccc", textAlign: "center", marginTop: 40 }}>
            No submissions yet.
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: {
    fontSize: 22,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 15,
  },
  itemBox: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  label: { color: "#FFD700", fontWeight: "600", fontSize: 14 },
  value: { color: "#fff", fontSize: 15, marginBottom: 4 },
  gold: { color: "#FFD700", fontWeight: "bold" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  approvedBadge: { backgroundColor: "#00C853" },
  rejectedBadge: { backgroundColor: "#D50000" },
  permanentRejectedBadge: {
  backgroundColor: "#5a0000",
},
  pendingBadge: { backgroundColor: "#FFB300" },

  // 🔥 UPDATED TAB STYLES
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 4,
  },
  tabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  taskHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

taskId: {
  color: "#FFD700",
  fontSize: 18,
  fontWeight: "bold",
},

expandIcon: {
  color: "#aaa",
  fontSize: 14,
},
});

export default SocialSubmissionsScreen;
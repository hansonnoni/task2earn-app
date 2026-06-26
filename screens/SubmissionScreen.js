import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../supabase";

const SubmissionScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch authenticated user from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUser(data?.user || null);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const options = [
    {
      title: "Social Submissions",
      description: "View your social media task submissions.",
      icon: "share-alt",
      color: "#3b82f6",
      screen: "SocialSubmissionsScreen",
    },
    {
      title: "Spotify Submissions",
      description: "Check your Spotify task submissions.",
      icon: "spotify",
      color: "#22c55e",
      screen: "SpotifySubmissionScreen",
    },
    {
      title: "YouTube Submissions",
      description: "Track your YouTube task submissions.",
      icon: "youtube",
      color: "#ef4444",
      screen: "YouTubeSubmissionScreen",
    },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading your account...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <FontAwesome5 name="user-slash" size={40} color="#888" />
        <Text style={styles.loadingText}>
          No user logged in. Please sign in again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Task Submissions</Text>
      {options.map((item, index) => (
        <Animated.View
          key={item.title}
          entering={FadeInUp.delay(index * 100).springify().damping(15)}
        >
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() =>
              navigation.navigate(item.screen, {
                user_id: user.id,
              })
            }
          >
            <View style={styles.iconBox}>
              <FontAwesome5 name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: item.color }]}>
                {item.title}
              </Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  loadingText: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
    marginTop: 20,
  },
  header: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderColor: "#333",
  },
  iconBox: {
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  cardDesc: {
    color: "#999",
    fontSize: 13,
    marginTop: 3,
  },
});

export default SubmissionScreen;

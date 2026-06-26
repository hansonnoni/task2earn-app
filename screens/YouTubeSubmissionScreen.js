import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { supabase } from "../supabase";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function YouTubeSubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { task, user } = route.params;
  const [submissionLink, setSubmissionLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!submissionLink.trim()) {
      Alert.alert("Error", "Please provide your YouTube proof link.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("submissions").insert([
      {
        user_id: user.id,
        task_id: task.id,
        task_type: "youtube",
        proof_link: submissionLink,
        status: "pending",
      },
    ]);

    setLoading(false);
    if (error) {
      Alert.alert("Submission Failed", error.message);
    } else {
      Alert.alert("Success", "Your YouTube task has been submitted!");
      navigation.navigate("YouTubeTasksScreen");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Submit YouTube Task</Text>
      <Text style={styles.label}>Task Title:</Text>
      <Text style={styles.text}>{task.title}</Text>

      <Text style={styles.label}>Description:</Text>
      <Text style={styles.text}>{task.description}</Text>

      <Text style={styles.label}>Proof Link (YouTube URL or Screenshot Link):</Text>
      <TextInput
        placeholder="Enter your YouTube proof link..."
        placeholderTextColor="#888"
        style={styles.input}
        value={submissionLink}
        onChangeText={setSubmissionLink}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit Task</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#000",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  label: {
    color: "#aaa",
    marginTop: 10,
  },
  text: {
    color: "#fff",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  button: {
    backgroundColor: "#FF0000",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

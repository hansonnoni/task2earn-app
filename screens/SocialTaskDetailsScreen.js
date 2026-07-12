import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  Platform,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  AppState,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInUp } from "react-native-reanimated";
import { FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../supabase";
import * as Network from 'expo-network';
import * as Device from 'expo-device';
import * as Application from 'expo-application';



// --- Platform Icons ---
const PLATFORM_ICONS = {
  facebook: { name: "facebook", color: "#1877F2" },
  instagram: { name: "instagram", color: "#E1306C" },
  youtube: { name: "youtube", color: "#FF0000" },
  tiktok: { name: "music", color: "#000" },
  x: { name: "twitter", color: "#1DA1F2" },
  twitter: { name: "twitter", color: "#1DA1F2" },
  default: { name: "globe", color: "#999" },
};

// Helper to format time as mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

// 🔥 UPDATED: validate URL (must contain https)
const isValidUrl = (url) => {
  if (!url) return true; // optional
  const pattern = /^https?:\/\/.+/i;
  return pattern.test(url);
};

const validatePlatformUrl = (platform, url) => {
  if (!url) return true; // optional
  const rules = {
  facebook: /facebook\.com/i,
  instagram: /instagram\.com/i,
  tiktok:
/(www\.tiktok\.com|m\.tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com)/i,
  youtube:
  /(^https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)/i,
  twitter: /(twitter\.com|x\.com)/i,
  x: /(twitter\.com|x\.com)/i,
};
  const regex = rules[platform?.toLowerCase()];
  return regex ? regex.test(url) : true;
};

async function callTaskSubmissionEdgeFunction({
  userId,
  taskId,
  timeSpent,
}) {
  try {
    const ip = await Network.getIpAddressAsync();

    const { data, error } = await supabase.functions.invoke(
      "task-submission",
      {
        body: {
          userId,
          taskId,
          timeSpent,
          ip,
          deviceId:
  Platform.OS === "web"
    ? "web-browser"
    : Application.androidId || Application.applicationId,
        },
      }
    );

    if (error) {
      console.warn("❌ Task submission edge error:", error.message);
      return null;
    }

    console.log("✅ Task submission logged:", data);
    return data;
  } catch (err) {
    console.warn("❌ Task submission failed:", err.message);
    return null;
  }
}


const SocialTaskDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  // If a full `task` or `user` object is passed as params we'll use them, otherwise we'll resolve.
  const [task, setTask] = useState(route.params?.task || null);
  const [user, setUser] = useState(route.params?.user || null);
  const [timer, setTimer] = useState(0); // seconds remaining
  const [endTime, setEndTime] = useState(null);

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const countdownRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // --- Load initial data (task + user) ---
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        let currentUser = user;
        let currentTask = task;

        // 1) If user not provided in params, try AsyncStorage
        if (!currentUser) {
          const saved = await AsyncStorage.getItem("lastUser");
          if (saved) currentUser = JSON.parse(saved);
        }

        // 2) If still no user, try Supabase auth user (this gives auth user; your app may map it to profile elsewhere)
        if (!currentUser) {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            currentUser = authData.user;
            // persist for future navigations
            await AsyncStorage.setItem("lastUser", JSON.stringify(currentUser));
          }
        }

        // 3) If task not provided but task_id was passed, fetch it
        if (!currentTask && route.params?.task_id) {
          const { data, error } = await supabase
            .from("social_tasks")
            .select("*")
            .eq("id", route.params.task_id)
            .single();
          if (error) throw error;
          currentTask = data;
        }

        if (!currentTask) {
          Alert.alert("Campaign Unavailable", "This Campaign could not be found.");
          navigation.goBack();
          return;
        }

        if (mounted) {
          setUser(currentUser);
          setTask(currentTask);
          setTimer(currentTask.time_limit || 0);
          setIsStarted(false);
          setIsFinished(false);
        }
      } catch (err) {
        console.error("[Load Task Error]", err);
        Alert.alert("Error", "Unable to load this Campaign.");
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [route.params?.task_id]);

  // --- Fetch currency: try user.country_id first, then fallback to task.country_id ---
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const countryId = user?.country_id || task?.country_id;
        if (!countryId) return;

        const { data, error } = await supabase
          .from("countries")
          .select("currency_symbol")
          .eq("id", countryId)
          .single();

        if (!error && data?.currency_symbol) {
          setCurrency(data.currency_symbol);
        }
      } catch (err) {
        console.error("[Currency Fetch Error]", err);
      }
    };

    fetchCurrency();
  }, [user?.country_id, task?.country_id]);

  // --- Utility: reload timer state from DB ---
  const reloadTimerFromDB = async () => {
  try {
    if (!task) return;

    let authUserId = user?.id;
    if (!authUserId) {
      const { data: authData } = await supabase.auth.getUser();
      authUserId = authData?.user?.id;
    }
    if (!authUserId) return;

    const { data, error } = await supabase
      .from("task_timers")
      .select("start_time, end_time")
      .eq("user_id", authUserId)
      .eq("task_id", task.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(); // <--- allows null if no row exists

    if (!data) {
      // Timer was deleted by admin or never started
      setIsStarted(false);
      setIsFinished(false);
      setTimer(task.time_limit || 0);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      console.log("Timer reset: no record found for this task/user");
      return;
    }

    // Normal case: timer exists
    const now = Date.now();
    const end = new Date(data.end_time).getTime();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));

    setTimer(remaining);
    setEndTime(new Date(data.end_time));
    setIsStarted(remaining > 0);
    setIsFinished(remaining <= 0);

    if (remaining <= 0 && countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  } catch (err) {
    console.error("[Reload Timer Error]", err);
    // fallback
    setIsStarted(false);
    setIsFinished(false);
    setTimer(task?.time_limit || 0);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }
};


  // --- useFocusEffect: reload timer each time screen gains focus ---
  useFocusEffect(
    React.useCallback(() => {
      // Always reload when focus returns
      reloadTimerFromDB();

      return () => {
        // cleanup if needed
      };
    }, [task, user])
  );

  // --- AppState: when app comes to foreground (after user opened external link), reload timer ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // app has come to the foreground
        reloadTimerFromDB();
      }
      appState.current = nextAppState;
    };

    if (Platform.OS !== "web") {
  const sub = AppState.addEventListener(
    "change",
    handleAppStateChange
  );

  return () => sub.remove();
}
  }, [task, user]);

  // --- Countdown: read end_time from DB every second while started ---
  useEffect(() => {
    // Clear any existing interval
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (!isStarted || isFinished) return;

    // Poll DB each second for resilient countdown (handles app pause/background)
    countdownRef.current = setInterval(async () => {
      try {
        // get latest end_time
        let authUserId = user?.id;
        if (!authUserId) {
          const { data: authData } = await supabase.auth.getUser();
          authUserId = authData?.user?.id;
        }
        if (!authUserId || !task) return;

        const { data, error } = await supabase
          .from("task_timers")
          .select("end_time")
          .eq("user_id", authUserId)
          .eq("task_id", task.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data) return;

        const now = Date.now();
        const end = new Date(data.end_time).getTime();
        const remaining = Math.max(0, Math.floor((end - now) / 1000));

        setTimer(remaining);
        if (remaining <= 0) {
          setIsFinished(true);
          setIsStarted(false);
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      } catch (err) {
        console.error("[Countdown Tick Error]", err);
      }
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isStarted, isFinished, task, user]);

  // --- Join Campaign Confirmation ---
  const handleStartTask = async () => {
  try {
    let shouldStart = false;

    // ✅ WEB VERSION
    if (Platform.OS === "web") {
      shouldStart = window.confirm(
        "Do you want to start this Campaign? The timer will begin counting down."
      );
    }

    // ✅ MOBILE VERSION
    else {
      shouldStart = await new Promise((resolve) => {
        Alert.alert(
          "Start Task",
          "Do you want to start this Campaign? The timer will begin counting down.",
          [
            {
              text: "No",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Yes",
              onPress: () => resolve(true),
            },
          ]
        );
      });
    }

    if (!shouldStart) return;

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!currentUser) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    // ✅ Get previous attempt
    const { data: previousAttempts } = await supabase
      .from("task_timers")
      .select("attempt_number")
      .eq("user_id", currentUser.id)
      .eq("task_id", task.id)
      .order("attempt_number", { ascending: false })
      .limit(1);

    const lastAttempt = previousAttempts?.[0]?.attempt_number || 0;
    const nextAttempt = lastAttempt + 1;

    const startTime = new Date();

    const calculatedEndTime = new Date(
  startTime.getTime() + (task.time_limit || 0) * 1000
);

    // ✅ Save timer
    const { error } = await supabase.from("task_timers").insert([
      {
        user_id: currentUser.id,
        task_id: task.id,
        attempt_number: nextAttempt,
        start_time: startTime.toISOString(),
        end_time: calculatedEndTime.toISOString(),
      },
    ]);

    if (error) throw error;

    // ✅ Update UI immediately
    setIsStarted(true);
    setIsFinished(false);
    setTimer(task.time_limit || 0);
    setEndTime(calculatedEndTime);

    await AsyncStorage.setItem(
      "lastUser",
      JSON.stringify(currentUser)
    );

    // ✅ OPEN LINK
    if (task?.url) {
      if (Platform.OS === "web") {
        window.open(task.url, "_blank");
      } else {
        await Linking.openURL(task.url);
      }
    }

  } catch (err) {
    console.error("[Start Campaign Error]", err);

    Alert.alert(
      "Error",
      err.message || "Could not start Campaign"
    );
  }
};

  const handleSubmitTask = async () => {
  try {
    if (loading) return;
    setLoading(true);

    const submitTask = async () => {
      // 1️⃣ Get current user
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) throw new Error("Not logged in");

      // 2️⃣ Get next attempt number
      const { data: previousAttempts } = await supabase
        .from("social_submissions")
        .select("attempt_number")
        .eq("user_id", currentUser.id)
        .eq("task_id", task.id)
        .order("attempt_number", { ascending: false })
        .limit(1);

      const lastAttempt = previousAttempts?.[0]?.attempt_number || 0;
      const nextAttempt = lastAttempt + 1;
      
      let verificationResult = null;

      // 3️⃣ Validate proof URL
      // Validate URL format
if (
  proofUrl &&
  !validatePlatformUrl(
    task.platform,
    proofUrl
  )
) {
  Alert.alert(
    "Incorrect Link",
    `Please paste a valid ${task.platform} post or video link.`
  );

  return;
}

// Social video ownership verification

if (proofUrl) {

  let functionName = null;

  if (
    task.platform?.toLowerCase() ===
    "tiktok"
  ) {

    functionName =
      "verify-tiktok-video";

  }

  if (
    task.platform?.toLowerCase() ===
    "youtube"
  ) {

    functionName =
      "verify-youtube-video";

  }

  if (functionName) {
    console.log("Calling function:", functionName);

    console.log("Proof URL:", proofUrl);

    const { data, error } =
      await supabase.functions.invoke(
        functionName,
        {
          body: {
            user_id: currentUser.id,
            task_id: task.id,
            video_url: proofUrl,
          },
        }
      );
      console.log("Function data:", data);
console.log("Function error:", error);

    console.log(
      `${task.platform} verification`,
      JSON.stringify(data, null, 2)
    );

    if (error) {
      throw error;
    }

    if (!data?.success) {

      const errorMessage =
        data?.message ||
        "Unable to verify ownership";

      if (Platform.OS === "web") {

        window.alert(errorMessage);

      } else {

        Alert.alert(
          "Verification Failed",
          errorMessage
        );

      }

      setLoading(false);
      return;
    }

    verificationResult = data;
  }
}
      // 4️⃣ Insert into social_submissions table
      const { error } = await supabase.from("social_submissions").insert([
        {
          user_id: currentUser.id,
          task_id: task.id,
          status: "submitted",
          platform: task.platform,
          action_type: task.action_type,
          reward: task.reward,
          country_id: task.country_id,
          time_limit: task.time_limit,
          type: task.type || "free",
          created_at: new Date().toISOString(),
          proof_url: proofUrl,

attempt_number: nextAttempt,


social_post_id:

verificationResult?.video_id || null,


ownership_verified:

verificationResult?.success || false,


ownership_verified_at:

verificationResult?.success

? new Date().toISOString()

: null,


verification_details:

verificationResult || null,
        },
      ]);

      if (error) throw error;

      // 5️⃣ Call Edge Function to log submission
      try {
        await callTaskSubmissionEdgeFunction({
          userId: currentUser.id,
          taskId: task.id,
          timeSpent: task.time_limit - timer, // optional: time spent in seconds
        });
      } catch (err) {
        console.warn("❌ Edge function logging failed:", err.message);
      }

      Alert.alert("Success", "Task submitted!");
      navigation.replace("SocialSubmissionsScreen");
    };

    const missing = !proofUrl;

if (missing) {

  // ✅ WEB
  if (Platform.OS === "web") {

    const proceed = window.confirm(
      "Are you sure you want to submit without a proof URL?"    );

    if (!proceed) {
      setLoading(false);
      return;
    }

    await submitTask();
    return;
  }

  // ✅ MOBILE
  Alert.alert(
    "Missing Proof",
    "Are you sure you are not required to input proof URL?",
    [
      {
        text: "No",
        onPress: () => setLoading(false),
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: async () => await submitTask(),
      },
    ]
  );

  return;
}

await submitTask();
  } catch (err) {
  console.error("[Submit Error]", err);

  if (Platform.OS === "web") {
    window.alert(
      err?.message || "Could not submit Campaign"
    );
  } else {
    Alert.alert(
      "Error",
      err?.message || "Could not submit Campaign"
    );
  }
} finally {
    setLoading(false);
  }
};


  // --- Platform Icon ---
  const platformMeta = PLATFORM_ICONS[task?.platform?.toLowerCase()] || PLATFORM_ICONS.default;

  const shortId = `T2E-${String(task?.id).replace(/-/g, "").slice(-4)}`;

  return (
    <ScrollView
  style={styles.container}
  contentContainerStyle={{ paddingBottom: 200 }} // ensures bottom spacing for buttons
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
  <Animated.View entering={FadeInUp.springify()} style={{ flexGrow: 1 }}>
        {/* 🔥 UPDATED: Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFD700" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{task?.title || "Task"}</Text>
          <FontAwesome5 name={platformMeta.name} size={22} color={platformMeta.color} />
        </View>

        {/* Task ID Row */}
        <View style={styles.idRow}>
          <Text style={styles.label}>Campaign ID:</Text>
          <Text style={styles.taskId}>{shortId}</Text>
        </View>

        {/* Description */}
        <Text style={styles.label}>Campaign Instruction</Text>
        <Text style={styles.description}>{task?.description}</Text>

        {/* Info Boxes */}
        <View style={styles.infoBox}>
          <Text style={styles.label}>Campaign Platform:</Text>
          <Text style={styles.value}>{task?.platform}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Action:</Text>
          <Text style={styles.value}>{task?.action_type}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Campaign Reward:</Text>
          <Text style={[styles.value, styles.gold]}>
            {currency}
            {task?.reward}
          </Text>
        </View>

        {/* Timer always visible */}
        <View style={styles.timerBox}>
          <Text style={styles.timerText}>⏳ Time Remaining: {formatTime(timer)}</Text>
        </View>

        {/* Proof URL */}
        <Text style={styles.label}>Proof URL</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste the TikTok video link copied from TikTok"
          placeholderTextColor="#777"
          value={proofUrl}
          onChangeText={setProofUrl}
        />


        {/* Buttons */}
        {!isStarted && !isFinished && (
          <TouchableOpacity style={styles.startButton} onPress={handleStartTask}>
            <FontAwesome5 name="play" size={16} color="#000" />
            <Text style={styles.startButtonText}>Join Campaign</Text>
          </TouchableOpacity>
        )}

        {isStarted && !isFinished && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              // open link and rely on AppState listener to reload when user returns
              Linking.openURL(task?.url).catch(() =>
                Alert.alert("Error", "Unable to open the Campaign link.")
              );
            }}
          >
            <FontAwesome5 name="external-link-alt" size={16} color="#FFD700" />
            <Text style={styles.linkButtonText}>Open Campaign Link</Text>
          </TouchableOpacity>
        )}

        {isFinished && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTask}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <FontAwesome5 name="check" size={16} color="#000" />
                <Text style={styles.submitButtonText}>Submit Campaign</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#00FFFF" },
  idRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  taskId: { fontSize: 14, color: "#FFD700", marginLeft: 6 },
  label: { fontSize: 16, color: "#FFD700", fontWeight: "600", marginTop: 10 },
  description: { fontSize: 15, color: "#ccc", marginTop: 4 },
  infoBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  value: { fontSize: 15, color: "#fff" },
  gold: { color: "#FFD700", fontWeight: "bold" },
  timerBox: {
    marginTop: 20,
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  timerText: { color: "#FFD700", fontSize: 16, fontWeight: "600" },
  startButton: {
    flexDirection: "row",
    backgroundColor: "#FFD700",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 25,
  },
  startButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  linkButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  linkButtonText: { color: "#FFD700", fontSize: 15, fontWeight: "600", marginLeft: 8 },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#FFD700",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 25,
  },
  submitButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { color: "#FFD700", marginLeft: 8 },
});

export default SocialTaskDetailsScreen;

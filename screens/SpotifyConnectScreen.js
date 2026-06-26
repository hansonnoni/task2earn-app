import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();
import { Ionicons } from "@expo/vector-icons";
import { encode as btoa } from "base-64";

import { supabase } from "../supabase";

const CLIENT_ID =
  "aa2801dd78ff4be483e84926ca88deb2";

const REDIRECT_URI =
  "https://pfixukibsdgasmvehutm.supabase.co/functions/v1/spotify-oauth";

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-read-currently-playing",
];

export default function SpotifyConnectScreen() {
  const appRedirect = Linking.createURL(
  "spotify-connected"
);

console.log(
  "OAuth callback URL:",
  appRedirect
);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [spotifyConnected, setSpotifyConnected] =
    useState(false);

  const [displayName, setDisplayName] =
    useState("");

  const [productType, setProductType] =
    useState("");

  const [spotifyEmail, setSpotifyEmail] =
    useState("");

    const [successMessage, setSuccessMessage] =
  useState("");

  const loadSpotifyStatus = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSpotifyConnected(false);
        return;
      }

      const { data, error } = await supabase
        .from("spotify_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSpotifyConnected(true);
        setDisplayName(data.display_name || "");
        setProductType(data.product_type || "");
        setSpotifyEmail(data.spotify_email || "");
      } else {
        setSpotifyConnected(false);
        setDisplayName("");
        setProductType("");
        setSpotifyEmail("");
      }
    } catch (error) {
      console.log(
        "loadSpotifyStatus error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpotifyStatus();
  }, [loadSpotifyStatus]);

  useEffect(() => {
    const subscription =
      Linking.addEventListener(
        "url",
        ({ url }) => {
          if (
            url.includes(
              "task2earn://spotify-connected"
            )
          ) {
            loadSpotifyStatus();

            setSuccessMessage(
  "Spotify account connected successfully."
);

setTimeout(() => {
  setSuccessMessage("");
}, 5000);
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [loadSpotifyStatus]);

  

  const connectSpotify = async () => {
    try {
      setConnecting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          "Error",
          "You must be logged in."
        );
        return;
      }

      const appRedirect = Linking.createURL(
  "spotify-connected"
);

const state = encodeURIComponent(
  btoa(
    JSON.stringify({
      user_id: user.id,

      origin:
        typeof window !== "undefined"
          ? window.location.origin
          : null,

      app_redirect: appRedirect,
    })
  )
);

      const authUrl =
        "https://accounts.spotify.com/authorize" +
        `?client_id=${CLIENT_ID}` +
        "&response_type=code" +
        `&redirect_uri=${encodeURIComponent(
          REDIRECT_URI
        )}` +
        `&scope=${encodeURIComponent(
          SCOPES.join(" ")
        )}` +
        `&state=${state}` +
        "&show_dialog=true";

console.log("Auth URL:", authUrl);

      const result =
  await WebBrowser.openAuthSessionAsync(
    authUrl,
    appRedirect
  );

console.log("Auth result:", result);

setConnecting(false);

await loadSpotifyStatus();

setSuccessMessage(
  "Spotify account connected successfully."
);

setTimeout(() => {
  setSuccessMessage("");
}, 5000);

console.log(result);
    } catch (error) {
  console.log(
    "Spotify connection error:",
    JSON.stringify(error, null, 2)
  );

  Alert.alert(
    "Spotify Error",
    JSON.stringify(error)
  );
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text style={styles.title}>
        Connect Spotify
      </Text>

      <Text style={styles.subtitle}>
        Connect your Spotify account to
        participate in Spotify streaming
        campaigns.
      </Text>

      <View style={styles.card}>
        {successMessage ? (
  <Text style={styles.successBanner}>
    {successMessage}
  </Text>
) : null}
        <Ionicons
          name="musical-notes"
          size={40}
          color="#1DB954"
        />

        {spotifyConnected ? (
          <>
            <Text style={styles.connected}>
              Connected ✓
            </Text>

            <Text style={styles.name}>
              {displayName}
            </Text>

            {!!spotifyEmail && (
              <Text style={styles.email}>
                {spotifyEmail}
              </Text>
            )}

            {!!productType && (
              <Text style={styles.plan}>
                Plan: {productType}
              </Text>
            )}

            <TouchableOpacity
              disabled
              style={[
                styles.button,
                {
                  backgroundColor:
                    "#666",
                },
              ]}
            >
              <Text style={styles.buttonText}>
                Spotify Connected
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.notConnected}>
              No Spotify account connected
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={connectSpotify}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  Connect Spotify
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1DB954",
    marginBottom: 8,
  },

  subtitle: {
    color: "#ccc",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },

  connected: {
    color: "#1DB954",
    fontWeight: "bold",
    marginTop: 10,
  },

  notConnected: {
    color: "#ccc",
    marginTop: 15,
    marginBottom: 15,
  },

  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
  },

  email: {
    color: "#aaa",
    marginTop: 5,
  },

  plan: {
    color: "#aaa",
    marginTop: 5,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  buttonText: {
  color: "#fff",
  fontWeight: "bold",
},

successBanner: {
  color: "#1DB954",
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 15,
},
});
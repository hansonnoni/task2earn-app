// screens/PaymentMethodsScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { supabase } from "../supabase";

export default function PaymentMethodsScreen({ navigation }) {
  const [methods, setMethods] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [formState, setFormState] = useState({
    bank: { bank_name: "", account_name: "", account_number: "" },
    paypal: { email: "" },
    crypto: { wallet_address: "", crypto_type: "" },
    airtime: { phone_number: "", network: "" },
  });

  const methodKeys = ["bank", "paypal", "crypto", "airtime"];

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("user_id", user.id);

    if (error) return console.error(error);

    const saved = {};
    data.forEach((m) => saved[m.method] = m);
    setMethods(saved);
  };

  const handleSave = async (method) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentData = formState[method];
    for (const key in currentData) {
      if (!currentData[key]) return Alert.alert("Missing Info", `Fill ${key} field`);
    }

    setLoading(true);
    const payload = {
      user_id: user.id,
      method,
      details: currentData,
      is_saved: true,
      is_default: Object.keys(methods).length === 0,
    };

    const { error } = await supabase.from("payment_methods").insert(payload);
    if (error) Alert.alert("Error", error.message);
    else {
      Alert.alert("Saved!", `${method.toUpperCase()} saved successfully`);
      fetchMethods();
      setExpandedMethod(null);
    }
    setLoading(false);
  };

  const toggleExpand = (method) => {
    if (methods[method]?.is_saved) return;
    setExpandedMethod(expandedMethod === method ? null : method);
  };

  const handleSetDefault = async (methodId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reset all methods to is_default = false
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id);

    // Set selected method as default
    const { error } = await supabase
      .from("payment_methods")
      .update({ is_default: true })
      .eq("id", methodId);

    if (error) Alert.alert("Error", error.message);
    fetchMethods();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Payment Methods</Text>

      {methodKeys.map((method) => (
        <View key={method} style={styles.methodContainer}>
          <TouchableOpacity
            style={[
              styles.methodHeader,
              methods[method]?.is_saved ? styles.savedHeader : null,
            ]}
            onPress={() => toggleExpand(method)}
          >
            <Text style={styles.methodTitle}>
              {method.toUpperCase()}
              {methods[method]?.is_saved ? " (Saved)" : ""}
              {methods[method]?.is_default ? " (Default)" : ""}
            </Text>
          </TouchableOpacity>

          {expandedMethod === method && !methods[method]?.is_saved && (
            <View style={styles.formContainer}>
              {method === "bank" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Bank Name"
                    value={formState.bank.bank_name}
                    onChangeText={(t) => setFormState({ ...formState, bank: { ...formState.bank, bank_name: t } })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Account Name"
                    value={formState.bank.account_name}
                    onChangeText={(t) => setFormState({ ...formState, bank: { ...formState.bank, account_name: t } })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Account Number"
                    keyboardType="numeric"
                    value={formState.bank.account_number}
                    onChangeText={(t) => setFormState({ ...formState, bank: { ...formState.bank, account_number: t } })}
                  />
                </>
              )}
              {method === "paypal" && (
                <TextInput
                  style={styles.input}
                  placeholder="PayPal Email"
                  value={formState.paypal.email}
                  onChangeText={(t) => setFormState({ ...formState, paypal: { email: t } })}
                />
              )}
              {method === "crypto" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Wallet Address"
                    value={formState.crypto.wallet_address}
                    onChangeText={(t) => setFormState({ ...formState, crypto: { ...formState.crypto, wallet_address: t } })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Crypto Type"
                    value={formState.crypto.crypto_type}
                    onChangeText={(t) => setFormState({ ...formState, crypto: { ...formState.crypto, crypto_type: t } })}
                  />
                </>
              )}
              {method === "airtime" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    keyboardType="numeric"
                    value={formState.airtime.phone_number}
                    onChangeText={(t) => setFormState({ ...formState, airtime: { ...formState.airtime, phone_number: t } })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Network"
                    value={formState.airtime.network}
                    onChangeText={(t) => setFormState({ ...formState, airtime: { ...formState.airtime, network: t } })}
                  />
                </>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, loading && { backgroundColor: "#666" }]}
                onPress={() => handleSave(method)}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>{loading ? "Saving..." : `Save ${method.toUpperCase()}`}</Text>
              </TouchableOpacity>
            </View>
          )}

          {methods[method]?.is_saved && (
            <View style={styles.savedContainer}>
              <Text style={{ color: "#ccc" }}>{JSON.stringify(methods[method].details, null, 2)}</Text>
              {!methods[method].is_default && (
                <TouchableOpacity
                  style={styles.defaultBtn}
                  onPress={() => handleSetDefault(methods[method].id)}
                >
                  <Text style={{ color: "#000" }}>Set Default</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#1e1e1e" },
  header: { fontSize: 22, color: "#FFD700", marginBottom: 20, textAlign: "center" },
  methodContainer: { marginBottom: 15, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#444" },
  methodHeader: { backgroundColor: "#2c2c2c", padding: 12 },
  savedHeader: { backgroundColor: "#444" },
  methodTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  formContainer: { backgroundColor: "#1b1b1b", padding: 12 },
  input: { backgroundColor: "#2c2c2c", color: "#fff", padding: 12, borderRadius: 8, marginBottom: 10 },
  saveBtn: { backgroundColor: "#00C853", padding: 12, borderRadius: 8 },
  saveBtnText: { color: "#000", fontWeight: "bold", textAlign: "center" },
  savedContainer: { backgroundColor: "#333", padding: 10, marginTop: 6, borderRadius: 8 },
  defaultBtn: { backgroundColor: "#FFD700", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginTop: 6, alignSelf: "flex-start" },
});

// screens/PaymentMethodsScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { supabase } from "../supabase";
import { useNavigation } from "@react-navigation/native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { moderateScale } from "react-native-size-matters";


export default function PaymentMethodsScreen() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const navigation = useNavigation();


  const [banks, setBanks] = useState([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankLocked, setBankLocked] = useState(false);

  const [fetchingCountries, setFetchingCountries] = useState(false);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const hasSavedBank = paymentMethods.length > 0;


  const accountInputRef = useRef(null);

  const [form, setForm] = useState({
    bank_name: "",
    bank_code: "",
    account_number: "",
    account_name: "",
    verified: false,
  });

  /* ---------------- LOAD COUNTRIES ---------------- */
  useEffect(() => {
    fetchCountries();
    fetchPaymentMethods();
  }, []);

  const fetchCountries = async () => {
    setFetchingCountries(true);
    try {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("payout_supported", true);

      if (error) throw error;

      setCountries(data || []);
      autoSelectUserCountry(data || []);
    } catch (err) {
      console.error("Failed to load countries:", err);
      Alert.alert("Error", "Failed to load countries");
    } finally {
      setFetchingCountries(false);
    }
  };

  const autoSelectUserCountry = async (list) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !list.length) return;

    const { data: profile } = await supabase
      .from("users")
      .select("country_id")
      .eq("id", user.id)
      .single();

    const match = list.find((c) => c.id === profile?.country_id) || list[0];
    setSelectedCountry(match);
    fetchBanks(match.country_code);
  };

  /* ---------------- FETCH BANKS ---------------- */
 const fetchBanks = async (countryCode) => {
  setFetchingBanks(true);
  setBanks([]);
  setBankLocked(false);
  setBankSearch("");

  try {
    const { data, error } = await supabase.functions.invoke(
      "get-flutterwave-banks",
      { body: { country: countryCode } }
    );

    console.log("Banks function response:", data, error);

    if (error) throw error;

    // If function returns raw array (v3)
if (Array.isArray(data)) {
  setBanks(data);
}
// If function returns { success, banks } (OAuth version)
else if (data?.success && Array.isArray(data.banks)) {
  setBanks(data.banks);
}
else {
  throw new Error("Invalid bank list format");
}


  } catch (err) {
    console.error("Failed to fetch banks:", err);
    Alert.alert("Error", "Failed to load banks");
  } finally {
    setFetchingBanks(false);
  }
};


  /* ---------------- VERIFY ACCOUNT ---------------- */
const verifyAccount = async () => {
  if (!form.account_number) {
    if (Platform.OS === "web") {
      window.alert("Enter account number");
    } else {
      Alert.alert("Error", "Enter account number");
    }
    return;
  }

  setVerifying(true);

  try {
    const res = await supabase.functions.invoke(
      "flutterwave-verify-account",
      {
        body: {
          account_bank: form.bank_code,
          account_number: form.account_number.toString(),
        },
      }
    );

    const parsedData =
      typeof res.data === "string"
        ? JSON.parse(res.data)
        : res.data;

    console.log("FULL VERIFY RESPONSE");
    console.log("DATA:", parsedData);
    console.log("ERROR:", res.error);
    console.log("RAW RESPONSE:", res);

    if (res.error || !parsedData?.account_name) {
      const message =
        parsedData?.flutterwave?.message ||
        res.error?.message ||
        "Account not found. Please check details";

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Verification Failed", message);
      }

      return;
    }

    setForm((prev) => ({
      ...prev,
      account_name: parsedData.account_name,
      verified: true,
    }));

  } catch (err) {
    console.error("Verification error:", err);

    if (Platform.OS === "web") {
      window.alert(err.message || "Invalid bank details");
    } else {
      Alert.alert(
        "Verification Failed",
        err.message || "Invalid bank details"
      );
    }

  } finally {
    setVerifying(false);
  }
};

  /* ---------------- SAVE PAYMENT METHOD ---------------- */
  const savePaymentMethod = async () => {
  try {
    if (!selectedCountry) {
      if (Platform.OS === "web") {
        window.alert("Country not selected");
      } else {
        Alert.alert("Error", "Country not selected");
      }
      return;
    }

    if (!form.verified) {
      if (Platform.OS === "web") {
        window.alert("Please verify account first");
      } else {
        Alert.alert("Error", "Please verify account first");
      }
      return;
    }

    setSaving(true);

    // ✅ GET USER
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("AUTH USER:", user);
    console.log("AUTH ERROR:", authError);

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // ✅ CREATE BENEFICIARY
    console.log("Creating beneficiary...");

    const beneficiaryResponse =
      await supabase.functions.invoke(
        "flutterwave-create-beneficiary",
        {
          body: {
            account_number: String(form.account_number),
            bank_code: String(form.bank_code),
            account_name: String(form.account_name),
            currency: String(
              selectedCountry?.currency_code || "NGN"
            ),
            user_id: user.id,
          },
        }
      );

    console.log(
      "FULL BENEFICIARY RESPONSE:",
      beneficiaryResponse
    );

    const beneficiaryData =
      typeof beneficiaryResponse.data === "string"
        ? JSON.parse(beneficiaryResponse.data)
        : beneficiaryResponse.data;

    console.log("PARSED BENEFICIARY DATA:", beneficiaryData);
    console.log(
      "BENEFICIARY ERROR:",
      beneficiaryResponse.error
    );

    // ✅ CHECK EDGE FUNCTION ERROR
    if (beneficiaryResponse.error) {
      throw new Error(
        beneficiaryResponse.error.message ||
          "Edge function failed"
      );
    }

    let beneficiaryId =
      beneficiaryData?.beneficiary_id || null;

    console.log("Beneficiary ID:", beneficiaryId);

    // ✅ INSERT INTO DB
    console.log("Inserting payment method...");

    const { data: insertedData, error: insertError } =
      await supabase
        .from("payment_methods")
        .insert([
          {
            user_id: user.id,
            method: "bank",
            method_type: "bank",

            country_id: selectedCountry.id,
            currency: selectedCountry.currency_code,

            bank_code: form.bank_code,
            account_number: form.account_number,
            account_name: form.account_name,
            bank_name: form.bank_name,

            flutterwave_beneficiary_id:
              beneficiaryId,

            details: {
              provider: "flutterwave",
              bank_name: form.bank_name,
              country: selectedCountry.name,
            },

            is_verified: true,
            verified_at: new Date().toISOString(),
            is_saved: true,
            is_default: true,
          },
        ])
        .select();

    console.log("INSERTED DATA:", insertedData);
    console.log("INSERT ERROR:", insertError);

    if (insertError) {
      throw insertError;
    }

    // ✅ SUCCESS
    if (Platform.OS === "web") {
      window.alert(
        "Payment method saved successfully"
      );
    } else {
      Alert.alert(
        "Success",
        "Payment method saved successfully"
      );
    }

    // RESET
    setBankLocked(false);

    setForm({
      bank_name: "",
      bank_code: "",
      account_number: "",
      account_name: "",
      verified: false,
    });

    fetchPaymentMethods();

  } catch (err) {
    console.error("SAVE PAYMENT METHOD ERROR:");
    console.error(err);

    if (Platform.OS === "web") {
      window.alert(err.message || "Save failed");
    } else {
      Alert.alert(
        "Error",
        err.message || "Save failed"
      );
    }

  } finally {
    setSaving(false);
  }
};


  /* ---------------- FETCH PAYMENT METHODS ---------------- */
  const fetchPaymentMethods = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPaymentMethods(data || []);
    } catch (err) {
      console.error("Failed to load payment methods:", err);
    }
  };

  /* ---------------- FILTER BANKS ---------------- */
  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Your Payment Methods</Text>

      {paymentMethods.length > 0 ? (
        paymentMethods.map((method) => (
          <View
            key={method.id}
            style={styles.savedMethod}
          >
            <Text style={styles.savedText}>
              {method.account_name} - {method.account_number}
            </Text>
            <Text style={styles.savedText}>
              {method.details?.bank_name} ({method.currency})
            </Text>
          </View>
        ))
      ) : (
        <Text style={{ color: "#fff", marginBottom: 20 }}>
          No saved payment methods
        </Text>
      )}

      <Text style={[styles.header, { marginTop: 20 }]}>Add Payment Method</Text>
      {hasSavedBank && (
  <View style={styles.lockedBox}>
    <Text style={styles.lockedText}>
      You already have a saved bank account.
    </Text>

    <TouchableOpacity
      style={styles.supportBtn}
      onPress={() => navigation.navigate("Support")}
    >
      <Text style={styles.supportText}>Request Bank Change</Text>
    </TouchableOpacity>
  </View>
)}


      {fetchingBanks && <ActivityIndicator color="#FFD700" size="large" />}

      {/* SELECTED BANK CARD */}
      {bankLocked && !hasSavedBank && (
        <View style={styles.selectedBank}>
          <Text style={styles.selectedBankText}>{form.bank_name}</Text>
          <TouchableOpacity
            onPress={() => {
              setBankLocked(false);
              setForm({
                bank_name: "",
                bank_code: "",
                account_number: "",
                account_name: "",
                verified: false,
              });
            }}
          >
            <Text style={styles.changeBank}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BANK SEARCH */}
      {!bankLocked && !hasSavedBank && (
  <TextInput
    style={styles.search}
    placeholder="Search bank"
    placeholderTextColor="#999"
    value={bankSearch}
    onChangeText={setBankSearch}
  />
)}


      {/* BANK LIST */}
      {!bankLocked && !hasSavedBank &&
  filteredBanks.map((b, index) => (
    <TouchableOpacity
      key={`${b.code}-${b.name}-${index}`}
      style={styles.option}
      onPress={() => {
        setForm({
          bank_name: b.name,
          bank_code: b.code,
          account_number: "",
          account_name: "",
          verified: false,
        });
        setBankLocked(true);
        setTimeout(() => accountInputRef.current?.focus(), 200);
      }}
    >
      <Text style={styles.optionText}>{b.name}</Text>
    </TouchableOpacity>
  ))}



      {/* ACCOUNT INPUT */}
      {bankLocked && (
        <>
          <TextInput
            ref={accountInputRef}
            style={styles.input}
            placeholder="Account Number"
            keyboardType="numeric"
            value={form.account_number}
            onChangeText={(t) =>
              setForm((p) => ({ ...p, account_number: t, verified: false }))
            }
            editable={!verifying && !saving}
          />

          {!form.verified ? (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={verifyAccount}
              disabled={verifying || saving}
            >
              <Text style={styles.verifyText}>
                {verifying ? "Verifying..." : "Verify Account"}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.success}>
                Account Name: {form.account_name}
              </Text>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={savePaymentMethod}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? "Saving..." : "Save Payment Method"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    backgroundColor: "#1e1e1e",
  },
  header: {
    color: "#FFD700",
    fontSize: moderateScale(22),
    textAlign: "center",
    marginBottom: hp('1%'),
  },
  search: {
    backgroundColor: "#2c2c2c",
    color: "#fff",
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    marginVertical: hp('1%'),
    fontSize: moderateScale(14),
  },
  option: {
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    backgroundColor: "#2c2c2c",
    marginVertical: hp('0.5%'),
    borderRadius: wp('2%'),
  },
  optionText: {
    color: "#fff",
    fontSize: moderateScale(14),
  },
  selectedBank: {
    backgroundColor: "#FFD700",
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp('1%'),
  },
  selectedBankText: {
    fontWeight: "bold",
    color: "#000",
    fontSize: moderateScale(14),
  },
  changeBank: {
    color: "#000",
    fontWeight: "bold",
    fontSize: moderateScale(14),
  },
  input: {
    backgroundColor: "#2c2c2c",
    color: "#fff",
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    marginVertical: hp('1%'),
    fontSize: moderateScale(14),
  },
  verifyBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    marginTop: hp('1%'),
  },
  verifyText: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: moderateScale(14),
  },
  success: {
    color: "#00C853",
    marginVertical: hp('1%'),
    fontWeight: "bold",
    fontSize: moderateScale(14),
  },
  saveBtn: {
    backgroundColor: "#00C853",
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    marginTop: hp('1%'),
  },
  saveText: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: moderateScale(14),
  },
  savedMethod: {
    backgroundColor: "#2c2c2c",
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    marginBottom: hp('0.5%'),
  },
  savedText: {
    color: "#fff",
    fontSize: moderateScale(14),
  },
  lockedBox: {
    backgroundColor: "#2c2c2c",
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    marginVertical: hp('1%'),
    alignItems: "center",
  },
  lockedText: {
    color: "#fff",
    marginBottom: hp('1%'),
    textAlign: "center",
    fontSize: moderateScale(14),
  },
  supportBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2%'),
  },
  supportText: {
    fontWeight: "bold",
    fontSize: moderateScale(14),
  },
});



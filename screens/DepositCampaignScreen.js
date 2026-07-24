import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../supabase";

export default function DepositCampaignScreen({
  route,
  navigation,
}) {
  const { campaignId } = route.params;

  const [loading, setLoading] = useState(true);

  const [campaign, setCampaign] = useState(null);
  const [paymentMethod, setPaymentMethod] =
  useState("flutterwave");
  const [paying, setPaying] = useState(false);

  const reward =
Number(campaign?.reward || 0);

const creators =
Number(campaign?.max_participants || 0);

const budget =
reward * creators;

const platformFee =
Math.round(budget * 0.05);

const total =
budget + platformFee;

  const loadCampaign = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("create_campaigns")
        .select(`
          *,
          countries(name)
        `)
        .eq("id", campaignId)
        .single();

      if (error) throw error;

      setCampaign(data);

    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, []);

const handlePayment = async () => {

  if (paymentMethod !== "flutterwave") {
    Alert.alert(
      "Unavailable",
      "Only Flutterwave is available."
    );
    return;
  }

  navigation.navigate(
    "CampaignPayment",
    {
      campaignId: campaign.id,
      amount: total,
    }
  );

};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#FFD700"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="arrow-back"
          size={28}
          color="#FFD700"
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        Deposit Campaign Budget
      </Text>

      <View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Campaign Summary
  </Text>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Campaign
    </Text>

    <Text style={styles.infoValue}>
      {campaign?.title}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Platform
    </Text>

    <Text style={styles.infoValue}>
      🎵 {campaign?.platform}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Country
    </Text>

    <Text style={styles.infoValue}>
      {campaign?.countries?.name || "All Countries"}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Status
    </Text>

    <Text
      style={{
        color:
          campaign?.status === "paid"
            ? "#22C55E"
            : "#FFA500",
        fontWeight: "700",
      }}
    >
      {campaign?.status
        ?.replace("_", " ")
        ?.toUpperCase()}
    </Text>
  </View>

</View>

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Payment Summary
  </Text>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Reward Per Creator
    </Text>

    <Text style={styles.infoValue}>
      ₦{reward.toLocaleString()}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Creators Needed
    </Text>

    <Text style={styles.infoValue}>
      {creators.toLocaleString()}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Campaign Budget
    </Text>

    <Text style={styles.infoValue}>
      ₦{budget.toLocaleString()}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Platform Fee (5%)
    </Text>

    <Text style={styles.infoValue}>
      ₦{platformFee.toLocaleString()}
    </Text>
  </View>

  <View style={styles.divider} />

  <View style={styles.infoRow}>

    <Text style={styles.totalLabel}>
      Total Payment
    </Text>

    <Text style={styles.totalValue}>
      ₦{total.toLocaleString()}
    </Text>

  </View>

  {/* Payment Method */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Payment Method
  </Text>

  {/* Flutterwave */}

  <TouchableOpacity
    style={[
      styles.paymentCard,
      paymentMethod === "flutterwave" &&
        styles.paymentCardSelected,
    ]}
    onPress={() =>
      setPaymentMethod("flutterwave")
    }
  >

    <View style={{ flex: 1 }}>

      <Text style={styles.paymentTitle}>
        Flutterwave
      </Text>

      <Text style={styles.paymentSubtitle}>
        Card • Bank Transfer • USSD • Mobile Money
      </Text>

    </View>

    <Ionicons
      name={
        paymentMethod === "flutterwave"
          ? "radio-button-on"
          : "radio-button-off"
      }
      size={24}
      color="#22C55E"
    />

  </TouchableOpacity>

  {/* Wallet */}

  <TouchableOpacity
    style={styles.paymentCard}
    activeOpacity={1}
  >

    <View style={{ flex: 1 }}>

      <Text style={styles.paymentTitleDisabled}>
        Wallet
      </Text>

      <Text style={styles.paymentSubtitle}>
        Coming Soon
      </Text>

    </View>

    <Ionicons
      name="lock-closed"
      size={20}
      color="#777"
    />

  </TouchableOpacity>

  {/* Bank */}

  <TouchableOpacity
    style={styles.paymentCard}
    activeOpacity={1}
  >

    <View style={{ flex: 1 }}>

      <Text style={styles.paymentTitleDisabled}>
        Bank Transfer
      </Text>

      <Text style={styles.paymentSubtitle}>
        Coming Soon
      </Text>

    </View>

    <Ionicons
      name="lock-closed"
      size={20}
      color="#777"
    />

  </TouchableOpacity>

</View>

<View style={styles.noticeCard}>

  <Ionicons
    name="information-circle"
    size={22}
    color="#FFD700"
  />

  <Text style={styles.noticeText}>

    Your campaign will only be sent for
    admin review after payment has been
    successfully confirmed.

  </Text>

</View>

<TouchableOpacity
  style={styles.payButton}
  onPress={handlePayment}
  disabled={paying}
>

  {paying ? (

    <ActivityIndicator
      color="#000"
    />

  ) : (

    <Text style={styles.payButtonText}>
      Pay ₦{total.toLocaleString()}
    </Text>

  )}

</TouchableOpacity>

</View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  center:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:"#121212",
  },

  container:{
    flex:1,
    backgroundColor:"#121212",
    padding:20,
  },

  title:{
    color:"#FFF",
    fontSize:28,
    fontWeight:"bold",
    marginTop:20,
  },

  card:{
  backgroundColor:"#1E1E1E",
  padding:20,
  borderRadius:15,
  marginTop:25,
},

sectionTitle:{
  color:"#FFD700",
  fontSize:18,
  fontWeight:"700",
  marginBottom:20,
},

infoRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
  marginBottom:15,
},

infoLabel:{
  color:"#AAAAAA",
  fontSize:15,
},

infoValue:{
  color:"#FFFFFF",
  fontSize:15,
  fontWeight:"700",
  maxWidth:"60%",
  textAlign:"right",
},

divider:{
  borderTopWidth:1,
  borderTopColor:"#333",
  marginVertical:15,
},

totalLabel:{
  color:"#FFFFFF",
  fontSize:18,
  fontWeight:"bold",
},

totalValue:{
  color:"#22C55E",
  fontSize:24,
  fontWeight:"bold",
},

paymentCard:{
  backgroundColor:"#2A2A2A",
  borderRadius:12,
  padding:18,
  marginTop:15,
  flexDirection:"row",
  alignItems:"center",
},

paymentCardSelected:{
  borderWidth:2,
  borderColor:"#22C55E",
},

paymentTitle:{
  color:"#FFF",
  fontSize:17,
  fontWeight:"700",
},

paymentTitleDisabled:{
  color:"#888",
  fontSize:17,
  fontWeight:"700",
},

paymentSubtitle:{
  color:"#AAA",
  marginTop:6,
  fontSize:13,
},

noticeCard:{
  marginTop:20,
  backgroundColor:"#2A2500",
  borderRadius:12,
  padding:18,
  flexDirection:"row",
  alignItems:"flex-start",
},

noticeText:{
  color:"#DDD",
  flex:1,
  marginLeft:12,
  lineHeight:22,
},

payButton:{
marginTop:30,
backgroundColor:"#22C55E",
paddingVertical:18,
borderRadius:15,
alignItems:"center",
},

payButtonText:{
color:"#000",
fontWeight:"bold",
fontSize:18,
},

});
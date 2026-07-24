import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import { supabase } from "../supabase";

export default function CampaignPaymentScreen({ route, navigation }) {

  const { campaignId } = route.params;
  console.log("Campaign ID:", campaignId);

  const [campaign, setCampaign] = useState(null);
const [loadingCampaign, setLoadingCampaign] = useState(true);

const [loading, setLoading] = useState(false);

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

  useEffect(() => {

    loadCampaign();

  }, []);

  const loadCampaign = async () => {
  try {
    const { data, error } = await supabase
      .from("create_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (error) throw error;

    setCampaign(data);
    console.log(data);

  } catch (err) {
    Alert.alert("Error", err.message);
  } finally {
    setLoadingCampaign(false);
  }
};

  const payNow = async () => {

  try {

    setLoading(true);

    const { data, error } =
      await supabase.functions.invoke(
        "create-campaign-payment",
        {
          body: {
            campaignId,
          },
        }
      );

    if (error) throw error;

    navigation.navigate(
      "FlutterwaveCheckout",
      {
        paymentLink: data.payment_link,
        campaignId,
      }
    );

  } catch (err) {

    Alert.alert(
      "Payment Error",
      err.message
    );

  } finally {

    setLoading(false);

  }

};

if (loadingCampaign) {
    return (
        <View style={styles.container}>
            <ActivityIndicator
                size="large"
                color="#FFD700"
            />
        </View>
    );
}

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Campaign Payment
      </Text>

      <Text style={styles.amount}>

        Total Budget

      </Text>

      <Text style={styles.money}>

        ₦{total.toLocaleString()}

      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={payNow}
      >

        {loading ? (

<ActivityIndicator color="#000"/>

) : (

<Text style={styles.text}>
Pay ₦{total.toLocaleString()}
</Text>

)}

      </TouchableOpacity>

    </View>

  );

}

const styles = StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:"#121212",
padding:20
},

title:{
fontSize:28,
fontWeight:"bold",
color:"#FFD700"
},

amount:{
marginTop:40,
fontSize:18,
color:"#ccc"
},

money:{
fontSize:40,
fontWeight:"bold",
color:"#22C55E",
marginVertical:20
},

button:{
backgroundColor:"#FFD700",
padding:18,
borderRadius:12,
width:"100%",
alignItems:"center"
},

text:{
fontWeight:"bold",
fontSize:18
}

});
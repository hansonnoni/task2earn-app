import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../supabase";


export default function MyCampaignDetailsScreen({
    route,
    navigation,
}) {

const { campaignId } = route.params;

const [loading,setLoading]=useState(true);

const [campaign,setCampaign]=useState(null);



const loadCampaign = async () => {

try{

setLoading(true);

const { data, error } = await supabase

.from("create_campaigns")

.select(`
*,
countries(
name
)
`)

.eq("id",campaignId)

.single();

if(error) throw error;

setCampaign(data);

}

catch(err){

Alert.alert("Error",err.message);

}

finally{

setLoading(false);

}

};


useEffect(()=>{

loadCampaign();

},[]);


const budget =
(campaign?.reward || 0) *
(campaign?.max_participants || 0);

const spent =
(campaign?.reward || 0) *
(campaign?.completed_creators || 0);

const remaining =
budget - spent;

const progress =
campaign?.max_participants > 0

? campaign.completed_creators /
campaign.max_participants

:0;


if(loading){

return(

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
size={26}
color="#FFD700"
/>

</TouchableOpacity>

<Text style={styles.title}>
{campaign?.title}
</Text>

<Text style={styles.platform}>
🎵 {campaign?.platform}
</Text>


<View style={styles.card}>

<Text style={styles.sectionTitle}>

Campaign Progress

</Text>

<View style={styles.progressBackground}>

<View

style={[

styles.progressFill,

{

width: `${Math.min(progress * 100,100)}%`

}

]}

/>

</View>

<Text style={styles.progressText}>

{campaign.completed_creators || 0} / {campaign.max_participants}

Creators

</Text>

</View>

{/* Budget */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Budget
  </Text>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Reward Per Creator
    </Text>

    <Text style={styles.infoValue}>
      ₦{Number(campaign.reward || 0).toLocaleString()}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Total Budget
    </Text>

    <Text style={styles.infoValue}>
      ₦{budget.toLocaleString()}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Amount Spent
    </Text>

    <Text style={styles.greenText}>
      ₦{spent.toLocaleString()}
    </Text>
  </View>

  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>
      Remaining
    </Text>

    <Text style={styles.infoValue}>
      ₦{remaining.toLocaleString()}
    </Text>
  </View>

</View>

{/* Campaign Details */}

<View style={styles.card}>

<Text style={styles.sectionTitle}>

Campaign Details

</Text>

<View style={styles.infoRow}>
<Text style={styles.infoLabel}>
Platform
</Text>

<Text style={styles.infoValue}>
{campaign.platform}
</Text>
</View>

<View style={styles.infoRow}>
<Text style={styles.infoLabel}>
Country
</Text>

<Text style={styles.infoValue}>
{campaign.countries?.name || "Not Selected"}
</Text>
</View>

<View style={styles.infoRow}>
<Text style={styles.infoLabel}>
Goal
</Text>

<Text style={styles.infoValue}>
{campaign.action_type}
</Text>
</View>

<View style={styles.infoRow}>
<Text style={styles.infoLabel}>
Verification
</Text>

<Text style={styles.infoValue}>
{campaign.verification_type}
</Text>
</View>

<View style={styles.infoRow}>
<Text style={styles.infoLabel}>
Time Limit
</Text>

<Text style={styles.infoValue}>
{campaign.time_limit} sec
</Text>
</View>

<View style={styles.infoRow}>
<Text style={styles.infoLabel}>
Status
</Text>

<Text style={styles.infoValue}>
{campaign.status}
</Text>

<View style={styles.infoRow}>

  <Text style={styles.infoLabel}>
    Created
  </Text>

  <Text style={styles.infoValue}>
    {new Date(campaign.created_at).toLocaleDateString()}
  </Text>

</View>

<View style={styles.infoRow}>

  <Text style={styles.infoLabel}>
    Deposit Status
  </Text>

  <Text
    style={{
      color:
        campaign.status === "paid"
          ? "#22C55E"
          : "#FFA500",
      fontWeight: "700",
    }}
  >

    {campaign.status === "paid"
      ? "Paid"
      : "Awaiting Payment"}

  </Text>

</View>

{/* Campaign Description */}

<View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Description
  </Text>

  <Text style={styles.description}>
    {campaign.description || "No description provided."}
  </Text>

</View>

</View>

</View>

{/* Campaign URL */}

<View style={styles.card}>

<Text style={styles.sectionTitle}>

Campaign Link

</Text>

<TouchableOpacity
onPress={()=>{
if(campaign.campaign_url){

Linking.openURL(campaign.campaign_url)
      .catch(() =>
        Alert.alert(
          "Error",
          "Unable to open link."
        )
      );

}
}}
>

<Text style={styles.link}>

{campaign.campaign_url}

</Text>

</TouchableOpacity>

</View>

{/* Quick Actions */}

<View style={styles.card}>

<Text style={styles.sectionTitle}>

Quick Actions

</Text>

<View style={styles.actionRow}>

<TouchableOpacity

style={styles.actionButton}

onPress={()=>

navigation.navigate(

"EditCampaign",

{

campaignId

}

)

}

>

<Ionicons

name="create-outline"

size={24}

color="#03A9F4"

/>

<Text style={styles.actionText}>

Edit

</Text>

</TouchableOpacity>

<TouchableOpacity

style={styles.actionButton}

onPress={()=>

navigation.navigate(

"DepositCampaign",

{

campaignId

}

)

}

>

<Ionicons

name="wallet-outline"

size={24}

color="#22C55E"

/>

<Text style={styles.actionText}>

Deposit

</Text>

</TouchableOpacity>

<TouchableOpacity

style={styles.actionButton}

onPress={()=>

Alert.alert(

"Coming Soon",

"Pause Campaign"

)

}

>

<Ionicons

name="pause-circle-outline"

size={24}

color="#FFD700"

/>

<Text style={styles.actionText}>

Pause

</Text>

</TouchableOpacity>

<TouchableOpacity

style={styles.actionButton}

onPress={()=>

Alert.alert(

"Coming Soon",

"Delete Campaign"

)

}

>

<Ionicons

name="trash-outline"

size={24}

color="#EF4444"

/>

<Text style={styles.actionText}>

Delete

</Text>

</TouchableOpacity>

</View>

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
fontSize:28,
fontWeight:"bold",
color:"#FFF",
marginTop:20,
},

platform:{
fontSize:16,
color:"#00BCD4",
marginBottom:20,
},

card:{
backgroundColor:"#1E1E1E",
padding:20,
borderRadius:15,
marginBottom:20,
},

sectionTitle:{
fontSize:18,
fontWeight:"700",
color:"#FFD700",
marginBottom:20,
},

progressBackground:{
height:12,
backgroundColor:"#2A2A2A",
borderRadius:30,
overflow:"hidden",
},

progressFill:{
height:12,
backgroundColor:"#22C55E",
},

progressText:{
marginTop:10,
color:"#CCC",
},

infoRow:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:15,
},

infoLabel:{
color:"#AAA",
},

infoValue:{
color:"#FFF",
fontWeight:"700",
},

greenText:{
color:"#22C55E",
fontWeight:"700",
},

link:{
color:"#03A9F4",
textDecorationLine:"underline",
},

actionRow:{
flexDirection:"row",
justifyContent:"space-between",
flexWrap:"wrap",
},

actionButton:{
width:"24%",
alignItems:"center",
},

actionText:{
marginTop:8,
color:"#DDD",
fontSize:12,
},

description:{
color:"#DDD",
fontSize:15,
lineHeight:24,
},
});
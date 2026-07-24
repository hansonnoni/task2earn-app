import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useNavigation } from "@react-navigation/native";

import { supabase } from "../supabase";


export default function MyCampaignsScreen() {

const navigation = useNavigation();

const [loading,setLoading]=useState(true);

const [refreshing,setRefreshing]=useState(false);

const [campaigns,setCampaigns]=useState([]);

const [search,setSearch]=useState("");

const [statusFilter,setStatusFilter]=useState("all");

const [stats,setStats]=useState({

total:0,

draft:0,

pending_payment:0,

paid:0,

active:0,

completed:0,

paused:0,

rejected:0,

});


const fetchCampaigns = async () => {

try{

setLoading(true);

const {data:auth}=await supabase.auth.getUser();

if(!auth.user){

setCampaigns([]);

return;

}

const { data, error } = await supabase
  .from("create_campaigns")
  .select(`
      *,
      countries (
          id,
          name,
          currency_code
      )
  `)
  .eq("creator_id", auth.user.id)
  .order("created_at", { ascending: false });

if(error) throw error;

setCampaigns(data || []);

}catch(err){

console.log(err);

}

finally{

setLoading(false);

}

};


const calculateStats=(items)=>{

setStats({

total:items.length,

draft:items.filter(i=>i.status==="draft").length,

pending_payment:items.filter(i=>i.status==="pending_payment").length,

paid:items.filter(i=>i.status==="paid").length,

active:items.filter(i=>i.status==="active").length,

completed:items.filter(i=>i.status==="completed").length,

paused:items.filter(i=>i.status==="paused").length,

rejected:items.filter(i=>i.status==="rejected").length,

});

};


useEffect(()=>{

fetchCampaigns();

},[]);


const onRefresh=useCallback(async()=>{

setRefreshing(true);

await fetchCampaigns();

setRefreshing(false);

},[]);


useEffect(()=>{

calculateStats(campaigns);

},[campaigns]);


const filteredCampaigns=useMemo(()=>{

let data=[...campaigns];

if(statusFilter!=="all"){

data=data.filter(

item=>item.status===statusFilter

);

}

if(search){

const keyword=search.toLowerCase();

data=data.filter(item=>

item.title?.toLowerCase().includes(keyword)

||

item.platform?.toLowerCase().includes(keyword)

);

}

return data;

},[campaigns,statusFilter,search]);


const badgeColor=(status)=>{

switch(status){

case "draft":

return "#888";

case "pending_payment":

return "#FFA500";

case "paid":

return "#FFD700";

case "active":

return "#22C55E";

case "completed":

return "#00BCD4";

case "paused":

return "#9C27B0";

case "rejected":

return "#EF4444";

default:

return "#666";

}

};

const platformIcon = (platform) => {
  switch ((platform || "").toLowerCase()) {
    case "tiktok":
      return "🎵";
    case "youtube":
      return "▶️";
    case "instagram":
      return "📸";
    case "facebook":
      return "📘";
    case "twitter":
    case "x":
      return "✖️";
    default:
      return "🌐";
  }
};

const verificationColor = (type) => {
  return type === "automatic"
    ? "#22C55E"
    : "#FFA500";
};


const renderItem = ({ item }) => {
  const budget =
    (item.reward || 0) *
    (item.max_participants || 0);

  const spent =
    (item.reward || 0) *
    (item.completed_creators || 0);

  const remaining =
    budget - spent;

  const progress =
    item.max_participants > 0
      ? (item.completed_creators || 0) /
        item.max_participants
      : 0;

  return (

<TouchableOpacity

style={styles.card}

activeOpacity={0.9}

onPress={()=>

navigation.navigate(

"CampaignDetails",

{

campaignId:item.id,

}

)

}

>

{/* Header */}

<View style={styles.cardHeader}>

<View>

<Text
style={styles.cardTitle}
numberOfLines={2}
>

{item.title}

</Text>

<View style={styles.platformRow}>

<Text style={styles.platform}>
{platformIcon(item.platform)} {item.platform?.toUpperCase()}
</Text>

<Text style={styles.country}>
🌍 {item.countries?.name}
</Text>

</View>

<View style={styles.goalBadge}>

<Text style={styles.goalText}>
{item.action_type}
</Text>

</View>

<View
style={[
styles.verifyBadge,
{
backgroundColor:
verificationColor(item.verification_type),
},
]}
>

<Text style={styles.verifyText}>

{item.verification_type === "automatic"
? "✔ Automatic Verification"
: "📝 Manual Verification"}

</Text>

</View>

</View>

<View

style={[

styles.statusBadge,

{

backgroundColor:

badgeColor(item.status),

},

]}

>

<Text style={styles.statusText}>

{item.status

.replace("_"," ")

.toUpperCase()}

</Text>

</View>

</View>

{/* Reward */}

<View style={styles.infoRow}>

<Text style={styles.infoLabel}>

Reward

</Text>

<Text style={styles.infoValue}>
₦{Number(item.reward || 0).toLocaleString()}
</Text>

</View>

{/* Budget */}

<View style={styles.infoRow}>

<Text style={styles.infoLabel}>

Budget

</Text>

<Text style={styles.infoValue}>

₦{Number(budget || 0).toLocaleString()}

</Text>

</View>

{/* Spent */}

<View style={styles.infoRow}>

<Text style={styles.infoLabel}>

Spent

</Text>

<Text style={styles.infoValueGreen}>

₦{Number(spent || 0).toLocaleString()}

</Text>

</View>

{/* Remaining */}

<View style={styles.infoRow}>

<Text style={styles.infoLabel}>

Remaining

</Text>

<Text style={styles.infoValue}>

₦{Number(remaining || 0).toLocaleString()}

</Text>

</View>

{/* Creators */}

<View style={styles.infoRow}>

<Text style={styles.infoLabel}>

Creators

</Text>

<Text style={styles.infoValue}>

{item.completed_creators || 0}

/

{item.max_participants || 0}

</Text>

</View>

{/* Progress */}

<View style={styles.progressContainer}>

<View

style={[

styles.progressBar,

{

width:

`${Math.min(progress * 100, 100)}%`

}

]}

/>

</View>

<Text style={styles.progressText}>

{Math.round(progress*100)}%

Completed

</Text>

{/* Created */}

<Text style={styles.date}>

Created • {new Date(item.created_at).toLocaleDateString()}

</Text>

<View style={styles.actionRow}>

<TouchableOpacity
style={styles.actionButton}
onPress={() =>
navigation.navigate(
"MyCampaignDetails",
{
campaignId:item.id,
}
)
}
>

<Ionicons
name="eye-outline"
size={18}
color="#FFD700"
/>

<Text style={styles.actionText}>
View
</Text>

</TouchableOpacity>


<TouchableOpacity
style={styles.actionButton}
onPress={() =>
navigation.navigate(
"EditCampaign",
{
campaignId:item.id,
}
)
}
>

<Ionicons
name="create-outline"
size={18}
color="#03A9F4"
/>

<Text style={styles.actionText}>
Edit
</Text>

</TouchableOpacity>


<TouchableOpacity
style={styles.actionButton}
onPress={() =>
navigation.navigate(
"DepositCampaign",
{
campaignId:item.id,
}
)
}
>

<Ionicons
name="wallet-outline"
size={18}
color="#22C55E"
/>

<Text style={styles.actionText}>
Deposit
</Text>

</TouchableOpacity>

</View>

</TouchableOpacity>

);

};


return (

<View style={styles.container}>

<Text style={styles.header}>
My Campaigns
</Text>


<Text style={styles.subtitle}>
Manage all your campaigns in one place
</Text>



{/* Statistics */}

<View style={styles.statsContainer}>


<View style={styles.statCard}>
<Text style={styles.statNumber}>
{stats.total}
</Text>

<Text style={styles.statLabel}>
Total
</Text>
</View>



<View style={styles.statCard}>
<Text style={styles.statNumber}>
{stats.active}
</Text>

<Text style={styles.statLabel}>
Active
</Text>
</View>



<View style={styles.statCard}>
<Text style={styles.statNumber}>
{stats.completed}
</Text>

<Text style={styles.statLabel}>
Completed
</Text>
</View>



<View style={styles.statCard}>
<Text style={styles.statNumber}>
{stats.draft}
</Text>

<Text style={styles.statLabel}>
Draft
</Text>
</View>


</View>


<View style={styles.searchBox}>

<Ionicons
name="search"
size={20}
color="#888"
/>


<TextInput

style={styles.searchInput}

placeholder="Search campaigns..."

placeholderTextColor="#777"

value={search}

onChangeText={setSearch}

/>


</View>


<FlatList

horizontal

showsHorizontalScrollIndicator={false}


data={[
"all",
"draft",
"pending_payment",
"paid",
"active",
"completed",
"paused",
"rejected"
]}


keyExtractor={(item)=>item}


renderItem={({item})=>(


<TouchableOpacity

style={[

styles.filterButton,

statusFilter===item && styles.filterButtonActive

]}


onPress={()=>setStatusFilter(item)}

>


<Text

style={[

styles.filterText,

statusFilter===item && styles.filterTextActive

]}

>

{item.replace("_"," ").toUpperCase()}


</Text>


</TouchableOpacity>


)}

/>


{
loading ?

<ActivityIndicator

size="large"

color="#FFD700"

/>


:

<FlatList


data={filteredCampaigns}


keyExtractor={(item)=>item.id}


renderItem={renderItem}


refreshControl={

<RefreshControl

refreshing={refreshing}

onRefresh={onRefresh}

tintColor="#FFD700"

/>

}


ListEmptyComponent={


<View style={styles.emptyContainer}>


<Ionicons

name="folder-open"

size={70}

color="#555"

/>


<Text style={styles.emptyTitle}>

No Campaigns

</Text>


<Text style={styles.emptySubtitle}>

Create your first campaign.

</Text>


</View>


}


/>

}

</View>

);

}


const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#121212",
padding:20,
},


header:{
color:"#FFD700",
fontSize:28,
fontWeight:"bold",
},


subtitle:{
color:"#999",
marginBottom:20,
},


statsContainer:{
flexDirection:"row",
justifyContent:"space-between",
},


statCard:{
backgroundColor:"#1E1E1E",
padding:15,
borderRadius:12,
width:"23%",
alignItems:"center",
},


statNumber:{
color:"#FFD700",
fontSize:22,
fontWeight:"bold",
},


statLabel:{
color:"#aaa",
fontSize:12,
marginTop:5,
},


searchBox:{
backgroundColor:"#1E1E1E",
marginTop:20,
padding:12,
borderRadius:10,
flexDirection:"row",
alignItems:"center",
},


searchInput:{
flex:1,
color:"#fff",
marginLeft:10,
},


filterButton:{
backgroundColor:"#222",
paddingHorizontal:15,
paddingVertical:10,
borderRadius:20,
marginVertical:15,
marginRight:10,
},


filterButtonActive:{
backgroundColor:"#FFD700",
},


filterText:{
color:"#aaa",
},


filterTextActive:{
color:"#000",
fontWeight:"bold",
},


card:{
backgroundColor:"#1E1E1E",
padding:18,
borderRadius:12,
marginBottom:15,
},

cardHeader:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginBottom:18,
},

cardTitle:{
fontSize:20,
fontWeight:"700",
color:"#fff",
maxWidth:"75%",
},

statusBadge:{
paddingHorizontal:12,
paddingVertical:6,
borderRadius:20,
},

statusText:{
color:"#000",
fontWeight:"700",
fontSize:11,
},

platform:{
color:"#00BCD4",
marginTop:10,
},


reward:{
color:"#FFD700",
marginTop:5,
},


participants:{
color:"#fff",
marginTop:5,
},

infoRow:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:10,
},

infoLabel:{
color:"#999",
fontSize:14,
},

infoValue:{
color:"#fff",
fontWeight:"700",
},

infoValueGreen:{
color:"#22C55E",
fontWeight:"700",
},

date:{
color:"#777",
marginTop:8,
},


emptyContainer:{
alignItems:"center",
marginTop:80,
},


emptyTitle:{
color:"#fff",
fontSize:22,
marginTop:20,
},


emptySubtitle:{
color:"#777",
marginTop:10,
},

progressContainer:{
marginTop:18,
height:10,
backgroundColor:"#2A2A2A",
borderRadius:20,
overflow:"hidden",
},

progressBar:{
height:10,
backgroundColor:"#22C55E",
borderRadius:20,
},

progressText:{
color:"#AAA",
marginTop:8,
fontSize:13,
},

actionRow:{
marginTop:20,
flexDirection:"row",
justifyContent:"space-between",
borderTopWidth:1,
borderTopColor:"#2D2D2D",
paddingTop:15,
},

actionButton:{
alignItems:"center",
flex:1,
},

actionText:{
color:"#DDD",
fontSize:12,
marginTop:4,
},

platformRow:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginTop:8,
},

country:{
color:"#AAA",
fontSize:12,
},

goalBadge:{
alignSelf:"flex-start",
backgroundColor:"#202A44",
paddingHorizontal:12,
paddingVertical:6,
borderRadius:20,
marginTop:12,
},

goalText:{
color:"#7DD3FC",
fontWeight:"700",
fontSize:12,
},

verifyBadge:{
alignSelf:"flex-start",
paddingHorizontal:12,
paddingVertical:6,
borderRadius:20,
marginTop:10,
},

verifyText:{
color:"#000",
fontWeight:"700",
fontSize:12,
},

});
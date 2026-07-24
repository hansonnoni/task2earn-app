// screens/CreateCampaignScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../supabase";
import { useNavigation } from "@react-navigation/native";

const platforms = [
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
  },
  {
    id: "twitter",
    name: "X",
    icon: "✖️",
  },
];

const showMessage = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function CreateCampaignScreen() {
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [platform, setPlatform] = useState("tiktok");

  const [actionType, setActionType] = useState("Watch Video");

  const [campaignUrl, setCampaignUrl] = useState("");

  const [reward, setReward] = useState("");

  const [participants, setParticipants] = useState("");

  const [timeLimit, setTimeLimit] = useState("");

  const [countryId, setCountryId] = useState("");

  const [countries, setCountries] = useState([]);

  const [campaignId, setCampaignId] = useState(null);

  const [currencySymbol, setCurrencySymbol] = useState("");

  const navigation = useNavigation();

  useEffect(() => {
  const loadCurrency = async () => {
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) return;

    const { data } = await supabase
      .from("users")
      .select("currency_symbol")
      .eq("id", auth.user.id)
      .single();

    if (data?.currency_symbol) {
      setCurrencySymbol(data.currency_symbol);
    }
  };

  loadCurrency();
}, []);

useEffect(() => {
  loadCountries();
}, []);

const loadCountries = async () => {
  const { data, error } = await supabase
    .from("countries")
    .select("id,name")
    .order("name");

  if (!error) {
    setCountries(data);
  }
};

  // Live Campaign Budget
const totalBudget =
  (Number(reward) || 0) *
  (Number(participants) || 0);

  const selectedCountry =
  countries.find(
    (country) => country.id === countryId
  )?.name || "Not Selected";

  const [verification, setVerification] =
    useState("manual");

    const saveDraft = async () => {
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    showMessage("Login Required");
    return null;
  }

  const totalBudget =
    (Number(reward) || 0) *
    (Number(participants) || 0);

  const campaignData = {
    creator_id: auth.user.id,

    title,

    description,

    platform,

    country_id: countryId,

    action_type: actionType,

    campaign_url: campaignUrl,

    reward: Number(reward),

    max_participants: Number(participants),

    time_limit: Number(timeLimit),

    verification_type: verification,

    total_budget: totalBudget,

    status: "draft",

    payment_status: "unpaid",
  };

  // Update existing draft
  if (campaignId) {
    const { error } = await supabase
      .from("create_campaigns")
      .update(campaignData)
      .eq("id", campaignId);

    if (error) throw error;

    showMessage("Saved", "Draft updated.");

    return campaignId;
  }

  // Create new draft
  const { data, error } = await supabase
    .from("create_campaigns")
    .insert(campaignData)
    .select()
    .single();

  if (error) throw error;

  setCampaignId(data.id);

  showMessage("Saved", "Draft saved.");

  return data.id;
};


  const handleCreateCampaign = async () => {
  try {
    setLoading(true);

    const id = await saveDraft();

    if (!id) return;

    // change draft into awaiting payment

    await supabase
      .from("create_campaigns")
      .update({
        status: "pending_payment",
      })
      .eq("id", id);

    navigation.navigate("CampaignPayment", {
      campaignId: id,
    });

  } catch (err) {

    showMessage("Error", err.message);

  } finally {

    setLoading(false);

  }
};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 50,
      }}
    >
      <Text style={styles.header}>
        Create Campaign
      </Text>

      <Text style={styles.subtitle}>
        Launch a campaign for creators to
        participate and earn rewards.
      </Text>

      <Text style={styles.label}>
        Campaign Name
      </Text>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Example: Promote my new TikTok video"
        placeholderTextColor="#777"
      />

      <Text style={styles.label}>
        Description
      </Text>

      <TextInput
        style={[
          styles.input,
          { height: 120 },
        ]}
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="Explain what creators should do..."
        placeholderTextColor="#777"
      />

      <Text style={styles.label}>
Choose Platform
</Text>

<View style={styles.cardContainer}>
  {platforms.map((item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.optionCard,
        platform === item.id &&
          styles.selectedCard,
      ]}
      onPress={() =>
        setPlatform(item.id)
      }
    >
      <Text style={styles.icon}>
        {item.icon}
      </Text>

      <Text style={styles.cardText}>
        {item.name}
      </Text>
    </TouchableOpacity>
  ))}
</View>

<Text style={styles.label}>
Country
</Text>

<View style={styles.picker}>
    <Picker
        selectedValue={countryId}
        onValueChange={setCountryId}
        dropdownIconColor="#FFD700"
        style={{ color: "#161515" }}
    >
        <Picker.Item
            label="Select Country"
            value=""
        />

        {countries.map((country) => (
            <Picker.Item
                key={country.id}
                label={country.name}
                value={country.id}
            />
        ))}
    </Picker>
</View>

      <Text style={styles.label}>
        Campaign Goal
      </Text>

      <View style={styles.picker}>
        <Picker
          selectedValue={actionType}
          onValueChange={setActionType}
          dropdownIconColor="#FFD700"
          style={{ color: "#161515" }}
        >
          <Picker.Item
            label="Watch Video"
            value="Watch Video"
          />
          <Picker.Item
            label="Like Post"
            value="Like"
          />
          <Picker.Item
            label="Comment"
            value="Comment"
          />
          <Picker.Item
            label="Share"
            value="Share"
          />
          <Picker.Item
            label="Follow Account"
            value="Follow"
          />
        </Picker>
      </View>

      <Text style={styles.label}>
        Campaign Link
      </Text>

      <TextInput
        style={styles.input}
        value={campaignUrl}
        onChangeText={setCampaignUrl}
        placeholder="https://..."
        placeholderTextColor="#777"
      />

      <Text style={styles.label}>
        Reward Per Creator
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={reward}
        onChangeText={setReward}
      />

      <Text style={styles.label}>
        Number of Creators
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={participants}
        onChangeText={setParticipants}
      />

      <View style={styles.budgetCard}>

    <Text style={styles.budgetTitle}>
        Campaign Budget
    </Text>

    <Text style={styles.budgetAmount}>
    {currencySymbol}{totalBudget.toLocaleString()}
</Text>

    <Text style={styles.budgetInfo}>
        {reward || 0} × {participants || 0} creators
    </Text>

</View>

      <Text style={styles.label}>
        Time Limit (seconds)
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={timeLimit}
        onChangeText={setTimeLimit}
      />

      <Text style={styles.label}>
        Verification
      </Text>

      <View style={styles.picker}>
        <Picker
          selectedValue={verification}
          onValueChange={setVerification}
          dropdownIconColor="#FFD700"
          style={{ color: "#161515" }}
        >
          <Picker.Item
            label="Manual"
            value="manual"
          />

          <Picker.Item
            label="Automatic"
            value="automatic"
          />
        </Picker>
      </View>

      {/* Campaign Preview */}

<View style={styles.previewCard}>

    <Text style={styles.previewTitle}>
        Campaign Preview
    </Text>

    <Text style={styles.previewPlatform}>
        {platform.toUpperCase()}
    </Text>

    <View style={styles.previewRow}>
    <Text style={styles.previewLabel}>
        Country
    </Text>

    <Text style={styles.previewValue}>
        {selectedCountry}
    </Text>
</View>

    <Text style={styles.previewName}>
        {title || "Campaign Title"}
    </Text>

    <Text style={styles.previewDescription}>
        {description || "Your campaign description will appear here."}
    </Text>

    <View style={styles.previewRow}>
        <Text style={styles.previewLabel}>
            Campaign Goal
        </Text>

        <Text style={styles.previewValue}>
            {actionType}
        </Text>
    </View>

    <View style={styles.previewRow}>
        <Text style={styles.previewLabel}>
            Reward
        </Text>

        <Text style={styles.previewValue}>
            ₦{reward || 0}
        </Text>
    </View>

    <View style={styles.previewRow}>
        <Text style={styles.previewLabel}>
            Creators Needed
        </Text>

        <Text style={styles.previewValue}>
            {participants || 0}
        </Text>
    </View>

    <View style={styles.previewRow}>
        <Text style={styles.previewLabel}>
            Time Limit
        </Text>

        <Text style={styles.previewValue}>
            {timeLimit} sec
        </Text>
    </View>

    <View style={styles.previewRow}>
        <Text style={styles.previewLabel}>
            Verification
        </Text>

        <Text style={styles.previewValue}>
            {verification}
        </Text>
    </View>

</View>

<TouchableOpacity
    style={styles.draftButton}
    onPress={saveDraft}
>
    <Text style={styles.draftButtonText}>
        Save Draft
    </Text>
</TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateCampaign}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Creating..."
            : "Create Campaign"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },

  header: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },

  subtitle: {
    color: "#ccc",
    marginBottom: 25,
  },

  label: {
    color: "#FFD700",
    marginBottom: 6,
    marginTop: 15,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
  },

  picker: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
  },

  button: {
    backgroundColor: "#FFD700",
    marginTop: 35,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "bold",
    color: "#000",
    fontSize: 17,
  },

  cardContainer:{
    flexDirection:"row",
    flexWrap:"wrap",
    justifyContent:"space-between",
    marginTop:10
},

optionCard:{
    width:"48%",
    backgroundColor:"#1e1e1e",
    padding:18,
    borderRadius:12,
    alignItems:"center",
    marginBottom:12,
    borderWidth:1,
    borderColor:"#333"
},

selectedCard:{
    borderColor:"#FFD700",
    backgroundColor:"#2A2500"
},

icon:{
    fontSize:30
},

cardText:{
    color:"#fff",
    marginTop:10,
    fontWeight:"600"
},

budgetCard: {
    backgroundColor: "#18221A",
    marginTop: 20,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E7D32",
},

budgetTitle: {
    color: "#BBBBBB",
    fontSize: 14,
},

budgetAmount: {
    color: "#22C55E",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 5,
},

budgetInfo: {
    color: "#AAAAAA",
    marginTop: 6,
    fontSize: 14,
},

previewCard:{
    marginTop:30,
    backgroundColor:"#1E1E1E",
    borderRadius:15,
    padding:20,
    borderWidth:1,
    borderColor:"#333"
},

previewTitle:{
    color:"#FFD700",
    fontSize:20,
    fontWeight:"bold",
    marginBottom:15
},

previewPlatform:{
    color:"#00BCD4",
    fontWeight:"bold",
    fontSize:16
},

previewName:{
    color:"#fff",
    fontSize:22,
    fontWeight:"700",
    marginTop:8
},

previewDescription:{
    color:"#ccc",
    marginTop:10,
    lineHeight:22
},

previewRow:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginTop:14,
    borderTopWidth:1,
    borderTopColor:"#2E2E2E",
    paddingTop:10
},

previewLabel:{
    color:"#999",
    fontSize:15
},

previewValue:{
    color:"#fff",
    fontWeight:"600",
    fontSize:15
},

draftButton: {
    marginTop: 25,
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
},

draftButtonText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 16,
},
});